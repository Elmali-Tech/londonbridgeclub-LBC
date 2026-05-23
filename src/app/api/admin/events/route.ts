import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { eventNotificationDetails, EventRecord, parseEventFormData, uploadEventImage } from './eventUtils';

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

    return NextResponse.json({ success: true, events: events as EventRecord[] });
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

    const parsedForm = parseEventFormData(formData);
    if (!parsedForm.ok) {
      return NextResponse.json(
        { success: false, error: parsedForm.error },
        { status: parsedForm.status }
      );
    }

    const imageUpload = await uploadEventImage(formData);
    if (!imageUpload.ok) {
      return NextResponse.json(
        { success: false, error: imageUpload.error },
        { status: imageUpload.status }
      );
    }

    const supabase = createClient();
    const { data: event, error } = await supabase
      .from('events')
      .insert([
        {
          ...parsedForm.value,
          image_key: imageUpload.value.imageKey,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }

    try {
      const { sendSystemNotification } = await import('@/lib/nodemailer');
      await sendSystemNotification(
        'New Event Created',
        `A new event has been added to the portal:\n${eventNotificationDetails(event as EventRecord)}`
      );
    } catch (notifyError) {
      console.error('Event creation notification error:', notifyError);
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Internal server error creating event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 
