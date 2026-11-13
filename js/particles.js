/**
 * Background glow, impact ripples, ghost trails, sparks, and interactive popped word sandpile.
 */
export class EffectsEngine {
  constructor(bgCanvas, fxCanvas) {
    this.bgCanvas = bgCanvas;
    this.fxCanvas = fxCanvas;
    this.bgCtx = bgCanvas.getContext("2d");
    this.fxCtx = fxCanvas.getContext("2d");
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.ripples = [];
    this.sparks = [];
    this.trail = [];
    this.wordParticles = [];
    this.popState = null; // null | "popped" | "reassembling"
    this.reassembleStart = 0;
    this.reassembleDuration = 680;
    this.pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
    this.shake = 0;

    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    for (const c of [this.bgCanvas, this.fxCanvas]) {
      c.width = Math.ceil(this.width * this.dpr);
      c.height = Math.ceil(this.height * this.dpr);
      c.style.width = `${this.width}px`;
      c.style.height = `${this.height}px`;
    }
  }

  setPointer(x, y, vx = 0, vy = 0, active = true) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.vx = vx;
    this.pointer.vy = vy;
    this.pointer.active = active;
  }

  addShake(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  addRipple(x, y, maxRadius, color, lineWidth = 2) {
    this.ripples.push({
      x,
      y,
      radius: 10,
      maxRadius,
      alpha: 0.75,
      color,
      lineWidth,
    });
  }

  addSparks(x, y, color, count = 12, speed = 7) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const mag = speed * (0.4 + Math.random() * 0.85);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * mag,
        vy: Math.sin(angle) * mag - 1.5,
        size: 2 + Math.random() * 3.5,
        alpha: 1,
        color,
        gravity: 0.24,
      });
    }
  }

  addTrail(x, y, radius, color) {
    this.trail.push({ x, y, radius, alpha: 0.22, color });
    if (this.trail.length > 8) this.trail.shift();
  }

  triggerWordPop(tokens, centerX, centerY, ringRadius, spinAngle, fontSize, fgColor, accentColor) {
    this.popState = "popped";
    this.wordParticles = tokens.map((token, idx) => {
      const angle = token.angle + spinAngle;
      const px = centerX + Math.cos(angle) * ringRadius;
      const py = centerY + Math.sin(angle) * ringRadius;
      const outSpeed = 4 + Math.random() * 8;
      return {
        text: token.text,
        x: px,
        y: py,
        vx: Math.cos(angle) * outSpeed + (Math.random() - 0.5) * 3,
        vy: Math.sin(angle) * outSpeed - 3 - Math.random() * 4,
        rot: angle + Math.PI / 2,
        vRot: (Math.random() - 0.5) * 0.16,
        targetOffsetAngle: token.angle,
        fontSize,
        color: idx % 3 === 0 ? accentColor : fgColor,
        radius: Math.max(14, token.text.length * fontSize * 0.32),
      };
    });
    this.addSparks(centerX, centerY, accentColor, 24, 10);
    this.addRipple(centerX, centerY, ringRadius * 2.1, accentColor, 3);
    this.addShake(9);
  }

  beginReassemble() {
    if (this.popState !== "popped") return false;
    this.popState = "reassembling";
    this.reassembleStart = performance.now();
    for (const p of this.wordParticles) {
      p.startX = p.x;
      p.startY = p.y;
      p.startRot = p.rot;
    }
    return true;
  }

  update(dt, ringCenter, ringRadius, spinAngle, theme, onReassembled) {
    // Decay shake
    this.shake *= 0.84;
    if (this.shake < 0.1) this.shake = 0;

    // Ripples
    for (let i = this.ripples.length - 1; i >= 0; i -= 1) {
      const r = this.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.16 + 2.5;
      r.alpha *= 0.91;
      if (r.alpha < 0.02 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    // Trail
    for (let i = this.trail.length - 1; i >= 0; i -= 1) {
      this.trail[i].alpha *= 0.82;
      if (this.trail[i].alpha < 0.015) this.trail.splice(i, 1);
    }

    // Sparks
    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const s = this.sparks[i];
      s.vy += s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.97;
      s.alpha *= 0.93;
      if (s.alpha < 0.03 || s.y > this.height + 40) {
        this.sparks.splice(i, 1);
      }
    }

    // Popped word physics
    if (this.popState === "popped") {
      const floorY = this.height - 20;
      for (const p of this.wordParticles) {
        p.vy += 0.42 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;

        // Interactive cursor sweep
        if (this.pointer.active) {
          const dx = p.x - this.pointer.x;
          const dy = p.y - this.pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 76 && dist > 0.1) {
            const force = (1 - dist / 76) * 2.2;
            p.vx += (dx / dist) * force + this.pointer.vx * 0.18;
            p.vy += (dy / dist) * force - 1.6 + this.pointer.vy * 0.14;
            p.vRot += (Math.random() - 0.5) * 0.04;
          }
        }

        // Walls
        if (p.x < p.radius) {
          p.x = p.radius;
          p.vx = Math.abs(p.vx) * 0.65;
        } else if (p.x > this.width - p.radius) {
          p.x = this.width - p.radius;
          p.vx = -Math.abs(p.vx) * 0.65;
        }
        if (p.y > floorY - 8) {
          p.y = floorY - 8;
          p.vy = -Math.abs(p.vy) * 0.48;
          p.vx *= 0.88;
          p.vRot *= 0.85;
          if (Math.abs(p.vy) < 0.6) p.vy = 0;
        }
        p.vx *= 0.992;
      }
    } else if (this.popState === "reassembling") {
      const progress = Math.min(1, (performance.now() - this.reassembleStart) / this.reassembleDuration);
      const ease = 1 - Math.pow(1 - progress, 3);
      for (const p of this.wordParticles) {
        const targetAngle = p.targetOffsetAngle + spinAngle;
        const tx = ringCenter.x + Math.cos(targetAngle) * ringRadius;
        const ty = ringCenter.y + Math.sin(targetAngle) * ringRadius;
        const tRot = targetAngle + Math.PI / 2;
        p.x = p.startX + (tx - p.startX) * ease;
        p.y = p.startY + (ty - p.startY) * ease;
        p.rot = p.startRot + (tRot - p.startRot) * ease;
      }
      if (progress >= 1) {
        this.popState = null;
        this.wordParticles = [];
        this.addRipple(ringCenter.x, ringCenter.y, ringRadius * 1.5, theme.accent, 2);
        onReassembled?.();
      }
    }
  }

  render(ringCenter, ringRadius, theme, squeezeCharge = 0, squeezeEdge = "") {
    // 1. Subtle radial spotlight + faint dot grid on bgCanvas
    const bg = this.bgCtx;
    bg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    bg.clearRect(0, 0, this.width, this.height);

    const grad = bg.createRadialGradient(
      ringCenter.x,
      ringCenter.y,
      ringRadius * 0.15,
      ringCenter.x,
      ringCenter.y,
      Math.max(this.width, this.height) * 0.55,
    );
    grad.addColorStop(0, `${theme.accent}18`);
    grad.addColorStop(0.55, `${theme.fg}05`);
    grad.addColorStop(1, "transparent");
    bg.fillStyle = grad;
    bg.fillRect(0, 0, this.width, this.height);

    // 2. FX Canvas
    const fx = this.fxCtx;
    fx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    fx.clearRect(0, 0, this.width, this.height);

    // Ghost trail
    for (const t of this.trail) {
      fx.save();
      fx.strokeStyle = t.color;
      fx.globalAlpha = t.alpha;
      fx.lineWidth = 1.5;
      fx.beginPath();
      fx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      fx.stroke();
      fx.restore();
    }

    // Ripples
    for (const r of this.ripples) {
      fx.save();
      fx.strokeStyle = r.color;
      fx.globalAlpha = r.alpha;
      fx.lineWidth = r.lineWidth;
      fx.beginPath();
      fx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      fx.stroke();
      fx.restore();
    }

    // Sparks
    for (const s of this.sparks) {
      fx.save();
      fx.fillStyle = s.color;
      fx.globalAlpha = s.alpha;
      fx.beginPath();
      fx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      fx.fill();
      fx.restore();
    }

    // Edge squeeze charge indicator
    if (squeezeCharge > 0.05 && squeezeEdge) {
      fx.save();
      fx.strokeStyle = theme.danger;
      fx.globalAlpha = 0.25 + squeezeCharge * 0.75;
      fx.lineWidth = 3 + squeezeCharge * 5;
      fx.beginPath();
      if (squeezeEdge === "left") {
        fx.moveTo(2, ringCenter.y - ringRadius * squeezeCharge);
        fx.lineTo(2, ringCenter.y + ringRadius * squeezeCharge);
      } else if (squeezeEdge === "right") {
        fx.moveTo(this.width - 2, ringCenter.y - ringRadius * squeezeCharge);
        fx.lineTo(this.width - 2, ringCenter.y + ringRadius * squeezeCharge);
      } else if (squeezeEdge === "top") {
        fx.moveTo(ringCenter.x - ringRadius * squeezeCharge, 2);
        fx.lineTo(ringCenter.x + ringRadius * squeezeCharge, 2);
      } else if (squeezeEdge === "bottom") {
        fx.moveTo(ringCenter.x - ringRadius * squeezeCharge, this.height - 2);
        fx.lineTo(ringCenter.x + ringRadius * squeezeCharge, this.height - 2);
      }
      fx.stroke();
      fx.restore();
    }

    // Popped word particles
    if (this.wordParticles.length > 0) {
      fx.save();
      fx.textAlign = "center";
      fx.textBaseline = "middle";
      for (const p of this.wordParticles) {
        fx.save();
        fx.translate(p.x, p.y);
        fx.rotate(p.rot);
        fx.font = `600 ${p.fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
        fx.fillStyle = p.color;
        fx.fillText(p.text, 0, 0);
        fx.restore();
      }
      fx.restore();
    }
  }
}
