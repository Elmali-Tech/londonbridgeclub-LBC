import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/permissions';
import { uploadBufferToSupabaseStorage } from '@/lib/storageUploadUtils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const session = auth.user;

    const { id } = await params;
    const formData = await request.formData();
    
    const updates: any = {
      title: formData.get('title'),
      description: formData.get('description'),
      location: formData.get('location'),
      event_date: formData.get('event_date'),
      event_time: formData.get('event_time'),
      category: formData.get('category'),
      is_active: formData.get('is_active') === 'true',
      updated_at: new Date().toISOString(),
    };

    const imageFile = formData.get('image') as File | null;
    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop();
      const fileName = `events/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadResult = await uploadBufferToSupabaseStorage(
        fileName,
        Buffer.from(await imageFile.arrayBuffer()),
        imageFile.type
      );
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Supabase Storage upload failed');
      }
      updates.image_key = fileName;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }

    // Send email notification
    try {
      const { sendSystemNotification } = await import('@/lib/nodemailer');
      await sendSystemNotification("Event Updated", `
        An event has been modified:
        - ID: ${id}
        - Title: ${data[0].title}
        - New Date: ${data[0].event_date}
        - New Location: ${data[0].location}
      `);
    } catch (notifyError) {
      console.error("Notification Error:", notifyError);
    }

    return NextResponse.json({ success: true, event: data[0] });
  } catch (error) {
    console.error('Internal server error updating event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;
    const session = auth.user;

    const { id } = await params;
    const supabase = createClient();
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
    }

    // Send email notification
    try {
      const { sendSystemNotification } = await import('@/lib/nodemailer');
      await sendSystemNotification("Event Deleted", `
        An event has been removed from the calendar:
        - Event ID: ${id}
        - Deleted By: Admin (${session.id})
      `);
    } catch (notifyError) {
      console.error("Notification Error:", notifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal server error deleting event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
