# sabinpokhrel76.github.io

Personal site of **Sabin Pokhrel**, Mathematics and Science teacher in Dharan, Nepal, and BSc Statistics graduate (Central Campus of Technology, 2026).

**Live:** https://sabinpokhrel76.github.io

## What is on the page

- **Galton board**: balls fall through pegs and pile up into a bell curve. Tap it to drop 40 more.
- **Photo**: built from falling dots, then the real photo fades in. Tap it to replay.
- **Experience and study**: teaching jobs and study on one time axis, drawn when it scrolls into view.
- **Project work**: *Factors associated with childhood stunting in Nepal* (NDHS 2022), with a forest plot of the adjusted odds ratios. Tap a row to read it.
- **Dark and light theme**: the button at the top right; the choice is remembered.

## Files

| File | What it does |
|---|---|
| `index.html` | All markup and CSS |
| `board.js` | Galton board on a canvas |
| `photo.js` | Falling-dot photo |
| `timeline.js` | Timeline draw on scroll |
| `forest.js` | Forest plot of the project's odds ratios |
| `photo.jpg` | Profile photo |

No framework and no build step. Fonts come from Google Fonts.

## Run it locally

```bash
python3 -m http.server 8765
# open http://127.0.0.1:8765
```
