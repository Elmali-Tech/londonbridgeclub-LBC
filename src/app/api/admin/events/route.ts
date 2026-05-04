import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  event_date: string;
  event_time: string;
  category: string;
  image_key: string | null;
  is_active: boolean;
  created_at: string;
}

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const supabase = createClient();
    let query = supabase.from('events').select('*');

    if (id) {
      query = query.eq('id', id);
    }

    const { data: events, error } = await query.order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
    }

    if (id && (!events || events.length === 0)) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, events: events as Event[] });
  } catch (error) {
    console.error('Internal server error fetching events:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session || (session.role !== 'admin' && !session.is_admin)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const event_date = formData.get('event_date') as string;
    const event_time = formData.get('event_time') as string;
    const category = formData.get('category') as string;
    const imageFile = formData.get('image') as File | null;

    if (!title || !event_date) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    let image_key: string | null = null;
    if (imageFile && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json({ success: false, error: 'Invalid image type' }, { status: 400 });
      }
      const ext = imageFile.name.split('.').pop();
      const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadParams = {
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt',
        Key: fileName,
        Body: Buffer.from(await imageFile.arrayBuffer()),
        ContentType: imageFile.type,
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      image_key = fileName;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          title,
          description,
          location,
          event_date,
          event_time,
          category,
          image_key,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }

    // Send email notification
    const { sendSystemNotification } = await import('@/lib/nodemailer');
    await sendSystemNotification("New Event Created", `
      A new event has been added to the portal:
      - Title: ${title}
      - Date: ${event_date}
      - Time: ${event_time || 'N/A'}
      - Location: ${location}
      - Category: ${category}
    `);

    return NextResponse.json({ success: true, event: data[0] });
  } catch (error) {
    console.error('Internal server error creating event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 