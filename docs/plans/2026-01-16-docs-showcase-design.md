# Documentation Showcase Design

**Date:** 2026-01-16
**Status:** Implemented

## Goal

Create example documentation that showcases prev-cli's features, deployed on GitHub Pages.

## Audience

Developers evaluating the tool - focus on quick wins and feature showcase.

## Design Decisions

1. **Focus:** Preview components (live React demos) - the unique differentiator
2. **Structure:** Minimal showcase (landing + 2-3 focused pages)
3. **Demo type:** Interactive UI components showing React state/interactivity
4. **Theme:** Document a simple design system using the stone color palette

## Implemented Structure

```
docs/
├── index.md              # Landing - what is prev-cli
├── getting-started.md    # 30-second setup guide
├── design-system.md      # Existing design system reference
└── components/
    ├── index.md          # Component overview
    ├── button.mdx        # Button with live preview
    ├── card.mdx          # Card with live preview
    └── input.mdx         # Input with live preview

previews/
├── button-demo/          # Button variants, sizes, states
├── card-demo/            # Card composition, actions
└── input-demo/           # Validation, password toggle, character count
```

## Deployment

GitHub Actions workflow (`.github/workflows/pages.yml`) automatically:
1. Builds docs on push to main
2. Deploys to GitHub Pages

## Next Steps

1. Push to main to trigger deployment
2. Enable GitHub Pages in repository settings (Settings > Pages > Source: GitHub Actions)
3. Access at `https://<username>.github.io/prev-cli/`
