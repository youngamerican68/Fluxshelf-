import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Create a service role client for server-side storage operations
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const BUCKET_NAME = "fluxshield";

export async function uploadFile(
  userId: string,
  path: string,
  file: Buffer | Blob | ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = getServiceClient();
  const fullPath = `${userId}/${path}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fullPath, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return fullPath;
}

export async function downloadFile(path: string): Promise<Blob> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function getSignedUrls(
  paths: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  const supabase = getServiceClient();
  const result = new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(paths, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URLs: ${error.message}`);
  }

  for (const item of data) {
    if (item.signedUrl && item.path) {
      result.set(item.path, item.signedUrl);
    }
  }

  return result;
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export async function deleteFiles(paths: string[]): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export async function downloadFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download from URL: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function getStoragePath(
  userId: string,
  type: "brands" | "campaigns",
  entityId: string,
  subPath: string
): string {
  return `${userId}/${type}/${entityId}/${subPath}`;
}
