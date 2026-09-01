import { NextResponse } from "next/server";
import { SAFE_USER_SELECT, validateSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = new Set([
  "full_name",
  "username",
  "headline",
  "bio",
  "location",
  "industry",
  "linkedin_url",
  "website_url",
  "date_of_birth",
  "profile_image_key",
  "banner_image_key",
]);

export async function GET(request: Request) {
  const user = await validateSession(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: Request) {
  try {
    const user = await validateSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!EDITABLE_FIELDS.has(key)) continue;
      if (value !== null && typeof value !== "string") {
        return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
      }
      if (typeof value === "string" && value.length > 10_000) {
        return NextResponse.json({ error: `${key} is too long` }, { status: 400 });
      }
      updates[key] = value as string | null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No profile changes provided" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select(SAFE_USER_SELECT)
      .single();

    if (error) throw error;
    return NextResponse.json(
      { user: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("PATCH /api/profile/me failed", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
