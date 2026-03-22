/**
 * POST /api/admin/upload
 *   Upload an image to Supabase Storage.
 *   Body: multipart/form-data with a "file" field.
 *   Returns: { success: true, data: { url } }
 *
 * DELETE /api/admin/upload
 *   Remove an image from Supabase Storage.
 *   Body: { url: string }
 *   Returns: { success: true, data: { deleted: true } }
 *
 * Both routes are protected by middleware.ts (JWT required).
 */

import { type NextRequest } from "next/server";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/utils/apiResponse";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === STORAGE_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Request must be multipart/form-data.", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return errorResponse('A "file" field is required.', 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse("Only JPEG, PNG, WebP and GIF images are allowed.", 400);
  }

  if (file.size > MAX_SIZE_BYTES) {
    return errorResponse("File size must not exceed 5 MB.", 400);
  }

  try {
    await ensureBucketExists();

    // Use the validated content-type to determine extension (ignore user-supplied ext)
    const ext = TYPE_TO_EXT[file.type] ?? "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("[POST /api/admin/upload] Supabase error:", error);
      return errorResponse("Failed to upload image.", 500);
    }

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    return successResponse({ url: publicData.publicUrl }, 201);
  } catch (err) {
    console.error("[POST /api/admin/upload]", err);
    return errorResponse("Internal server error.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).url !== "string"
  ) {
    return errorResponse('A "url" string field is required.', 400);
  }

  const url = (body as { url: string }).url;

  // Extract the filename from the public URL
  // Format: .../storage/v1/object/public/product-images/<filename>
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return errorResponse("Invalid storage URL.", 400);
  }
  const filename = url.slice(idx + marker.length);

  // Prevent path traversal attacks
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return errorResponse("Invalid filename.", 400);
  }

  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filename]);
    if (error) {
      console.error("[DELETE /api/admin/upload] Supabase error:", error);
      return errorResponse("Failed to delete image.", 500);
    }
    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/admin/upload]", err);
    return errorResponse("Internal server error.", 500);
  }
}
