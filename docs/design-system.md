# Prev Design System

A refined utility design system with an editorial, professional aesthetic built on warm stone neutrals.

---

## Philosophy

**Warm Professionalism** — This design system rejects the cold, clinical feel of pure grays in favor of Tailwind's stone palette. The result is an interface that feels approachable yet sophisticated, like a well-designed print publication.

**Key Principles:**
- **Warmth over coldness** — Stone tones add subtle warmth without sacrificing professionalism
- **Restraint over excess** — Minimal decoration, maximum clarity
- **Typography-first** — Content takes center stage with carefully chosen typefaces
- **Systematic consistency** — Every color, space, and radius follows a deliberate pattern

---

## Color Palette

### Semantic Colors

Colors are defined using OKLCH for perceptual uniformity and better dark mode transitions.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | stone-50 `#FAFAF9` | stone-900 `#1C1917` | Page background |
| `foreground` | stone-900 `#1C1917` | stone-50 `#FAFAF9` | Primary text |
| `card` | white `#FFFFFF` | stone-800 `#292524` | Card surfaces |
| `primary` | stone-900 | stone-200 | Primary actions, buttons |
| `secondary` | stone-100 | stone-700 | Secondary actions |
| `muted` | stone-100 | stone-700 | Subdued backgrounds |
| `muted-foreground` | stone-600 `#57534E` | stone-400 `#A8A29E` | Secondary text |
| `accent` | stone-100 | stone-700 | Highlighted areas |
| `destructive` | rose-600 | rose-400 | Error states, dangerous actions |
| `border` | stone-200 `#E7E5E4` | stone-600 | Borders, dividers |
| `ring` | stone-500 | stone-500 | Focus rings |

### Stone Scale Reference

```
stone-50   #FAFAF9  — Lightest, page background (light)
stone-100  #F5F5F4  — Secondary backgrounds
stone-200  #E7E5E4  — Borders, dividers
stone-300  #D6D3D1  — Disabled states
stone-400  #A8A29E  — Muted text (dark mode)
stone-500  #78716C  — Focus rings
stone-600  #57534E  — Muted text (light mode)
stone-700  #44403C  — Secondary backgrounds (dark)
stone-800  #292524  — Card surfaces (dark)
stone-900  #1C1917  — Darkest, page background (dark)
```

### Chart Colors

For data visualization, we use vibrant accent colors:

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `chart-1` | lime-600 `#65A30D` | lime-500 |
| `chart-2` | teal-600 | emerald-400 |
| `chart-3` | cyan-800 | amber-400 |
| `chart-4` | yellow-400 | purple-500 |
| `chart-5` | amber-400 | rose-500 |

---

## Typography

### Font Stack

| Purpose | Font | Fallback |
|---------|------|----------|
| Display | DM Sans | system-ui, sans-serif |
| Body | DM Sans | system-ui, sans-serif |
| Monospace | IBM Plex Mono | ui-monospace, monospace |

### Why These Fonts?

**DM Sans** — A geometric sans-serif with clean, modern proportions. Unlike generic system fonts, DM Sans has distinctive character while maintaining excellent readability. Its slight warmth complements the stone palette.

**IBM Plex Mono** — A humanist monospace that's highly legible for code blocks. Its design philosophy aligns with our professional aesthetic while being easier to read than purely mechanical monospace fonts.

### Type Scale (Tailwind Classes)

```
text-xs    — 0.75rem (12px)   — Fine print, labels
text-sm    — 0.875rem (14px)  — Secondary text, captions
text-base  — 1rem (16px)      — Body text
text-lg    — 1.125rem (18px)  — Lead paragraphs
text-xl    — 1.25rem (20px)   — Section headings
text-2xl   — 1.5rem (24px)    — Card titles
text-3xl   — 1.875rem (30px)  — Page headings
text-4xl   — 2.25rem (36px)   — Hero text
```

### Heading Styles

All headings use:
- `font-semibold` — Weight 600
- `tracking-tight` — Tighter letter-spacing for display sizes
- `font-display` — DM Sans

```css
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.025em;
}
```

---

## Spacing

We use Tailwind's default spacing scale based on 0.25rem (4px) increments:

| Class | Value | Common Usage |
|-------|-------|--------------|
| `p-1` | 4px | Tight internal padding |
| `p-2` | 8px | Button padding, small gaps |
| `p-4` | 16px | Card padding, section gaps |
| `p-6` | 24px | Card header/content padding |
| `p-8` | 32px | Main content padding |

### Spacing Patterns

- **Cards**: `p-6` for header and content areas
- **Buttons**: `px-4 py-2` (default), `px-3` (small), `px-8` (large)
- **Sidebar**: `p-4` internal padding
- **Main content**: `p-8` with `max-w-4xl` constraint
- **Stack spacing**: `space-y-1` for tight lists, `space-y-1.5` for card headers

---

## Border Radius

Based on a configurable `--radius` token (default: `0.5rem`):

| Token | Calculation | Value | Usage |
|-------|-------------|-------|-------|
| `radius-sm` | `--radius - 4px` | 4px | Small elements, badges |
| `radius-md` | `--radius - 2px` | 6px | Buttons, inputs |
| `radius-lg` | `--radius` | 8px | Cards, containers |
| `radius-xl` | `--radius + 4px` | 12px | Modals, large panels |

