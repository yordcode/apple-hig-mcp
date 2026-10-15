export const PLATFORMS = [
  "web",
  "ios",
  "ipados",
  "macos",
  "watchos",
  "tvos",
  "visionos",
] as const;

export type Platform = (typeof PLATFORMS)[number];
export type PlatformFilter = Platform | "all";
export type RulePlatform = Platform | "all";

export const SECTIONS = [
  "getting-started",
  "foundations",
  "patterns",
  "components",
  "inputs",
  "technologies",
] as const;

export type Section = (typeof SECTIONS)[number];

export interface Topic {
  id: string;
  title: string;
  path: string;
  section: string | null;
  group: string | null;
  kind: "article" | "collection" | "module";
  platforms: Platform[];
}

export interface CatalogFile {
  source: string;
  generatedAt: string;
  topics: Array<Omit<Topic, "platforms">>;
}

export interface DesignRule {
  statement: string;
  platforms: RulePlatform[];
}

export interface WebMapping {
  element: string;
  variants: string[];
  cssNotes: string[];
  accessibility: string[];
}

export interface DesignCard {
  id: string;
  title: string;
  kind: "foundation" | "component" | "pattern";
  sourcePath: string;
  summary: string;
  keywords: string[];
  whenToUse: string[];
  whenNotToUse: string[];
  rules: DesignRule[];
  web: WebMapping;
  related: string[];
}

export interface Store {
  generatedAt: string;
  topics: Topic[];
  aliases: Record<string, string[]>;
  cards: DesignCard[];
}

export interface IndexNode {
  title: string;
  path: string;
  type: string;
  children?: IndexNode[];
}
