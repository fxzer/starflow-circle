export const COLOR_THEMES = [
  { name: "Obsidian", bg: "#050507", fg: "#f5f5f7", accent: "#38bdf8", danger: "#ff3b30", gold: "#ffd60a" },
  { name: "Klein Blue", bg: "#0f28ff", fg: "#ffffff", accent: "#ffd60a", danger: "#ff3b30", gold: "#fff066" },
  { name: "OpenAI Emerald", bg: "#022c22", fg: "#ecfdf5", accent: "#34d399", danger: "#fb7185", gold: "#fde047" },
  { name: "Acid Volt", bg: "#d7ff00", fg: "#0a0a0c", accent: "#ff006e", danger: "#d90429", gold: "#111111" },
  { name: "Cyber Coral", bg: "#ff3b30", fg: "#ffffff", accent: "#ffe600", danger: "#111111", gold: "#fff59d" },
  { name: "StarFlow Violet", bg: "#4c1d95", fg: "#faf5ff", accent: "#38bdf8", danger: "#fb7185", gold: "#fde047" },
  { name: "Electric Cyan", bg: "#00d9ff", fg: "#04121a", accent: "#ff006e", danger: "#d90429", gold: "#111111" },
  { name: "Terminal Amber", bg: "#120d05", fg: "#ffb000", accent: "#38bdf8", danger: "#ff453a", gold: "#ffffff" },
];

export class ThemeController {
  constructor() {
    this.index = 0;
    this.apply(COLOR_THEMES[0]);
  }

  get current() {
    return COLOR_THEMES[this.index];
  }

  next() {
    this.index = (this.index + 1) % COLOR_THEMES.length;
    this.apply(this.current);
    return this.current;
  }

  reset() {
    this.index = 0;
    this.apply(this.current);
    return this.current;
  }

  apply(theme) {
    const root = document.documentElement;
    root.style.setProperty("--page-bg", theme.bg);
    root.style.setProperty("--page-fg", theme.fg);
    root.style.setProperty("--page-accent", theme.accent);
    root.style.setProperty("--page-danger", theme.danger);
    root.style.setProperty("--page-gold", theme.gold);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);
  }
}
