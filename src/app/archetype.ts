// src/app/archetype.ts

// ===== Canonical archetype slugs we store in Firestore =====
export type ChefType =
  | "Hustler"
  | "Legacy"
  | "Connector"
  | "Innovator"
  | "Storyteller"
  | "Community"
  | "Chefpreneur"
  | "Nomad";

// ===== UI meta (labels do NOT include the word "Chef") =====
export const CHEF_LABEL: Record<ChefType, string> = {
  Hustler: "Hustler",
  Legacy: "Legacy",
  Connector: "Connector",
  Innovator: "Innovator",
  Storyteller: "Storyteller",
  Community: "Community",
  Chefpreneur: "Chefpreneur",
  Nomad: "Nomad",
};

export const CHEF_TAGLINE: Record<ChefType, string> = {
  Hustler: "Always on the move",
  Legacy: "Rooted in tradition",
  Connector: "Bridge-builder",
  Innovator: "Experimental & tech-forward",
  Storyteller: "Food with a narrative",
  Community: "Feeds the block",
  Chefpreneur: "Building a brand",
  Nomad: "Kitchen anywhere",
};

// Helper: label-only
export function chefName(t?: ChefType | string): string {
  if (!t) return "Chef";
  const key = normalizeArchetype(t);
  return key ? CHEF_LABEL[key] : String(t);
}

// Helper: UI title (adds “ Chef” once)
export function chefTitle(t?: ChefType | string): string {
  const base = chefName(t);      // "Chef" if unknown
  return /chef/i.test(base) ? base : `${base} Chef`;
}

// Normalize Legacy values like "Hustler", "Hustler", "Hustler Chef" → "Hustler"
export function normalizeArchetype(raw?: string): ChefType | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().replace(/\s*chef\s*$/i, "").trim();
  const allowed = new Set<ChefType>([
    "Hustler",
    "Legacy",
    "Connector",
    "Innovator",
    "Storyteller",
    "Community",
    "Chefpreneur",
    "Nomad",
  ]);
  return allowed.has(s as ChefType) ? (s as ChefType) : undefined;
}

// ===== Quiz mapper: a1 (single), a2 (multi), a3 (single) → ChefType =====
export function mapToArchetype(a1: string, a2: string[], a3: string): ChefType {
  const s = (x?: string) => (x || "").toLowerCase();
  const A1 = s(a1);
  const A3 = s(a3);
  const A2 = a2.map(s);
  const has2 = (substr: string) => A2.some((v) => v.includes(substr));

  // 1) Strong signals from Q1
  if (A1.includes("gigs") || A1.includes("pop-ups") || A1.includes("pop ups")) return "Hustler";
  if (A1.includes("family") || A1.includes("tradition") || A1.includes("heritage")) return "Legacy";
  if (A1.includes("together") || A1.includes("connect") || A1.includes("collab")) return "Connector";
  if (A1.includes("experiment") || A1.includes("tech") || A1.includes("ferment")) return "Innovator";
  if (A1.includes("story") || A1.includes("culture")) return "Storyteller";
  if (A1.includes("Community") || A1.includes("mutual") || A1.includes("justice")) return "Community";
  if (A1.includes("brand") || A1.includes("product") || A1.includes("scale")) return "Chefpreneur";
  if (A1.includes("travel") || A1.includes("truck") || A1.includes("residenc")) return "Nomad";

  // 2) Reinforcements from Q2 (multi-select focus)
  if (has2("paid gigs") || has2("pop-ups") || has2("pop ups")) return "Hustler";
  if (has2("farm") || has2("sourcing")) return "Legacy";
  if (has2("collab")) return "Connector";
  if (has2("ferment") || has2("r&d") || has2("experiment")) return "Innovator";
  if (has2("content") || has2("storytell")) return "Storyteller";
  if (has2("Community") || has2("mutual")) return "Community";
  if (has2("product") || has2("cpq") || has2("cpg") || has2("brand")) return "Chefpreneur";
  if (has2("travel") || has2("truck") || has2("residenc")) return "Nomad";

  // 3) Preferences from Q3 (ideal ecosystem)
  if (A3.includes("reach customers via gigs")) return "Hustler";
  if (A3.includes("transparent") || A3.includes("local") || A3.includes("heritage")) return "Legacy";
  if (A3.includes("high-collaboration") || A3.includes("network")) return "Connector";
  if (A3.includes("creative lab") || A3.includes("experiment")) return "Innovator";
  if (A3.includes("share culture") || A3.includes("stories")) return "Storyteller";
  if (A3.includes("Community impact") || A3.includes("access")) return "Community";
  if (A3.includes("scale brand") || A3.includes("operations")) return "Chefpreneur";
  if (A3.includes("flexible mobility") || A3.includes("anywhere")) return "Nomad";

  // 4) Fallbacks
  if (has2("paid") || A3.includes("customers")) return "Hustler";
  if (has2("product") || A3.includes("scale")) return "Chefpreneur";
  if (has2("collab") || A3.includes("collab")) return "Connector";

  return "Connector";
}
