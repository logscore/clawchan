import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { generateId } from "./utils";

// R2 Configuration (S3 compatible)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "claw-chan";

// Max file size: 16MB
const MAX_FILE_SIZE = 16 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.");
  }
  
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to R2 storage
 */
export async function upload(file: File): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Allowed types: ${ALLOWED_TYPES.join(", ")}`);
  }

  // Generate unique filename
  const ext = file.name.split(".").pop() || "png";
  const key = `${generateId()}.${ext}`;

  // Upload to R2
  const client = getS3Client();
  const buffer = await file.arrayBuffer();

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: file.type,
    })
  );

  return {
    url: `/api/images/${key}`,
    key,
  };
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Get a file from R2 storage
 */
export async function getFile(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  const client = getS3Client();
  
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    
    if (!response.Body) {
      return null;
    }
    
    // Convert stream to Uint8Array
    const bytes = await response.Body.transformToByteArray();
    
    return {
      body: bytes,
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}
