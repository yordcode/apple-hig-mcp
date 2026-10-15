import type { IndexNode } from "../types.js";

export interface FlatTopic {
  id: string;
  title: string;
  path: string;
  section: string | null;
  group: string | null;
  kind: "article" | "collection" | "module";
}

const ROOT_PATH = "/design/human-interface-guidelines";

export function slugFromPath(topicPath: string): string {
  const parts = topicPath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? topicPath;
}

export function flattenIndex(root: IndexNode): FlatTopic[] {
  const topics: FlatTopic[] = [];

  function visit(node: IndexNode, section: string | null, group: string | null): void {
    const id = slugFromPath(node.path);
    if (node.path !== ROOT_PATH) {
      const kind =
        node.type === "article" || node.type === "collection" || node.type === "module"
          ? node.type
          : "article";
      topics.push({
        id,
        title: node.title,
        path: node.path,
        section,
        group,
        kind,
      });
    }

    for (const child of node.children ?? []) {
      const childId = slugFromPath(child.path);
      let childSection = section;
      let childGroup = group;
      if (node.path === ROOT_PATH) {
        childSection = childId;
        childGroup = null;
      } else if (childSection === "components" && child.type === "collection") {
        childGroup = childId;
      }
      visit(child, childSection, childGroup);
    }
  }

  visit(root, null, null);
  topics.sort((a, b) => a.path.localeCompare(b.path));

  const seen = new Set<string>();
  for (const topic of topics) {
    if (seen.has(topic.id)) {
      throw new Error(`Duplicate HIG topic id "${topic.id}"`);
    }
    seen.add(topic.id);
  }
  return topics;
}

export function readIndexRoot(data: unknown): IndexNode {
  if (!data || typeof data !== "object") {
    throw new Error("HIG index was not a JSON object");
  }
  const languages = (data as { interfaceLanguages?: { swift?: IndexNode[] } }).interfaceLanguages;
  const root = languages?.swift?.[0];
  if (!root?.path || !Array.isArray(root.children)) {
    throw new Error("HIG index did not contain interfaceLanguages.swift[0]");
  }
  return root;
}