### Usage Guidelines

```jsx
// Cards use rounded-lg (8px)
<Card className="rounded-lg" />

// Buttons use rounded-md (6px)
<Button className="rounded-md" />

// Small badges use rounded-sm or rounded-full
<Badge className="rounded-full" />
```

---

## Component Patterns

### Button Variants

```tsx
// Default — Primary action, dark background
<Button variant="default">Submit</Button>

// Secondary — Less prominent action
<Button variant="secondary">Cancel</Button>

// Outline — Bordered, transparent background
<Button variant="outline">Options</Button>

// Ghost — No background until hover
<Button variant="ghost">Menu</Button>

// Destructive — Dangerous actions
<Button variant="destructive">Delete</Button>

// Link — Text-only with underline on hover
<Button variant="link">Learn more</Button>
```

### Button Sizes

```tsx
<Button size="sm">Small</Button>     // h-9, px-3
<Button size="default">Default</Button>  // h-10, px-4
<Button size="lg">Large</Button>     // h-11, px-8
<Button size="icon">🔍</Button>      // h-10, w-10 (square)
```

### Card Composition

```tsx
<Card>
  <CardHeader>
    <CardTitle>Getting Started</CardTitle>
    <CardDescription>Learn the basics</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Main content goes here...</p>
  </CardContent>
  <CardFooter>
    <Button>Continue</Button>
  </CardFooter>
</Card>
```

### State Styles

| State | Style |
|-------|-------|
| Hover | `hover:bg-{color}/90` — 90% opacity |
| Focus | `focus-visible:ring-2 focus-visible:ring-ring` |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` |
| Active link | `bg-accent text-accent-foreground font-medium` |

---

## Animation

### Available Animations

```css
/* Fade in — 200ms ease-out */
.animate-fade-in

/* Collapse animations for accordions */
.animate-collapse-down
.animate-collapse-up
```

### Transition Defaults

All interactive elements use `transition-colors` for smooth color changes on hover/focus.

### Animation Guidelines

- **Duration**: 200ms for micro-interactions, longer for page transitions
- **Easing**: `ease-out` for entering animations, `ease-in` for exits
- **Restraint**: Animate only what needs attention; avoid gratuitous motion

---

## Dark Mode

Dark mode inverts the stone scale while maintaining warmth:

```css
/* Apply dark mode by adding .dark class to html or a parent */
<html class="dark">
```

### Key Inversions

| Element | Light | Dark |
|---------|-------|------|
| Background | stone-50 | stone-900 |
| Cards | white | stone-800 |
| Primary | stone-900 | stone-200 |
| Muted text | stone-600 | stone-400 |
| Borders | stone-200 | stone-600 |

### Dark Mode in Tailwind

```tsx
// Automatic dark mode variants
<div className="bg-background text-foreground">
  // Uses semantic tokens that auto-switch
</div>

// Manual dark variant (if needed)
<div className="bg-white dark:bg-stone-800">
  // Explicit light/dark values
</div>
```

---

## Sidebar Tokens

Dedicated tokens for sidebar components:

| Token | Light | Dark |
|-------|-------|------|
| `sidebar` | stone-50 | stone-800 |
| `sidebar-foreground` | stone-900 | stone-50 |
| `sidebar-primary` | stone-900 | lime-500 |
| `sidebar-accent` | stone-100 | stone-700 |
| `sidebar-border` | stone-200 | stone-600 |

---

## Usage with Tailwind

### Importing the Design System

```tsx
// In your entry file (entry.tsx)
import './styles.css'
```

### Using Semantic Colors

```tsx
// Background and text
<div className="bg-background text-foreground">

// Cards
<div className="bg-card text-card-foreground border rounded-lg">

// Muted text
<p className="text-muted-foreground text-sm">

// Primary button
<button className="bg-primary text-primary-foreground">
```

### Using the cn() Utility

```tsx
import { cn } from '@prev/ui'

// Merge classes conditionally
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  className
)}>
```

---

## Best Practices

### Do

- Use semantic color tokens (`bg-primary`) over raw colors (`bg-stone-900`)
- Maintain consistent spacing with the scale (`p-4`, `p-6`, `p-8`)
- Use `font-display` for headings, `font-mono` for code
- Apply `transition-colors` to interactive elements
- Test both light and dark modes

### Don't

- Mix warm (stone) and cool (gray/slate) palettes
- Use arbitrary spacing values outside the scale
- Override font families without good reason
- Add animations without purpose
- Forget focus states for accessibility

---

## File Structure

```
src/
├── theme/
│   ├── styles.css      # Design tokens and base styles
│   ├── entry.tsx       # App entry point
│   ├── App.tsx         # Router setup
│   ├── Layout.tsx      # Page layout with sidebar
│   └── Sidebar.tsx     # Navigation component
└── ui/
    ├── button.tsx      # Button component with variants
    ├── card.tsx        # Card composition components
    └── utils.ts        # cn() utility function
```

---

## Credits

This design system is inspired by [Design OS](https://github.com/buildermethods/design-os), adapted for documentation sites with a focus on readability and professional aesthetics.
