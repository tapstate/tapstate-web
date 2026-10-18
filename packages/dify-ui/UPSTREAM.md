# Vendored UI source

Source: `langgenius/dify`, `packages/dify-ui`, revision `3552815c89415716dfd9cac80fd7c73aac3b051e` (2026-10-17).

The original `src/` and component contract guides are copied from that revision. Test and Storybook files are omitted from this consumer package. `src/search-input/` additionally comes from upstream `web/app/components/base/search-input/` at the same revision; `use-search-input.ts` only changes its relative import, while `index.tsx` takes translated search/clear labels as props instead of importing Dify's application i18n. The upstream modified Apache license is preserved in `LICENSE`. Keep this record and the license when updating the source. Review the license conditions before deploying source-derived UI in a multi-tenant service or changing original frontend branding/copyright material.

Tapstate branding, navigation, app shells, product copy, and business screens are owned by Tapstate. Product-specific integrations and theme overrides belong outside this vendored package so upstream changes remain reviewable.
