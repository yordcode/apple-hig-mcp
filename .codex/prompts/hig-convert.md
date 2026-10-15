---
description: Rewrite an existing interface so it follows Apple's Human Interface Guidelines.
---

Convert this existing interface so it follows Apple's Human Interface Guidelines.
Keep the product's purpose and content. Change structure, components, hierarchy, targets, and copy where the guidelines require it.

Design: Use the design the user described with this command.
Platform: Use the platform the user named. If none was named, ask which platform before fetching topics.

Before writing the converted UI:
1. Call guide_interface with this design and platform.
2. Call get_topic for each topic it cites, and keep the Apple source URL in the answer.
3. Call get_design_reference for each component you will use, with the same platform.
4. Deliver the converted interface, and name what changed.
Do not copy Apple product chrome, logos, or San Francisco font files.
