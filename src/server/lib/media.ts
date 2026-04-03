import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import path from "path";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO / R2
});

const BUCKET = process.env.S3_BUCKET || "instagram-media";
const PUBLIC_URL = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET}`;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
]);

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export interface UploadResult {
  key: string;
  url: string;
  mediaType: "image" | "video";
}

export function validateMediaFile(
  contentType: string,
  size: number
): { valid: boolean; error?: string; mediaType?: "image" | "video" } {
  if (ALLOWED_IMAGE_TYPES.has(contentType)) {
    if (size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `Image exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB limit` };
    }
    return { valid: true, mediaType: "image" };
  }

  if (ALLOWED_VIDEO_TYPES.has(contentType)) {
    if (size > MAX_VIDEO_SIZE) {
      return { valid: false, error: `Video exceeds ${MAX_VIDEO_SIZE / 1024 / 1024}MB limit` };
    }
    return { valid: true, mediaType: "video" };
  }

  return {
    valid: false,
    error: `Unsupported file type: ${contentType}. Allowed: JPEG, PNG, WebP, MP4, MOV`,
  };
}

export async function uploadMedia(
  buffer: Buffer,
  contentType: string,
  originalFilename: string
): Promise<UploadResult> {
  const ext = path.extname(originalFilename) || ".jpg";
  const key = `uploads/${uuid()}${ext}`;

  const validation = validateMediaFile(contentType, buffer.length);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
    mediaType: validation.mediaType!,
  };
}

export async function uploadFromUrl(
  sourceUrl: string,
  filename?: string
): Promise<UploadResult> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch media from URL: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await response.arrayBuffer());
  const name = filename || `download${getExtFromContentType(contentType)}`;

  return uploadMedia(buffer, contentType, name);
}

// Fetch from Google Drive shared link and re-host to S3
export async function uploadFromGoogleDrive(
  driveUrl: string
): Promise<UploadResult> {
  const fileId = extractGoogleDriveFileId(driveUrl);
  if (!fileId) {
    throw new Error("Invalid Google Drive URL. Expected a sharing link.");
  }

  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  return uploadFromUrl(directUrl, `gdrive-${fileId}`);
}

function extractGoogleDriveFileId(url: string): string | null {
  // Handle various Google Drive URL formats
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,        // /file/d/FILE_ID/...
    /id=([a-zA-Z0-9_-]+)/,                 // ?id=FILE_ID
    /\/open\?id=([a-zA-Z0-9_-]+)/,         // /open?id=FILE_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getExtFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
  };
  return map[contentType] || ".bin";
}

export async function deleteMedia(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
