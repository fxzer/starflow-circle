/**
 * Circular typography renderer and physics body for the main StarFlow ring.
 */
export class KineticRing {
  constructor(element, settings) {
    this.el = element;
    this.canvas = element.querySelector(".ring-canvas");
    this.hitTarget = element.querySelector(".ring-hit-target");
    this.ctx = this.canvas.getContext("2d");
    this.settings = settings;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = 1;
    this.size = 340;
    this.radius = 136;
    this.fontSize = 22;

    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.spinAngle = -Math.PI / 2;
    this.spinVelocity = 0;
    this.squish = null;
    this.hoverAmount = 0;
    this.overdrive = false;
    this.squeezeCharge = 0;

    this.measureAndLayout();
    this.center();
  }

  measureAndLayout() {
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    const base = Math.max(220, Math.min(480, minSide * 0.54));
    this.size = base * this.scale;
    this.radius = this.size * 0.41;

    // Fit fontSize smoothly to circumference so glyphs never crowd on small phones
    const circumference = Math.PI * 2 * this.radius;
    const charCount = Math.max(40, (this.settings.text || "").length);
    const maxSafeFont = Math.floor((circumference / charCount) * 1.48);
    const idealFont = Math.round((base / 480) * 23 * this.scale);
    this.fontSize = Math.max(9.5, Math.min(idealFont, maxSafeFont));

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pad = 44;
    const canvasSize = this.size + pad * 2;
    this.canvas.width = Math.ceil(canvasSize * this.dpr);
    this.canvas.height = Math.ceil(canvasSize * this.dpr);
    this.canvas.style.width = `${canvasSize}px`;
    this.canvas.style.height = `${canvasSize}px`;
    this.canvas.style.position = "absolute";
    this.canvas.style.left = `${-pad}px`;
    this.canvas.style.top = `${-pad}px`;

    this.el.style.width = `${this.size}px`;
    this.el.style.height = `${this.size}px`;

    const hitPad = 14;
    this.hitTarget.style.left = `${hitPad}px`;
    this.hitTarget.style.top = `${hitPad}px`;
    this.hitTarget.style.width = `${this.size - hitPad * 2}px`;
    this.hitTarget.style.height = `${this.size - hitPad * 2}px`;

    this.clampPosition();
  }

  center() {
    this.x = (window.innerWidth - this.size) / 2;
    this.y = (window.innerHeight - this.size) / 2;
  }

  getCenter() {
    return { x: this.x + this.size / 2, y: this.y + this.size / 2 };
  }

  getCollisionRadius() {
    return this.radius + this.fontSize * 0.52;
  }

  clampPosition() {
    const margin = (this.size - this.getCollisionRadius() * 2) / 2;
    const minX = -margin;
    const minY = -margin;
    const maxX = window.innerWidth - this.size + margin;
    const maxY = window.innerHeight - this.size + margin;
    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
    return { minX, minY, maxX, maxY };
  }

  getBounds() {
    const margin = (this.size - this.getCollisionRadius() * 2) / 2;
    return {
      minX: -margin,
      minY: -margin,
      maxX: window.innerWidth - this.size + margin,
      maxY: window.innerHeight - this.size + margin,
    };
  }

  triggerSquish(angle, amount) {
    this.squish = {
      angle,
      amount: Math.min(0.24, Math.max(0.05, amount)),
      startedAt: performance.now(),
      duration: 240,
    };
  }

  computeGlyphLayout() {
    const raw = this.settings.text.endsWith(" ") ? this.settings.text : `${this.settings.text} `;
    const chars = [...raw];
    this.ctx.save();
    this.ctx.font = `600 ${this.fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif`;
    const widths = chars.map((ch) =>
      Math.max(this.fontSize * 0.34, this.ctx.measureText(ch).width + this.fontSize * 0.12),
    );
    this.ctx.restore();

    const totalAdvance = widths.reduce((sum, w) => sum + w, 0) || 1;
    let cursor = 0;
    const glyphs = chars.map((ch, idx) => {
      const w = widths[idx];
      const angle = ((cursor + w * 0.5) / totalAdvance) * Math.PI * 2;
      cursor += w;
      return { ch, angle };
    });
    return glyphs;
  }

  getWordTokens() {
    const glyphs = this.computeGlyphLayout();
    const tokens = [];
    let current = "";
    let angleSum = 0;
    let count = 0;

    for (const g of glyphs) {
      if (g.ch === " ") {
        if (current) {
          tokens.push({ text: current, angle: angleSum / count });
          current = "";
          angleSum = 0;
          count = 0;
        }
      } else {
        current += g.ch;
        angleSum += g.angle;
        count += 1;
      }
    }
    if (current) {
      tokens.push({ text: current, angle: angleSum / count });
    }
    return tokens;
  }

  render(theme, now, shakeOffset = { x: 0, y: 0 }) {
    const ctx = this.ctx;
    const pad = 44;
    const cx = this.size / 2 + pad;
    const cy = this.size / 2 + pad;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    // Subtle overdrive / squeeze aura
    if (this.overdrive || this.squeezeCharge > 0.04) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, this.radius + this.fontSize * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = this.squeezeCharge > 0.04 ? theme.danger : theme.gold;
      ctx.globalAlpha = this.squeezeCharge > 0.04 ? 0.25 + this.squeezeCharge * 0.65 : 0.45;
      ctx.lineWidth = this.overdrive ? 2.5 : 2 + this.squeezeCharge * 3.5;
      ctx.stroke();
      ctx.restore();
    }

    // Subtle center StarFlow spark (faint at rest, brightens on interaction)
    const sparkAlpha = Math.min(0.9, 0.1 + this.hoverAmount * 0.55 + (this.overdrive ? 0.5 : 0));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.spinAngle * -0.5);
    ctx.fillStyle = this.overdrive ? theme.gold : theme.accent;
    ctx.globalAlpha = sparkAlpha;
    ctx.font = `600 ${Math.round(this.fontSize * 0.85)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", 0, 0);
    ctx.restore();

    // Proportional arc-length circular typography
    const glyphs = this.computeGlyphLayout();
    ctx.save();
    ctx.font = `600 ${this.fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const g of glyphs) {
      if (g.ch === " ") continue;
      const angle = this.spinAngle + g.angle;
      const x = cx + Math.cos(angle) * this.radius;
      const y = cy + Math.sin(angle) * this.radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = g.ch === "✦" || g.ch === "·" ? theme.accent : theme.fg;
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Apply DOM transform (position + squeeze jitter + squish)
    let jitterX = 0;
    let jitterY = 0;
    if (this.squeezeCharge > 0.08) {
      const mag = this.squeezeCharge * 3.8;
      jitterX = (Math.random() - 0.5) * mag;
      jitterY = (Math.random() - 0.5) * mag;
    }

    let squishTransform = "";
    if (this.squish) {
      const p = (now - this.squish.startedAt) / this.squish.duration;
      if (p >= 1) {
        this.squish = null;
      } else {
        const pulse = Math.sin(p * Math.PI) * (1 - p * 0.35);
        const amt = this.squish.amount * pulse;
        const sx = 1 - amt;
        const sy = 1 + amt * 0.72;
        squishTransform = ` rotate(${this.squish.angle}rad) scale(${sx}, ${sy}) rotate(${-this.squish.angle}rad)`;
      }
    }

    this.el.style.transform = `translate3d(${(this.x + shakeOffset.x + jitterX).toFixed(2)}px, ${(this.y + shakeOffset.y + jitterY).toFixed(2)}px, 0)${squishTransform}`;
  }
}
