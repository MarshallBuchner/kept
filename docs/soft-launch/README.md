# Soft-launch creative pack

Paste-ready assets for Kept TikTok soft posts + first paid test.

## Upload these

| File | Use |
| --- | --- |
| `creative/tiktok-demo-slideshow.mp4` | **Preferred** 9:16 ~7s Welcome → Home → brand static (upload to TikTok / Ads) |
| `creative/tiktok-static-9x16.png` | TikTok / Reels static |
| `creative/tiktok-static-1x1.png` | Feed square |
| `creative/tiktok-brand-9x16.png` | Brand-only fallback (no UI) |
| `creative/home-green.png` | Raw Home screenshot (merge PR #23 first for production to match) |
| `creative/welcome-green.png` | Raw Welcome screenshot |
| `creative/og-1200x630.png` | Link preview / OG |
| `creative/kept-mark-512.png` / `kept-icon-1024.png` | Profile avatar |

After DNS, re-export or crop out `kept-eosin.vercel.app` and use `keptapp.ca` in captions.

## Captions

See root `README.md` § Soft-launch checklist (Captions A–C + ad primary text).

## Verify after domain / pixel

```bash
./scripts/verify-soft-launch.sh https://keptapp.ca
PIXEL_ID=YOUR_ID ./scripts/verify-soft-launch.sh https://keptapp.ca
```
