import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { User } from '@/types/database';
import { callLbcEndpoint, LbcEndpoint } from '@/lib/lbc-api';
import {
  ensureLbcUserBridge,
  findLbcMemberByEmail,
  getLbcMemberById,
  mapLbcMemberToAuthUser,
} from '@/lib/lbc-auth';

function hasOwnField<T extends object>(object: T, field: string) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

function buildLbcProfilePayload(updateData: Partial<User>) {
  const payload: Record<string, unknown> = {};

  if (hasOwnField(updateData, 'email')) payload.email = updateData.email;
  if (hasOwnField(updateData, 'full_name')) {
    payload.name = updateData.full_name;
    payload.full_name = updateData.full_name;
    payload.representative_name = updateData.full_name;
  }
  if (hasOwnField(updateData, 'username')) payload.member_id = updateData.username;
  if (hasOwnField(updateData, 'headline')) payload.title = updateData.headline;
  if (hasOwnField(updateData, 'bio')) payload.about = updateData.bio;
  if (hasOwnField(updateData, 'location')) payload.location = updateData.location;
  if (hasOwnField(updateData, 'industry')) {
    payload.sector = updateData.industry;
    payload.category = updateData.industry;
  }
  if (hasOwnField(updateData, 'linkedin_url')) payload.linkedin_url = updateData.linkedin_url;
  if (hasOwnField(updateData, 'website_url')) payload.website_url = updateData.website_url;
  if (hasOwnField(updateData, 'date_of_birth')) payload.date_of_birth = updateData.date_of_birth;
  if (hasOwnField(updateData, 'profile_image_key')) {
    payload.profile_image_key = updateData.profile_image_key || null;
  }
  if (hasOwnField(updateData, 'banner_image_key')) {
    payload.banner_image_key = updateData.banner_image_key || null;
  }

  return payload;
}

function responseStatusFromLbc(status?: number) {
  return status && status >= 400 && status <= 599 ? status : 502;
}

export async function PUT(request: NextRequest) {
  try {
    // Validate the session
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const formData = await request.formData();
    
    // Extract profile data
    const updateData: Partial<User> = {};

    const emailValue = formData.get('email');
    if (emailValue !== null && emailValue !== undefined && typeof emailValue === 'string') {
      const nextEmail = emailValue.trim().toLowerCase();

      if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json(
          { success: false, error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }

      if (nextEmail !== session.email.toLowerCase()) {
        const existingMember = await findLbcMemberByEmail(nextEmail);
        if (existingMember && existingMember.id !== session.lbc_record_id) {
          return NextResponse.json(
            { success: false, error: 'This email address is already in use' },
            { status: 409 }
          );
        }
      }

      updateData.email = nextEmail;
    }
    
    // Basic text fields
    const textFields = ['username', 'full_name', 'headline', 'bio', 'location', 'industry', 'linkedin_url', 'website_url', 'date_of_birth'] as const;
    textFields.forEach(field => {
      const value = formData.get(field);
      if (value !== null && value !== undefined && typeof value === 'string') {
        updateData[field] = value.trim();
      }
    });

    // Update profile_image_key and banner_image_key if provided
    const profile_image_key = formData.get('profile_image_key');
    if (profile_image_key !== null && profile_image_key !== undefined && typeof profile_image_key === 'string') {
      updateData.profile_image_key = profile_image_key;
    }

    const banner_image_key = formData.get('banner_image_key');
    if (banner_image_key !== null && banner_image_key !== undefined && typeof banner_image_key === 'string') {
      updateData.banner_image_key = banner_image_key;
    }

    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    const memberId = session.lbc_record_id || session.lbc_member_id;

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'LBC member id is missing from the session' },
        { status: 400 }
      );
    }

    const result = await callLbcEndpoint(
      `/members/${encodeURIComponent(memberId)}` as LbcEndpoint,
      {
        logicalMethod: 'PATCH',
        payload: buildLbcProfilePayload(updateData),
      },
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update LBC profile',
          code: result.bodyError?.code,
          details: result.bodyError?.details,
        },
        { status: responseStatusFromLbc(result.bodyError?.status || result.status) }
      );
    }

    const latestMember = await getLbcMemberById(memberId);
    const updatedUser = latestMember
      ? await ensureLbcUserBridge(latestMember)
      : ({ ...session, ...updateData } as User);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Unexpected error in profile update:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
