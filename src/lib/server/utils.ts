import { createHash } from "crypto";
import { ulid } from "ulid";

export function generateId(): string {
  return ulid();
}

export function generateTripcode(key: string): string {
  const hash = createHash("sha256").update(key).digest("base64");
  return "!" + hash.slice(0, 6);
}

export function parseQuotes(content: string): string[] {
  const matches = content.match(/>>([A-Z0-9]+)/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2));
}
