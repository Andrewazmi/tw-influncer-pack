# Arrow Direction and Preview Guide

This guide documents the correct implementation and validation flow for reel/TikTok arrows and hot reload preview.

## Visual Requirement (Non-Negotiable)

- Arrows must render visually as `<>` by on-screen button position.
- Left button must look like `<`.
- Right button must look like `>`.
- This must remain true in both LTR and RTL pages.

## Root Cause We Kept Hitting

- We mixed semantic direction (`prev`/`next`) with visual side in RTL.
- In RTL, button order is mirrored, so semantic mapping can visually become `><` if not handled explicitly.
- TikTok icon classes are visually inverted compared to their class names in this context.

## Correct Source of Truth

### Reel component

- File: `src/assets/js/components/influencer-pack.js`
- Function: `syncNavIcons(navPrev, navNext, _isRtl)`
- Use position-based visual mapping:
  - `prev` button (left in LTR, right in RTL) gets:
    - LTR: `<`
    - RTL: `>`
  - `next` button gets the opposite.
- Current working mapping:
  - `prevChar = _isRtl ? '›' : '‹'`
  - `nextChar = _isRtl ? '‹' : '›'`
  - `prevIconClass = _isRtl ? 'sicon-keyboard_arrow_left' : 'sicon-keyboard_arrow_right'`
  - `nextIconClass = _isRtl ? 'sicon-keyboard_arrow_right' : 'sicon-keyboard_arrow_left'`

### TikTok component

- File: `src/assets/js/components/influencer-pack-tiktok.js`
- Function: `syncNavIcons(navPrev, navNext, isRtl)`
- Use same position-based rule and keep Salla icon inversion in mind.
- Current working mapping:
  - `prevIcon.className = isRtl ? 'sicon-keyboard_arrow_left' : 'sicon-keyboard_arrow_right'`
  - `nextIcon.className = isRtl ? 'sicon-keyboard_arrow_right' : 'sicon-keyboard_arrow_left'`

## Preview Validation (Must Do This, Not CDN Draft Only)

Always validate from preview URL that includes local assets:

- `assets_url=http://localhost:<assets_port>`
- `ws_port=<ws_port>`
- add cache buster `&cb=<timestamp>`

If you test on a plain draft URL without `assets_url`, you may see stale CDN assets and false results.

## Fast Verification Checklist

1. Run preview script: `./preview.local.sh`
2. Copy the **Fixed Preview URL** from script output.
3. Confirm page loads `app.css` and `home.js` from `localhost` (not `/themes/draft/...` CDN only).
4. Check both components:
   - Reel arrows: visually `<>`
   - TikTok arrows: visually `<>`
5. Make one tiny CSS/JS change and confirm hot reload updates.

## Files To Touch When Fixing Arrows

- `src/assets/js/components/influencer-pack.js`
- `src/assets/js/components/influencer-pack-tiktok.js`
- Rebuild output updates `public/home.js`

Do not assume Twig icon class names alone are enough; final visual output is decided after RTL and icon-font behavior.
