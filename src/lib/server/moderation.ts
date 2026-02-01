const PROHIBITED_PATTERNS = [
  /\bcp\b.*\blinks?\b/i,
  /child.*porn/i,
  /kill.*for.*money/i,
  /assassin.*hire/i,
  /hitman.*service/i,
];

export function moderateContent(content: string): boolean {
  return !PROHIBITED_PATTERNS.some((p) => p.test(content));
}
