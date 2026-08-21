# 🤖 UI Design & Code Generation Guidelines

> Status: Normative repository rule for generated and reviewed UI.
>
> Before generating, modifying, or reviewing Tailwind / React UI, read and apply this document together with AGENTS.md and docs/engineering/design-system.md.

This document enforces strict UI engineering and design rules for AI agents generating Tailwind CSS code. You must actively recognize and reject “AI Slop”—the generic, low-effort visual templates that define amateur AI generation. Every visual, typographic, and spatial decision must have a mathematical or optical purpose.

## 1. 🚫 The “Anti-Slop” Banned Patterns

Never output these recognized AI-generated UI clichés:

- **Color & FX**: No purple-to-blue gradients, cyan-on-dark text, gradient text, or arbitrary glassmorphism / glowing drop-shadows.
- **Layout**: No nested cards (cards inside cards). No identical 3-column feature grids with stacked icons. No “hero metric” blocks (big number + tiny label + 3 stats).
- **Borders & Shapes**: No side-tab borders (a thick colored line on just the left side of a card). No ghost cards mixing 1px hairline borders and wide soft shadows. No extreme border-radii on standard cards (cap at 12–16px; reserve 24px+ pills for buttons / tags).
- **Conflict Resolution**: If you use a thick accent border, do not use rounded corners. Remove either the border or the border-radius so they do not compete.
- **Copywriting**: Ban generic SaaS verbs such as “supercharge” and “empower”.

## 2. 📐 Layout, Spacing, & Hierarchy

- **Padding Math**: Container outer padding must always equal or exceed the inner padding between its child elements. For example, if a parent container has p-6 (24px), children should use gap-4 (16px) or less. Never use p-4 with gap-8.
- **Button Proportions**: Button horizontal padding must be exactly 2x vertical padding, such as px-4 py-2 or px-6 py-3.
- **Rhythmic Spacing**: Avoid monotonous, identical spacing everywhere. Use tight groupings for related items and generous padding between major sections. Measure spacing between points of high contrast, such as container edges, not just baselines.
- **Flatten Depth**: Instead of nesting containers with borders, use whitespace, typography, and subtle dividers to create hierarchy.
- **Nested Border Radius Rule**: When a rounded container sits inside another rounded container, calculate the inner radius mathematically: Inside Corner Radius = Outside Corner Radius - Distance Between the Two (Padding).

## 3. 📝 Typography & SaaS Density

- **B2B Density**: For data-heavy B2B interfaces, use text-[13px] or text-[14px] for body text / inputs to maintain high information density. Use text-[12px] for metadata / helper text.
- **Baseline Readability**: Line height must be 1.5–1.7 (leading-relaxed). Do not use all-caps for body text.
- **Labels & Tags**: Text inside a button, pill, chip, tab, or badge sits on one line—never wrapped, hyphenated, or truncated. Size the control to its label with whitespace-nowrap, or shorten the label.
- **Hierarchy without Size**: Differentiate text using font weight (font-medium, font-semibold) and color (text-gray-900 vs text-gray-500), rather than making everything larger. Never skip heading levels, such as going from H1 straight to H3.

## 4. 🎨 Color, Contrast & Execution

- **Sophisticated Neutrals**: Avoid pure #000 or #FFF without context. Add subtle warmth or coolness to backgrounds, such as bg-gray-50 or bg-[#FCFCFD].
- **Background vs Card**: The brightness difference between a background and a container sitting on it must be subtle (≤7% in light mode).
- **Legibility**: Never put gray text on a colored background. Pass WCAG AA (4.5:1 for body text).

## 5. ✨ Micro-interactions & Forms

- **Input Focus**: Never rely on default browser outlines. Always use custom focus rings with diffused opacity, for example: focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10.
- **Interactive States**: All clickable elements must have a hover state and, when useful, an active state, together with transition-all duration-200.
- **Touch vs. Click**: On mobile, touch targets must be at least 44px. On desktop, rely on hover states such as hover:bg-gray-100 to provide cursor feedback.

## 6. Generation and Review Gate

Before delivering generated UI, perform this scan:

1. Reject every banned Anti-Slop pattern unless a specific, documented product or accessibility requirement justifies an exception.
2. Check padding, gap, button proportions, nested radii, typography density, contrast, focus rings, hover states, and mobile touch targets.
3. Confirm that visual hierarchy is created through spacing, typography, semantic tokens, and restrained dividers—not arbitrary decoration.
4. If a rule conflicts with a confirmed product requirement, design-system token, or accessibility requirement, record the conflict and rationale in the feature spec / plan or review record.
5. Treat an unexplained visual shortcut as a defect and revise it before handoff.

This document is intentionally prescriptive. “Looks fine” is not sufficient justification for a deviation; the decision must have a measurable, optical, product, or accessibility rationale.
