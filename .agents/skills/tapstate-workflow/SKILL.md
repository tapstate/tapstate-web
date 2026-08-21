---
name: tapstate-workflow
description: Use when working in the Tapstate Web repo on feature-scope requirements, UI, IA, routes, i18n, data flow, tests, docs, plans, reviews, or acceptance records. Do not create feature documents for trivial edits, questions, status checks, read-only diagnostics, or single-point documentation changes.
---

# Tapstate Workflow

## Overview

Use the project's workflow as the repo-specific overlay for generic workflow skills. Keep this skill concise: load deeper docs only when the current task reaches that phase.

## Phase Map

Classify the task before entering the workflow. Small tasks can be handled directly with risk-matched verification. Feature-scope tasks use the full workflow below.

1. Intake: for feature-scope tasks, read `docs/workflow/README.md`; read `docs/product/information-architecture.md` only for IA/product-boundary work and `docs/engineering/tech-stack.md` only for engineering constraints; preserve the user's raw request in the spec.
2. Decompose: create or update `docs/workflow/features/YYYY-MM-DD-kebab-name/spec.md` from `docs/workflow/templates/spec.md`.
3. Prototype: for UI, IA, route, or complex interaction work, create or update `docs/workflow/features/YYYY-MM-DD-kebab-name/prototype.md` from `docs/workflow/templates/prototype.md`.
4. Plan: create or update `docs/workflow/features/YYYY-MM-DD-kebab-name/plan.md` from `docs/workflow/templates/plan.md`; include small steps, progress fields, Progress Log, and verification gates.
5. Implement: follow the plan, keep changes scoped, and update step status, file-header progress, and Progress Log as steps complete.
6. Verify and review: run relevant commands from `AGENTS.md`; for UI work, inspect desktop and mobile states.
7. Accept: create or update `docs/workflow/features/YYYY-MM-DD-kebab-name/acceptance.md` from `docs/workflow/templates/acceptance.md`.

## Tapstate Constraints

- User-visible text must use i18next / react-i18next and update `en`, `zh-CN`, and `zh-TW` together.
- UI work must cover loading, empty, error, and success states.
- Use React 19, TanStack Router File Routes, TanStack Query, Zustand, Tailwind CSS, and the existing repo structure.
- Do not add production dependencies unless the spec and plan justify them.
- Treat each `docs/workflow/features/YYYY-MM-DD-kebab-name/` folder as the source of truth for intent, design, execution state, and acceptance.

## References

- `docs/workflow/README.md`: workflow rules and phase gates.
- `docs/workflow/templates/spec.md`: spec template.
- `docs/workflow/templates/prototype.md`: prototype template.
- `docs/workflow/templates/plan.md`: execution plan template.
- `docs/workflow/templates/acceptance.md`: acceptance record template.
