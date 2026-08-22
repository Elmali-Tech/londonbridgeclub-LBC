import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

const VALID_ROLES: UserRole[] = ["admin", "opportunity_manager", "sales_member", "viewer"];

type Params = { params: Promise<{ id: string }> };

// PATCH - Admin changes a user's role and/or can_publish capability
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { role, can_publish } = await request.json();

  const updates: Record<string, unknown> = {};
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = role;
  }
  if (can_publish !== undefined) {
    updates.can_publish = !!can_publish;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const { error } = await supabase.from("users").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE - Admin removes a user
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { id } = await params;
  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
