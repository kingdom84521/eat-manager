---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/App.tsx]
autonomous: true
requirements: [LAF-hamburger-position]

must_haves:
  truths:
    - "Hamburger icon is visually pinned to the upper-left corner of the viewport on all screen widths"
    - "Header bar still spans the full width with its background/border"
    - "Clicking the hamburger still opens the sidebar drawer"
  artifacts:
    - path: "src/App.tsx"
      provides: "Header with absolutely-positioned hamburger at left edge"
  key_links:
    - from: "hamburger button"
      to: "setDrawerOpen(true)"
      via: "onClick handler"
      pattern: "setDrawerOpen\\(true\\)"
---

<objective>
Move the hamburger menu button to the absolute upper-left corner of the page.

Purpose: On wider screens the hamburger currently sits inside the `max-w-xl mx-auto` centered column, so it appears offset from the left edge. It should always be at the viewport's left edge.
Output: Updated header layout in `src/App.tsx`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/App.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Position hamburger at absolute upper-left of header</name>
  <files>src/App.tsx</files>
  <action>
In `src/App.tsx`, restructure the header (lines 64-74) so the hamburger button sits at the left edge of the full-width header, outside the `max-w-xl mx-auto` container.

Current structure:
```
<header fixed full-width>
  <div max-w-xl mx-auto flex>
    <button hamburger />
  </div>
</header>
```

Target structure:
```
<header fixed full-width flex items-center>
  <button hamburger absolute left-0 px-3 />
  <div max-w-xl mx-auto flex items-center ...>
    (any future centered header content can go here, or leave empty/minimal)
  </div>
</header>
```

Specifically:
1. Add `flex items-center` to the `<header>` element (keep existing classes).
2. Move the hamburger `<button>` out of the inner `<div>` and make it a direct child of `<header>`, placed before the inner div.
3. Give the button `absolute left-0 top-0 h-10 px-3 flex items-center` so it is pinned to the upper-left corner of the fixed header and vertically centered within the 40px bar.
4. Add `relative` to the `<header>` so the absolute positioning context is the header itself.
5. Keep the inner `max-w-xl mx-auto` div for any remaining centered header content (it can remain empty or hold a title later).
6. Preserve the `h-10` on the inner div to maintain header height.
7. Ensure `onClick={() => setDrawerOpen(true)}` and `aria-label="開啟選單"` remain on the button.
8. Keep all existing header styling: `fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800`.
  </action>
  <verify>
    <automated>cd /home/ubuntu/works/eat-manager && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>Hamburger button is positioned at the absolute upper-left of the header bar, outside the max-w-xl centered column. Build passes with no errors.</done>
</task>

</tasks>

<verification>
- `npm run build` succeeds
- Visual check: on a wide viewport, hamburger is flush to left edge of viewport, not indented to the centered column
</verification>

<success_criteria>
The hamburger icon renders at the upper-left corner of the viewport on all screen widths. The sidebar drawer still opens when clicked. The header background/border still spans full width. Build passes cleanly.
</success_criteria>

<output>
After completion, create `.planning/quick/260407-laf-hamburger-icon-should-locate-at-the-uppe/260407-laf-SUMMARY.md`
</output>
