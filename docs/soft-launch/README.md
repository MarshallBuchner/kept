# Soft-launch creative pack

Paste-ready assets for Kept TikTok soft posts + first paid test.

## Upload these

| File | Use |
| --- | --- |
| `creative/tiktok-green-live-demo-9x16.mp4` | **Preferred** 9:16 ~18s live Welcome → Get Started → paper Home |
| `creative/tiktok-demo-slideshow.mp4` | Alt 9:16 ~7s stills slideshow |
| `creative/tiktok-static-9x16.png` | TikTok / Reels static |
| `creative/tiktok-static-1x1.png` | Feed square |
| `creative/tiktok-brand-9x16.png` | Brand-only fallback (no UI) |
| `creative/home-green.png` / `home-green-live.png` | Older green-Home screenshots (production Home is paper again; prefer live capture) |
| `creative/welcome-green.png` / `welcome-green-live.png` | Welcome screenshots |
| `creative/og-1200x630.png` | Link preview / OG |
| `creative/kept-mark-512.png` / `kept-icon-1024.png` | Profile avatar |

One-pager: [`MORNING.md`](./MORNING.md) · Launcher: [`LAUNCH.html`](./LAUNCH.html) / `/soft-launch` · Domain: [`DOMAIN.md`](./DOMAIN.md) · Pixel: [`PIXEL.md`](./PIXEL.md) · Ads: [`ADS.md`](./ADS.md)

After DNS, crop out `kept-eosin.vercel.app` and use `keptapp.ca` in captions.

## Captions

See root `README.md` § Soft-launch checklist (Captions A–C + ad primary text).

## Verify after domain / pixel

```bash
./scripts/verify-soft-launch.sh https://keptapp.ca
PIXEL_ID=YOUR_ID ./scripts/verify-soft-launch.sh https://keptapp.ca
```
