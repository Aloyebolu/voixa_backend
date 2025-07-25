import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { connectDB, disconnectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";
import { supabase } from "@/app/lib/supabase";


// CORS preflight handler
export async function OPTIONS() {
  const response = NextResponse.json(
    { message: "CORS preflight" },
    { status: 200 }
  );
  return setCorsHeaders(response);
}

export async function POST(request: NextRequest) {
  let dbConnected = false;
  try {
    await connectDB();
    dbConnected = true;

    const formData = await request.formData();
    const file = formData.get("image");

    // Validate user
    const { userId } = getUserIdFromRequest(request);
    if (!userId) {
      return setCorsHeaders(
        NextResponse.json({ message: "Invalid Auth Token" }, { status: 401 })
      );
    }

    // Verify user exists in database
    const userCheck = await query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userCheck.length === 0) {
      return setCorsHeaders(
        NextResponse.json({ message: "User not found" }, { status: 404 })
      );
    }

    // Validate file
    if (!(file instanceof File) || file.size === 0) {
      return setCorsHeaders(
        NextResponse.json(
          { message: "No file uploaded or invalid file" },
          { status: 400 }
        )
      );
    }

    // Validate file type and size (e.g., 5MB limit)
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return setCorsHeaders(
        NextResponse.json(
          { message: "Only JPEG, PNG, and WebP images are allowed" },
          { status: 400 }
        )
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return setCorsHeaders(
        NextResponse.json(
          { message: "File size must be less than 5MB" },
          { status: 400 }
        )
      );
    }

    // Generate safe filename
    const fileExt = path.extname(file.name);
    const safeFilename = `${userId}-${Date.now()}${fileExt}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload file to Supabase storage bucket 'user-images'
    const {  error: uploadError } = await supabase.storage
      .from("user-images")
      .upload(safeFilename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return setCorsHeaders(
        NextResponse.json(
          { message: "Failed to upload image to storage" },
          { status: 500 }
        )
      );
    }

    // Construct public URL for the uploaded file
    const relativePath = `/storage/v1/object/public/user-images/${safeFilename}`;

    // Start DB transaction
    await query("BEGIN");

    // Deactivate previous images
    await query("UPDATE user_images SET is_active = false WHERE user_id = $1", [
      userId,
    ]);

    // Insert new image record
    await query(
      `INSERT INTO user_images(user_id, image_path, is_active)
       VALUES($1, $2, $3)`,
      [userId, relativePath, true]
    );

    // Cleanup old images (keep only latest 5)
    const oldImages = await query(
      `SELECT image_path FROM user_images
       WHERE user_id = $1
       ORDER BY created_at DESC
       OFFSET 5`,
      [userId]
    );

    for (const img of oldImages) {
      try {
        // Extract filename from URL
        const fileName = img.image_path.split("/").pop();
        if (fileName) {
          // Delete from Supabase storage
          await supabase.storage.from("user-images").remove([fileName]);
        }

        // Delete record from DB
        await query("DELETE FROM user_images WHERE image_path = $1", [
          img.image_path,
        ]);
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }

    await query("COMMIT");

    return setCorsHeaders(
      NextResponse.json({
        message: "File uploaded successfully",
        path: relativePath,
      })
    );
  } catch (error) {
    if (dbConnected) {
      await query("ROLLBACK");
    }
    console.error("Upload Error:", error);
    return setCorsHeaders(
      NextResponse.json({ message: "Server error during upload" }, { status: 500 })
    );
  } finally {
    if (dbConnected) {
      await disconnectDB();
    }
  }
}
