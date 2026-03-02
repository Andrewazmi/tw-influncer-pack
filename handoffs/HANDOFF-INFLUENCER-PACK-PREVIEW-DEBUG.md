# Handoff: Influencer Pack + Preview Debug

## Issue Summary
- Goal: Build and deploy a new Salla Twilight component named **Influencer Pack** (`home.influencer-pack`).
- Status:
  - Component implementation is complete in repo `Andrewazmi/tw-influncer-pack` on branch `main`.
  - Component appears in Salla editor settings and accepts data.
  - Storefront runtime check still returns:
    - `document.querySelectorAll('.s-block--influencer-pack').length === 0`
- User-facing symptom: component configured in editor but not visible in storefront preview DOM.

## Root Cause (Current Best Hypothesis)
- The component definition is present and valid, but the rendered storefront document does not include the block.
- Most likely causes:
  1. Preview context mismatch (editor shell vs storefront document/iframe).
  2. Home-page component config not applied to active preview session.
  3. Store preview route/context not the home route where `{% component home %}` renders.
- Evidence:
  - Editor form for Influencer Pack is visible and fields are editable.
  - Console contains mostly unrelated blocked analytics requests (`ERR_BLOCKED_BY_CLIENT`).
  - DOM query for `.s-block--influencer-pack` remains `0`.

## Solution Applied (with commits)
- `98f79c4`  
  Replace Salla starter bundle repo with full Twilight theme implementation including Influencer Pack component and supporting files.
- `d0f189b`  
  Harden Twig rendering defaults in Influencer Pack template to avoid null/undefined edge-case render drops.

### Implemented Files
- Component schema:
  - `twilight.json` (`path: home.influencer-pack`)
- Component template:
  - `src/views/components/home/influencer-pack.twig`
- Component behavior:
  - `src/assets/js/components/influencer-pack.js`
  - `src/assets/js/home.js` (import wiring)
- Component styles:
  - `src/assets/styles/04-components/influencer-pack.scss`
  - `src/assets/styles/app.scss` (import wiring)

## Environment Details
- Main repo (source of truth):
  - `https://github.com/Andrewazmi/tw-influncer-pack`
- Local working path:
  - `/Users/andrewazmi/Documents/4-GitHub/Salla-Components/tw-influncer-pack`
- Local preview clone:
  - `/Users/andrewazmi/Documents/4-GitHub/Salla-Components/tw-influncer-pack-preview`
- Current branch:
  - `main`
- Git remote:
  - `origin https://github.com/Andrewazmi/tw-influncer-pack.git`

## Debugging / Testing Steps
1. Local build checks (already passing):
   - `pnpm install`
   - `pnpm development`
2. Preview startup:
   - `salla login`
   - `salla theme preview --with-editor`
3. In storefront preview console, run one-by-one:
   - `location.host`
   - `location.pathname`
   - `window.top === window.self`
   - `document.querySelectorAll('.s-block').length`
   - `document.querySelectorAll('.s-block--influencer-pack').length`
   - `document.querySelectorAll('[id^="influencer-pack-"]').length`
4. Confirm editor data minimum before save:
   - `show_reels = true`
   - At least one reel item with:
     - `poster` image
     - either valid `video_url` or `youtube_id`
5. Force fresh storefront session:
   - Save component
   - Open preview in standalone tab (outside editor shell)
   - Hard refresh

## Architecture Notes
- Home rendering is standard Twilight:
  - `src/views/pages/index.twig` uses `{% component home %}`
- Influencer Pack is one composite component:
  1. Header
  2. Creator cards
  3. Reels slider
  4. Promo blocks
  5. Picked products
- Media support in v1:
  - External MP4/HLS URL
  - YouTube ID (`lite-youtube`)
- Accessibility/perf implemented:
  - keyboard nav, single active video, reduced-motion respect, lazy media priming.

## Outstanding Items / Next Steps
1. Validate storefront document context:
   - If queries run in editor shell or parent frame, inspect actual storefront frame document.
2. Verify route:
   - Ensure preview is on home (`/`) where home components render.
3. Confirm active theme version:
   - Ensure the pushed `main` commit (`d0f189b`) is the version attached in Salla preview.
4. If still `0` after correct context + route:
   - Capture full HTML around home block container:
     - `document.querySelector('main')?.innerHTML.slice(0, 3000)`
   - Check if other home blocks render.
   - If no home blocks render, issue is higher-level theme preview context, not component logic.

## Related Resources
- Repo:
  - `https://github.com/Andrewazmi/tw-influncer-pack`
- Key commits:
  - `98f79c4`
  - `d0f189b`
- Core files:
  - `twilight.json`
  - `src/views/components/home/influencer-pack.twig`
  - `src/assets/js/components/influencer-pack.js`
  - `src/assets/styles/04-components/influencer-pack.scss`
