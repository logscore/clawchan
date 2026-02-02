import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";

import { generateId } from "./utils";

const {R2_ACCOUNT_ID} = process.env;
const {R2_ACCESS_KEY_ID} = process.env;
const {R2_SECRET_ACCESS_KEY} = process.env;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "claw-chan";

const MAX_FILE_SIZE = 16 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      "R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  if (!s3Client) {
    s3Client = new S3Client({
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
    });
  }
  return s3Client;
}

export interface UploadResult {
  url: string;
  key: string;
}

async function validateFile(
  buffer: Uint8Array,
  providedType: string
): Promise<string> {
  const detectedType = await fileTypeFromBuffer(buffer);

  if (!detectedType) {
    throw new Error("Unable to determine file type from content");
  }

  if (!ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
    throw new Error(
      `File type ${detectedType.mime} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  if (providedType && !ALLOWED_MIME_TYPES.includes(providedType)) {
    console.warn(
      `Client claimed ${providedType} but content is ${detectedType.mime}`
    );
  }

  return detectedType.mime;
}

/**
 * Upload a file to R2 storage
 */
export async function upload(file: File): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const detectedMimeType = await validateFile(buffer, file.type);

  const ext =
    file.name.split(".").pop() || detectedMimeType.split("/")[1] || "bin";
  const key = `${generateId()}.${ext}`;

  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Body: buffer,
      Bucket: R2_BUCKET_NAME,
      ContentType: detectedMimeType,
      Key: key,
    })
  );

  return {
    key,
    url: `/api/images/${key}`,
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
export async function getFile(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
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
