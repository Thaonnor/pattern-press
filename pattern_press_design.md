# Design Guide: Minecraft Modpack Recipe Viewer (No Textures)

This document provides a design framework and practical instructions for building a **web-based utility** to view and explore Minecraft modpack recipes. It assumes **no Minecraft textures** are used. Instead, the UI relies on text, abstract visuals, and badges to communicate recipe structure and metadata.

---

## 1. Design Goals
- **Utility-first**: Prioritize clarity, performance, and workflow over aesthetics.
- **Text-driven**: IDs, mods, and recipe types are primary content.
- **Abstract visuals**: Slots, arrows, and badges replace item sprites.
- **Dark mode default**: Keep dark theme as baseline, ensure AA contrast.
- **Scannable layouts**: Recipes should be recognizable at a glance.

---

## 2. Visual Language

### Slots
- Use bordered rectangles as abstract placeholders.
- Content is text (ID, tag, or short label) in monospace font.
- Center text both horizontally and vertically.

```html
<div class="slot">minecraft:iron_ingot</div>
```

```css
.slot {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  display: flex; align-items: center; justify-content: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .85rem;
  padding: 10px 14px;
  min-height: 52px;
  min-width: 110px;
}
```

### Arrows
- Use clear directional arrows between inputs and outputs.
- Recommended: SVG arrows or Unicode (→).

### Badges
- Use colored pill-style chips for metadata.
- Distinguish **recipe type** by color.
- Distinguish **mod source** with a consistent neutral-green.

```css
.chip {
  border: 1px solid var(--border);
  border-radius: .5rem;
  padding: .2rem .5rem;
  font-size: .78rem;
  display: inline-flex;
  align-items: center;
}
.chip-type[data-type="shaped"] { color: var(--info); }
.chip-type[data-type="smelting"] { color: var(--warning); }
.chip-type[data-type="smithing"] { color: var(--success); }
```

### Cards
- Each recipe is shown as a **card**.
- Layout:
  1. Header: recipe title + mod + type badge.
  2. Visualization: slots + arrows.
  3. Metadata: recipe ID, tags, copy buttons.
  4. JSON toggle.

---

## 3. Layouts by Recipe Type

### Crafting (Shaped)
```
+---+---+---+   →   +------+
| s | s | s |       | out  |
+---+---+---+       +------+
| s | s | s |
+---+---+---+
| s | s | s |
+---+---+---+
```

### Smelting
```
+-----+   →   +------+
| in  |       | out  |
+-----+       +------+
   🔥 Furnace
```

### Shapeless
- List all input slots in a cluster.

### Smithing / Machine
- Inputs → Result, with machine icon/label (⚒, 🔥, ⚙).

---

## 4. Interactions

### JSON Toggle
```html
<button class="json-toggle" @click="show = !show">Show JSON</button>
<pre x-show="show" class="json-content">{{ recipe.json }}</pre>
```

### Copy Buttons
```html
<span class="chip id" @click="$clipboard(recipe.result.id)">
  Copy ID
</span>
```

### Tooltips
- Show IDs/tags on hover.
```css
.tooltip {
  position: absolute;
  bottom: 110%;
  background: var(--surface-1);
  border: 1px solid var(--border);
  padding: .35rem .5rem;
  font-size: .78rem;
  border-radius: .35rem;
  white-space: nowrap;
  box-shadow: var(--shadow-2);
}
```

### Keyboard Navigation
- `/` focuses search.
- `←/→` = previous/next recipe.
- `j/k` = move up/down.

---

## 5. Filters & Search

- **Filters**: Item/Block, Mod, Recipe Type, Has/No recipe, Tags.
- **Search**: Support simple grammar, e.g.:  
  `mod:create type:smelting tag:#forge:ingots search:"shaft"`

Implementation (Alpine.js):
```html
<input x-model="q" @input.debounce.250ms="applySearch(q)"
       placeholder="Search items, mods, tags…" />
```

---

## 6. Dark Mode (Default)

### Rationale
- No textures means surfaces carry weight.
- Dark mode reduces glare and highlights accents.

### Tokens
- Neutral surfaces (`--surface-1`, `--surface-2`).
- Bright accents reserved for **focus/interaction**.
- Ensure AA contrast (≥ 4.5:1 for text).

---

## 7. Accessibility Checklist
- **Color-blind safe**: don’t rely solely on color.
- **Keyboard nav**: focus rings visible, all actions reachable.
- **Text size**: recipe metadata ≥ 13px, muted text ≥ 3:1 contrast.
- **Tooltips**: dismissible and hover-delay safe.

---

## 8. Component Priority
1. **Result section**: bold slot + name + mod + type badge + copy ID.
2. **Visualization**: grid/arrow flow.
3. **Metadata**: recipe ID, tags, JSON toggle.
4. **Secondary actions**: Copy tag, show uses.

---

## 9. Example Recipe Card (Dark Mode)

```html
<div class="recipe-card">
  <div class="recipe-header">
    <span class="recipe-title">Iron Pickaxe</span>
    <span class="chip chip-mod">minecraft</span>
    <span class="chip chip-type" data-type="shaped">Shaped</span>
  </div>

  <div class="recipe-visualization">
    <div class="crafting-grid">
      <div class="slot">minecraft:iron_ingot</div>
      <div class="slot">minecraft:iron_ingot</div>
      <div class="slot">minecraft:iron_ingot</div>
      <div class="slot"></div>
      <div class="slot">minecraft:stick</div>
      <div class="slot"></div>
      <div class="slot"></div>
      <div class="slot">minecraft:stick</div>
      <div class="slot"></div>
    </div>
    <div class="crafting-arrow">→</div>
    <div class="result-item">minecraft:iron_pickaxe</div>
  </div>

  <div class="recipe-meta">
    <span class="chip id">ID: minecraft:iron_pickaxe</span>
  </div>

  <button class="json-toggle">Show JSON</button>
  <pre class="json-content">{ … }</pre>
</div>
```

---

## 10. Summary
- **No textures → rely on text + abstraction.**
- **Dark mode default**, with accessible tokens.
- **Recipe visualization**: clear, scannable, consistent.
- **Utility over immersion**: badges, filters, copy actions, JSON toggles.
- **Accessibility baked in**: contrast, focus, keyboard support.

This guide should be followed directly when building the UI. All class names and structures can be adapted into Alpine.js components with minimal effort.

