import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { validateSession } from '@/lib/auth';
import { deleteFileFromSupabaseStorage } from '@/lib/storageUploadUtils';
import { eventNotificationDetails, EventFormPayload, EventRecord, parseEventFormData, uploadEventImage } from '../eventUtils';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await validateSession(request);
    if (!session || (session.role !== 'admin' && !session.is_admin)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });
    }

    const formData = await request.formData();

    const parsedForm = parseEventFormData(formData);
    if (!parsedForm.ok) {
      return NextResponse.json(
        { success: false, error: parsedForm.error },
        { status: parsedForm.status }
      );
    }

    const supabase = createClient();
    const { data: existingEvent, error: lookupError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (lookupError) {
      console.error('Error finding event:', lookupError);
      return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }

    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const imageUpload = await uploadEventImage(formData);
    if (!imageUpload.ok) {
      return NextResponse.json(
        { success: false, error: imageUpload.error },
        { status: imageUpload.status }
      );
    }

    const updates: EventFormPayload & { image_key?: string | null } = {
      ...parsedForm.value,
    };

    if (imageUpload.value.imageKey) {
      updates.image_key = imageUpload.value.imageKey;
    }

    const { data: event, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }

    if (!event) {
      return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }

    if (imageUpload.value.imageKey && existingEvent.image_key && existingEvent.image_key !== imageUpload.value.imageKey) {
      await deleteFileFromSupabaseStorage(existingEvent.image_key);
    }

    try {
      const { sendSystemNotification } = await import('@/lib/nodemailer');
      await sendSystemNotification(
        'Event Updated',
        `An event has been modified:\n- ID: ${eventId}\n${eventNotificationDetails(event as EventRecord)}`
      );
    } catch (notifyError) {
      console.error('Event update notification error:', notifyError);
    }

    return NextResponse.json({ success: true, event });
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
    const session = await validateSession(request);
    if (!session || (session.role !== 'admin' && !session.is_admin)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: existingEvent, error: lookupError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (lookupError) {
      console.error('Error finding event:', lookupError);
      return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
    }

    if (!existingEvent) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
    }

    if (existingEvent.image_key) {
      await deleteFileFromSupabaseStorage(existingEvent.image_key);
    }

    try {
      const { sendSystemNotification } = await import('@/lib/nodemailer');
      await sendSystemNotification(
        'Event Deleted',
        `An event has been removed from the calendar:\n- Event ID: ${eventId}\n- Deleted By: Admin (${session.id})\n${eventNotificationDetails(existingEvent as EventRecord)}`
      );
    } catch (notifyError) {
      console.error('Event delete notification error:', notifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal server error deleting event:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
