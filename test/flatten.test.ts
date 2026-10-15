import { describe, expect, it } from "vitest";

import { flattenIndex, readIndexRoot } from "../src/catalog/flatten.js";
import type { IndexNode } from "../src/types.js";

const tree: IndexNode = {
  title: "Human Interface Guidelines",
  path: "/design/human-interface-guidelines",
  type: "module",
  children: [
    {
      title: "Components",
      path: "/design/human-interface-guidelines/components",
      type: "collection",
      children: [
        {
          title: "Menus and actions",
          path: "/design/human-interface-guidelines/menus-and-actions",
          type: "collection",
          children: [
            {
              title: "Buttons",
              path: "/design/human-interface-guidelines/buttons",
              type: "article",
            },
          ],
        },
      ],
    },
    {
      title: "Foundations",
      path: "/design/human-interface-guidelines/foundations",
      type: "collection",
      children: [
        {
          title: "Color",
          path: "/design/human-interface-guidelines/color",
          type: "article",
        },
      ],
    },
  ],
};

describe("flattenIndex", () => {
  it("assigns section and component group", () => {
    const topics = flattenIndex(tree);
    const buttons = topics.find((topic) => topic.id === "buttons");
    const color = topics.find((topic) => topic.id === "color");
    expect(buttons).toMatchObject({ section: "components", group: "menus-and-actions", kind: "article" });
    expect(color).toMatchObject({ section: "foundations", group: null, kind: "article" });
    expect(topics.some((topic) => topic.id === "human-interface-guidelines")).toBe(false);
  });

  it("reads the swift index root", () => {
    const root = readIndexRoot({ interfaceLanguages: { swift: [tree] } });
    expect(root.path).toBe("/design/human-interface-guidelines");
  });
});
