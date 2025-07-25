import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { connectDB, disconnectDB, query } from "@/app/lib/db";
import { getUserIdFromRequest, setCorsHeaders } from "@/app/lib/utils";

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
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
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
    const uploadsDir = path.join(process.cwd(), "public/uploads/user-images");
    
    await fs.mkdir(uploadsDir, { recursive: true });

    // Process file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadsDir, safeFilename);
    await fs.writeFile(filePath, buffer);

    const relativePath = `/uploads/user-images/${safeFilename}`;

    // Transaction
    await query("BEGIN");

    // Deactivate previous images
    await query(
      "UPDATE user_images SET is_active = false WHERE user_id = $1", 
      [userId]
    );

    // Insert new image
    await query(
      `INSERT INTO user_images(user_id, image_path, is_active)
       VALUES($1, $2, $3)`,
      [userId, relativePath, true]
    );

    // Cleanup old images (limit to 5)
    const oldImages = await query(
      `SELECT image_path FROM user_images
       WHERE user_id = $1
       ORDER BY created_at DESC
       OFFSET 5`,
      [userId]
    );

    for (const img of oldImages) {
      try {
        const absolutePath = path.join(process.cwd(), "public", img.image_path);
        await fs.unlink(absolutePath);
        await query(
          "DELETE FROM user_images WHERE image_path = $1", 
          [img.image_path]
        );
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
      NextResponse.json(
        { message: "Server error during upload" },
        { status: 500 }
      )
    );
  } finally {
    if (dbConnected) {
      await disconnectDB();
    }
  }
}