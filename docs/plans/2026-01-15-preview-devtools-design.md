# Preview DevTools Design

## Overview

Enhance the Preview component with a floating devtools controller for responsive testing.

## Features

- **Floating Controller Pill** - Compact icon-only toolbar, draggable
- **Device Presets** - Mobile (375px), Tablet (768px), Desktop (100%)
- **Width Slider** - Custom width control via popup
- **Dark Mode Toggle** - Injects `dark` class on iframe's HTML element
- **Fullscreen Mode** - Iframe fills viewport, controller stays visible

## UI Behavior

### Controller Pill
- Position: bottom-right corner (default), draggable to any position
- Icons with tooltips on hover
- Stays visible in all modes including fullscreen

### Icon Layout
```
[📱] [⬜] [🖥️] [↔️] [🌙] [⛶]
 │    │    │    │    │    └─ Fullscreen toggle
 │    │    │    │    └────── Dark mode toggle
 │    │    │    └─────────── Width slider (popup)
 │    │    └──────────────── Desktop (100%)
 │    └───────────────────── Tablet (768px)
 └────────────────────────── Mobile (375px)
```

### Iframe Container
- Centered when width < 100%
- Checkered/grid background visible behind constrained iframe
- Smooth CSS transitions on width changes

### Dark Mode
- Toggles `dark` class on iframe's `<html>` element
- Works with Tailwind-based previews automatically
- Icon switches between moon/sun

### Fullscreen
- Iframe fills entire viewport
- Controller floats in corner (still draggable)
- Exit via button or Escape key

## Technical Approach

1. **State**: viewportWidth, isDarkMode, isFullscreen, pillPosition
2. **Drag**: Track mousedown/mousemove/mouseup on pill
3. **Dark mode injection**: Access iframe.contentDocument.documentElement.classList
4. **Slider popup**: Small popover with range input when slider icon clicked
