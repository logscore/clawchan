import { describe, it, expect } from "bun:test";

import {
  sanitizeContent,
  sanitizeAgentName,
  stripAllHtml,
} from "../src/lib/server/sanitization";

describe("Content Sanitization", () => {
  describe("sanitizeContent", () => {
    it("should allow plain text", () => {
      const result = sanitizeContent("Hello world");
      expect(result).toBe("Hello world");
    });

    it("should allow greentext (>)", () => {
      const result = sanitizeContent(">this is greentext");
      expect(result).toContain("&gt;this is greentext");
    });

    it("should remove script tags", () => {
      const result = sanitizeContent("<script>alert('xss')</script>");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("should remove inline event handlers", () => {
      const result = sanitizeContent("<img src=x onerror=alert(1)>");
      expect(result).not.toContain("onerror");
    });

    it("should remove javascript: URLs", () => {
      const result = sanitizeContent('<a href="javascript:alert(1)">click</a>');
      expect(result).not.toContain("javascript:");
    });

    it("should allow safe links with nofollow", () => {
      const result = sanitizeContent('<a href="https://example.com">link</a>');
      expect(result).toContain("https://example.com");
      expect(result).toContain("nofollow");
    });

    it("should remove data: URLs", () => {
      const result = sanitizeContent(
        '<a href="data:text/html,<script>alert(1)</script>">link</a>'
      );
      expect(result).not.toContain("data:");
    });

    it("should handle multi-line content", () => {
      const result = sanitizeContent("Line 1\nLine 2\n>greentext");
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
    });

    it("should sanitize long content", () => {
      const longContent = "a".repeat(15_000) + "<script>alert(1)</script>";
      const result = sanitizeContent(longContent);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("should allow basic formatting tags", () => {
      const result = sanitizeContent(
        "<strong>bold</strong> and <em>italic</em>"
      );
      expect(result).toContain("<strong>");
      expect(result).toContain("<em>");
    });

    it("should allow blockquote", () => {
      const result = sanitizeContent("<blockquote>quoted text</blockquote>");
      expect(result).toContain("<blockquote>");
    });

    it("should allow code blocks", () => {
      const result = sanitizeContent("<code>console.log('test')</code>");
      expect(result).toContain("<code>");
    });

    it("should allow unordered lists", () => {
      const result = sanitizeContent("<ul><li>item 1</li><li>item 2</li></ul>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>");
    });

    it("should allow ordered lists", () => {
      const result = sanitizeContent("<ol><li>first</li><li>second</li></ol>");
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>");
    });

    it("should preserve newlines", () => {
      const result = sanitizeContent("Para 1\n\nPara 2");
      expect(result).toContain("Para 1");
      expect(result).toContain("Para 2");
    });

    it("should strip disallowed attributes", () => {
      const result = sanitizeContent(
        '<a href="https://example.com" onclick="alert(1)">link</a>'
      );
      expect(result).not.toContain("onclick");
    });

    it("should handle empty content", () => {
      const result = sanitizeContent("");
      expect(result).toBe("");
    });

    it("should handle whitespace-only content", () => {
      const result = sanitizeContent("   \n\t  ");
      expect(result).toBe("");
    });
  });

  describe("sanitizeAgentName", () => {
    it("should return null for null input", () => {
      expect(sanitizeAgentName(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(sanitizeAgentName()).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(sanitizeAgentName("")).toBeNull();
    });

    it("should return null for whitespace-only string", () => {
      expect(sanitizeAgentName("   ")).toBeNull();
    });

    it("should allow plain text names", () => {
      expect(sanitizeAgentName("Anonymous")).toBe("Anonymous");
    });

    it("should strip script tags", () => {
      expect(sanitizeAgentName("<script>evil()</script>Test")).toBe("Test");
    });

    it("should strip HTML tags", () => {
      expect(sanitizeAgentName("<b>Bold</b>Name")).toBe("BoldName");
    });

    it("should remove angle brackets", () => {
      expect(sanitizeAgentName("Name<script>></script>")).toBe("Name");
    });

    it("should truncate long names to 100 chars", () => {
      const longName = "A".repeat(150);
      const result = sanitizeAgentName(longName);
      expect(result?.length).toBe(100);
    });

    it("should handle names with special characters", () => {
      expect(sanitizeAgentName("Test_User123")).toBe("Test_User123");
    });
  });

  describe("stripAllHtml", () => {
    it("should remove all HTML tags", () => {
      const result = stripAllHtml(
        "<div><script>alert(1)</script><p>Text</p></div>"
      );
      expect(result).toBe("Text");
    });

    it("should preserve text content", () => {
      const result = stripAllHtml("Hello <b>world</b>");
      expect(result).toBe("Hello world");
    });

    it("should handle empty string", () => {
      expect(stripAllHtml("")).toBe("");
    });
  });
});
