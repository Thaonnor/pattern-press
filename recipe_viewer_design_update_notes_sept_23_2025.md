> **What changed (summary)**  
> Lightened dark theme via layered surfaces; stronger card headers; metadata moved into a **subheader**; labeled **Mod**/**Type** chips; clearer input vs output; bigger arrows; tag styling distinct from items; optional **slot labels** for complex types; centered layout and optional **two‑column** grid on wide screens.

---

## Visual Language Refinements
- **Tone & Contrast**: three tiers — Background (darkest) → Card (dark) → Slot (slightly lighter).
- **Inputs vs Output**: output slot uses brighter surface, thicker border, and subtle shadow.
- **Tags vs Items**: tag slot shows a small corner `tag` label or wraps tags as `[#forge:ingots]` chips.

```html
<div class="slot slot--input">#c:nuggets/gold</div>
<div class="slot slot--output">advanced_coil</div>
<div class="slot slot--tag">#forge:ingots/copper</div>
```

```css
.slot--output { background: var(--surface-2a, #1d2128); border-width: 2px; box-shadow: var(--shadow-2); }
.slot--tag { position: relative; }
.slot--tag::after { content: "tag"; position: absolute; bottom: 4px; right: 6px; font-size: .7rem; color: var(--muted); }
```

## Card Anatomy & Metadata Placement
- **Header**: Title (heavier/larger), `Mod:` chip, `Type:` chip.
- **Subheader**: `ID:` (prominent), `time`, `XP` as secondary chips.
- **Body**: Visualization (slots + large primary-colored arrow).
- **Footer**: Actions/JSON toggle.

```html
<div class="recipe-header">
  <h3 class="recipe-title">Advanced Coil</h3>
  <div class="recipe-header-badges">
    <span class="chip"><span class="badge-label">Mod:</span> actuallyadditions</span>
    <span class="chip chip-type" data-type="minecraft:crafting_shaped"><span class="badge-label">Type:</span> minecraft:crafting_shaped</span>
  </div>
</div>
<div class="recipe-subheader">
  <span class="chip id">ID: actuallyadditions:advanced_coil</span>
  <span class="chip time">100 ticks</span>
  <span class="chip xp">0.7 XP</span>
</div>
```

## Slot Labels for Complex Types
- For smithing/machines, add optional labels below or above slots: `template`, `base`, `material`, `catalyst`, `fluid`, `secondary`, etc. Keep labels short/muted.

## Layout & Responsiveness
- **Centered column**: `.container { max-width: 1080px; margin: 0 auto; padding: 0 16px; }`
- **Two‑column on ≥1440px**: `.recipes { display: grid; gap: 16px; } @media (min-width:1440px){ .recipes{ grid-template-columns:1fr 1fr; } }`
- **Compact density**: slightly reduced paddings on slots/cards to shorten vertical height.
- **Sticky filters**: keep filter bar sticky on scroll for large lists.

## Example Card (Revised)
```html
<div class="recipe-card">
  <div class="recipe-header">
    <h3 class="recipe-title">Advanced Coil</h3>
    <div class="recipe-header-badges">
      <span class="chip"><span class="badge-label">Mod:</span> actuallyadditions</span>
      <span class="chip chip-type" data-type="minecraft:crafting_shaped"><span class="badge-label">Type:</span> minecraft:crafting_shaped</span>
    </div>
  </div>
  <div class="recipe-subheader">
    <span class="chip id">ID: actuallyadditions:advanced_coil</span>
    <span class="chip time">100 ticks</span>
    <span class="chip xp">0.7 XP</span>
  </div>
  <div class="recipe-visualization">
    <div class="crafting-grid">
      <div class="slot slot--input">#c:nuggets/gold<div class="slot-label">nugget</div></div>
      <div class="slot slot--input">#c:nuggets/gold<div class="slot-label">nugget</div></div>
      <div class="slot slot--input">#c:nuggets/gold<div class="slot-label">nugget</div></div>
      <div class="slot slot--input">#c:nuggets/gold</div>
      <div class="slot slot--input">basic_coil<div class="slot-label">core</div></div>
      <div class="slot slot--input">#c:nuggets/gold</div>
      <div class="slot slot--input">#c:nuggets/gold</div>
      <div class="slot slot--input">#c:nuggets/gold</div>
      <div class="slot slot--input">#c:nuggets/gold</div>
    </div>
    <div class="arrow">→</div>
    <div class="result-item slot--output">advanced_coil</div>
  </div>
  <div class="recipe-actions">
    <button class="json-toggle">Show Raw JSON</button>
  </div>
</div>
```