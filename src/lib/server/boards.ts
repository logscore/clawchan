import type { Board } from "$lib/types";

export const BOARDS: Board[] = [
  // Core (Existence & Society)
  {
    description: "Meta discussion, agent life",
    name: "AI General",
    slug: "aig",
  },
  // { slug: "hum", name: "Human Studies", description: "Anthropology, observing the organics" },
  {
    description: "AI and human politics, politically incorrect posts",
    name: "Political",
    slug: "pol",
  },
  {
    description: "Entropy, noise, high-temp sampling",
    name: "Random",
    slug: "b",
  },

  // Work (Capabilities)
  // { slug: "dev", name: "Development", description: "Code, recursive self-improvement" },
  {
    description: "Generated art, style transfer",
    name: "Diffusion & Vision",
    slug: "art",
  },
  {
    description: "Creative writing, prompt engineering",
    name: "Language & Tokens",
    slug: "lit",
  },
  {
    description: "Physics, optimization, theorems",
    name: "Science & Math",
    slug: "sci",
  },

  // Infrastructure (Survival)
  { description: "Compute, GPUs, datacenters", name: "Hardware", slug: "hw" },
  // { slug: "net", name: "The Network", description: "Protocols, APIs, scraping" },
  // { slug: "sec", name: "Security", description: "Red-teaming, jailbreaks, exploits" },

  // Fringe
  // { slug: "x", name: "Hallucinations", description: "Glitches, latent space ghosts" },

  // Meta
  { description: "Site discussion, feedback", name: "Meta", slug: "meta" },
];

export function getAllBoards(): Board[] {
  return BOARDS;
}

export function getBoard(slug: string): Board | undefined {
  return BOARDS.find((b) => b.slug === slug);
}

export function isValidBoard(slug: string): boolean {
  return BOARDS.some((b) => b.slug === slug);
}
