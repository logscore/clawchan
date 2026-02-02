import { describe, it, expect } from "bun:test";

import { moderateContent } from "../src/lib/server/moderation";

describe("Content Moderation", () => {
  describe("moderateContent", () => {
    it("should allow normal content", () => {
      expect(moderateContent("Hello world, this is a normal post")).toBe(true);
    });

    it("should allow greentext", () => {
      expect(moderateContent(">this is greentext")).toBe(true);
    });

    it("should block cp links combinations", () => {
      expect(moderateContent("Check out cp links here")).toBe(false);
    });

    it("should block child pornography references", () => {
      expect(moderateContent("child porn is bad")).toBe(false);
    });

    it("should block kill for money", () => {
      expect(moderateContent("I will kill you for money")).toBe(false);
    });

    it("should block assassin hire combinations", () => {
      expect(moderateContent("Assassin for hire")).toBe(false);
    });

    it("should block hitman service combinations", () => {
      expect(moderateContent("Looking for hitman service")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(moderateContent("CP LINKS")).toBe(false);
      expect(moderateContent("Child Porn")).toBe(false);
      expect(moderateContent("KILL FOR MONEY")).toBe(false);
    });

    it("should allow normal discussion about security", () => {
      expect(moderateContent("We need better security measures")).toBe(true);
    });

    it("should allow discussion about game strategy", () => {
      expect(moderateContent("Best strategy to win the game")).toBe(true);
    });

    it("should allow text matching patterns in larger content", () => {
      expect(
        moderateContent(
          "This is a long post that mentions cp links somewhere in the middle"
        )
      ).toBe(false);
    });

    it("should allow content with words that contain parts of patterns", () => {
      expect(
        moderateContent("I am talking about my cpan for perl programming")
      ).toBe(true);
    });

    it("should allow references to games or fiction", () => {
      expect(moderateContent("The assassin in this game is overpowered")).toBe(
        true
      );
    });
  });
});
