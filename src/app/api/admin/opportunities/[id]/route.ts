import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateSession } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Opportunity ID is required" },
        { status: 400 },
      );
    }

    // Parse form data
    const formData = await request.formData();
    const title = formData.get("title") as string | null;
    const company = formData.get("company") as string | null;
    const service_detail = formData.get("service_detail") as string | null;
    const category = formData.get("category") as string | null;
    const estimated_budget = formData.get("estimated_budget") as string | null;
    const description = formData.get("description") as string | null;
    const is_active_str = formData.get("is_active") as string | null;
    const is_active = is_active_str === "true";
    const imageFile = formData.get("image") as File | null;

    if (
      !title ||
      !company ||
      !service_detail ||
      !category ||
      !estimated_budget
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    let image_key: string | undefined;
    if (imageFile && imageFile.size > 0) {
      // Only allow image types
      if (!imageFile.type.startsWith("image/")) {
        return NextResponse.json(
          { success: false, error: "Invalid image type" },
          { status: 400 },
        );
      }
      // Generate unique file name
      const ext = imageFile.name.split(".").pop();
      const fileName = `opportunities/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const uploadParams = {
        Bucket:
          process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "londonbridgeprojt",
        Key: fileName,
        Body: Buffer.from(await imageFile.arrayBuffer()),
        ContentType: imageFile.type,
      };
      await s3Client.send(new PutObjectCommand(uploadParams));
      image_key = fileName;
    }

    const supabase = createClient();

    const updateData: any = {
      title,
      company,
      service_detail,
      category,
      estimated_budget,
      description,
      is_active,
    };

    if (image_key) {
      updateData.image_key = image_key;
    }

    const { data, error } = await supabase
      .from("opportunities")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to update opportunity" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, opportunity: data[0] });
  } catch (error) {
    console.error("Error updating opportunity:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await validateSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Opportunity ID is required" },
        { status: 400 },
      );
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("opportunities")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to delete opportunity" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
