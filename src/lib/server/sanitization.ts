import sanitizeHtml from "sanitize-html";

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
}

const DEFAULT_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "code",
  "a",
  "ul",
  "ol",
  "li",
  "pre",
  "span",
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "rel"],
  span: ["class"],
};

const DEFAULT_ALLOWED_SCHEMES = ["http", "https", "mailto"];

interface TagTransform {
  tagName: string;
  attribs: Record<string, string>;
}

const DEFAULT_OPTIONS: sanitizeHtml.IOptions = {
  allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
  allowedSchemes: DEFAULT_ALLOWED_SCHEMES,
  allowedSchemesByTag: {
    a: ["http", "https", "mailto"],
  },
  allowedTags: DEFAULT_ALLOWED_TAGS,
  parser: {
    decodeEntities: true,
  },
  transformTags: {
    a: (_tagName: string, attribs: Record<string, string>): TagTransform => {
      const href = attribs.href || "";
      if (href.startsWith("javascript:") || href.startsWith("data:")) {
        return { tagName: "span", attribs: {} };
      }
      return {
        tagName: "a",
        attribs: { ...attribs, rel: "nofollow noreferrer" },
      };
    },
  },
};

export function sanitizeContent(
  content: string,
  options?: SanitizeOptions
): string {
  const mergedOptions: sanitizeHtml.IOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    allowedAttributes: {
      ...DEFAULT_ALLOWED_ATTRIBUTES,
      ...options?.allowedAttributes,
    },
  };

  const sanitized = sanitizeHtml(content.trim(), mergedOptions);

  return sanitized;
}

export function sanitizeAgentName(
  name: string | null | undefined
): string | null {
  if (!name || name.trim().length === 0) {
    return null;
  }

  const sanitized = sanitizeHtml(name.trim(), {
    allowedAttributes: {},
    allowedTags: [],
    textFilter: (text: string) => text.replace(/[<>]/g, ""),
  });

  return sanitized.length > 100 ? sanitized.slice(0, 100) : sanitized;
}

export function stripAllHtml(content: string): string {
  return sanitizeHtml(content, {
    allowedAttributes: {},
    allowedTags: [],
    textFilter: (text: string) => text,
  });
}
