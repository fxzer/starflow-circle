# StarFlow ✦ Kinetic Circle Playground

An interactive kinetic typography playground inspired by [Ian Silber's](https://iansilber.com) homepage, redesigned with advanced kinetic physics, procedural Web Audio synthesis, and a 15-second "Signal Filter" arcade mode.

Crafted by [@star_flow_ai](https://x.com/star_flow_ai).

---

## Features

- **Kinetic Physics Engine**:
  - Drag, fling, and bounce the typography ring against walls with real velocity, boundary damping, and impact deformation (`squish`).
  - Hard wall impacts spawn collectible kinetic word capsules (`AI`, `x-focus`, `LLM`, `Code`, `0→1`).
- **Edge Squeeze & Balloon Pop**:
  - Hold the ring against any screen boundary for ~680ms to build pressure.
  - The ring shatters into individual word particles that settle under gravity.
  - Move your cursor/finger through the fallen words to sweep the sandpile; click anywhere to magnetically reassemble the ring in a spiral vortex.
- **15-Second Arcade Mode ("Signal Filter")**:
  - Double-tap the ring to trigger a 15-second arcade challenge.
  - Sweep the ring across the viewport to smash incoming noise blocks (`SPAM`, `BUG`, `HYPE`, `FOMO`, `SLOP`, `CLICKBAIT`).
  - Score combo multipliers (up to `x5`) and collect golden `✦ SIGNAL` orbs for Overdrive double points.
  - End of round summary card with ranks (`S+ SIGNAL ARCHITECT`, `A+ NOISE ANNIHILATOR`, etc.) and a retro 3-initials local leaderboard.
- **Zero-Dependency Web Audio Synth**:
  - Procedural sound generation for bounces, creaks, balloon pop snaps, smash tones, and arcade fanfare—no external audio files required.
- **Dynamic Contrast Themes**:
  - 8 curated palettes (Obsidian, Klein Blue, OpenAI Emerald, Acid Volt, Cyber Coral, StarFlow Violet, Electric Cyan, Terminal Amber).
- **Hidden Lab Tweaks**:
  - Append `?tweaks` to the URL or press `T` to adjust spin rate, bounce restitution, gravity, and custom ring copy in real time.

---

## Controls

| Action | Control |
| :--- | :--- |
| **Fling Ring** | Click / Touch & Drag |
| **Pop Ring** | Squeeze against screen edge (~680ms) |
| **Sweep Words** | Hover / Drag through popped particles |
| **Reassemble** | Click anywhere on empty space |
| **Start Arcade** | Double-tap / double-click the ring |
| **Toggle Tweaks** | Press `T` (or append `?tweaks`) |
| **Next Theme** | Press `Space` |
| **Mute Audio** | Press `M` |
| **Reset Position** | Press `R` |

---

## Local Run

No build step or external dependencies required. Serve with any static HTTP server:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` in your browser.

---

## License

MIT
