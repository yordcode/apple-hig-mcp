import { describe, expect, it } from "vitest";

import { helpText } from "../src/help.js";

describe("help", () => {
  it("lists the design commands", () => {
    const text = helpText();
    expect(text).toContain("/hig-help");
    expect(text).toContain("/hig-web");
    expect(text).toContain("/hig-ios");
    expect(text).toContain("/hig-visionos");
    expect(text).toContain("/hig-topic");
    expect(text).toContain("/hig-convert");
    expect(text).toContain("/hig-audit");
    expect(text).not.toContain("/hig-all");
    expect(text).not.toContain("/hig-review");
    expect(text).toContain("Apple's Human Interface Guidelines are published by Apple Inc.");
  });
});
