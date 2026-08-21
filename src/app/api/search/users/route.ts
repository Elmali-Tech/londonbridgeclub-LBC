import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/lbc-data';
import { validateToken } from '@/lib/auth';
import { LbcMember } from '@/lib/lbc-api';
import { getLbcMembers } from '@/lib/lbc-auth';
import { mapLbcMemberToDashboardMember } from '@/lib/lbc-members';

function stringifyLbcInterests(interests: LbcMember['interests']) {
  if (Array.isArray(interests)) return interests.join(' ');
  return interests || '';
}

function lbcMemberSearchText(member: LbcMember) {
  return [
    member.name,
    member.representative_name,
    member.email,
    member.member_id,
    member.title,
    member.about,
    member.sector,
    member.category,
    member.type,
    stringifyLbcInterests(member.interests),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('tr-TR');
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateToken(token);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, users: [] });
    }

    const searchTerm = query.trim().toLocaleLowerCase('tr-TR');

    if (user.auth_provider === 'lbc') {
      const members = await getLbcMembers();
      const currentLbcRecordId = user.lbc_record_id || null;
      const searchResults = members
        .filter((member) => member.id !== currentLbcRecordId)
        .filter((member) => lbcMemberSearchText(member).includes(searchTerm))
        .slice(0, 10)
        .map((member) => {
          const dashboardMember = mapLbcMemberToDashboardMember(member);

          return {
            id: dashboardMember.id,
            full_name: dashboardMember.full_name,
            headline: dashboardMember.headline,
            username: member.member_id || undefined,
            location: dashboardMember.location,
            industry: dashboardMember.industry,
            profile_image_key: dashboardMember.profile_image_key,
            matchedTags: dashboardMember.tags?.interests || [],
            matchType: 'lbc',
          };
        });

      return NextResponse.json({
        success: true,
        users: searchResults,
        total: searchResults.length,
      });
    }

    const lbcData = createClient();

    // Search in users table (name, headline, username, location, industry)
    const { data: users, error: usersError } = await lbcData
      .from('users')
      .select('id, full_name, headline, username, location, industry, profile_image_key')
      .neq('id', user.id) // Exclude current user
      .or(`full_name.ilike.%${searchTerm}%,headline.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%,industry.ilike.%${searchTerm}%`);

    if (usersError) {
      console.error('Error searching users:', usersError);
      return NextResponse.json({ success: false, error: 'Error searching users' }, { status: 500 });
    }

    // Search in user_tags table
    const { data: tagMatches, error: tagsError } = await lbcData
      .from('user_tags')
      .select(`
        user_id,
        tag_type,
        tag_value,
        users!inner(id, full_name, headline, username, location, industry, profile_image_key)
      `)
      .ilike('tag_value', `%${searchTerm}%`);

    if (tagsError) {
      console.error('Error searching tags:', tagsError);
      return NextResponse.json({ success: false, error: 'Error searching tags' }, { status: 500 });
    }

    // Combine results
    const userMap = new Map();
    
    // Add direct user matches
    (users || []).forEach(user => {
      userMap.set(user.id, {
        ...user,
        matchedTags: [],
        matchType: 'user'
      });
    });

    // Add tag matches
    (tagMatches || []).forEach(tagMatch => {
      const userId = tagMatch.user_id;
      const userData = tagMatch.users;
      
      if (userId !== user.id) { // Exclude current user
        if (userMap.has(userId)) {
          // User already exists, add tag to matched tags
          const existingUser = userMap.get(userId);
          existingUser.matchedTags.push(tagMatch.tag_value);
          existingUser.matchType = 'both';
        } else {
          // New user from tag match
          userMap.set(userId, {
            ...userData,
            matchedTags: [tagMatch.tag_value],
            matchType: 'tag'
          });
        }
      }
    });

    // Convert to array and limit results
    const searchResults = Array.from(userMap.values())
      .slice(0, 10) // Limit to 10 results for dropdown
      .map(result => ({
        id: result.id,
        full_name: result.full_name,
        headline: result.headline,
        username: result.username,
        location: result.location,
        industry: result.industry,
        profile_image_key: result.profile_image_key,
        matchedTags: result.matchedTags || [],
        matchType: result.matchType
      }));

    return NextResponse.json({ 
      success: true, 
      users: searchResults,
      total: userMap.size
    });

  } catch (error) {
    console.error('Error in search users:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
