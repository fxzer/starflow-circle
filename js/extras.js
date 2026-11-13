const CAPSULE_WORDS = ["AI", "x-focus", "LLM", "Code", "✦", "0→1"];

/**
 * Floating kinetic pill capsules knocked loose on hard wall bounces.
 */
export class CapsuleManager {
  constructor(stageEl, sound) {
    this.stage = stageEl;
    this.sound = sound;
    this.items = [];
  }

  spawn(x, y, vx, vy) {
    if (this.items.length >= 5) return;
    const label = CAPSULE_WORDS[Math.floor(Math.random() * CAPSULE_WORDS.length)];
    const el = document.createElement("div");
    el.className = "capsule-body";
    el.textContent = label;
    this.stage.appendChild(el);

    const rect = el.getBoundingClientRect();
    const cap = {
      el,
      x: x - rect.width / 2,
      y: y - rect.height / 2,
      w: rect.width,
      h: rect.height,
      vx,
      vy,
      radius: Math.max(rect.width, rect.height) * 0.5,
      drag: null,
    };

    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.sound.unlock();
      el.setPointerCapture(e.pointerId);
      cap.drag = {
        id: e.pointerId,
        offsetX: e.clientX - cap.x,
        offsetY: e.clientY - cap.y,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
      };
    });

    el.addEventListener("pointermove", (e) => {
      if (!cap.drag || cap.drag.id !== e.pointerId) return;
      const now = performance.now();
      const dt = Math.max(8, now - cap.drag.lastT);
      cap.x = e.clientX - cap.drag.offsetX;
      cap.y = e.clientY - cap.drag.offsetY;
      cap.vx = ((e.clientX - cap.drag.lastX) / dt) * 16;
      cap.vy = ((e.clientY - cap.drag.lastY) / dt) * 16;
      cap.drag.lastX = e.clientX;
      cap.drag.lastY = e.clientY;
      cap.drag.lastT = now;
    });

    const endDrag = (e) => {
      if (cap.drag && cap.drag.id === e.pointerId) cap.drag = null;
    };
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    this.items.push(cap);
  }

  clear() {
    while (this.items.length) {
      this.items.pop().el.remove();
    }
  }

  update(dt, ringCenter, ringRadius, ringSpeed) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const cap of this.items) {
      if (!cap.drag) {
        cap.vy += 0.22 * dt;
        cap.x += cap.vx * dt;
        cap.y += cap.vy * dt;
        cap.vx *= 0.992;

        if (cap.x < 8) { cap.x = 8; cap.vx = Math.abs(cap.vx) * 0.85; }
        if (cap.x > w - cap.w - 8) { cap.x = w - cap.w - 8; cap.vx = -Math.abs(cap.vx) * 0.85; }
        if (cap.y < 8) { cap.y = 8; cap.vy = Math.abs(cap.vy) * 0.85; }
        if (cap.y > h - cap.h - 8) {
          cap.y = h - cap.h - 8;
          cap.vy = -Math.abs(cap.vy) * 0.78;
          if (Math.abs(cap.vy) < 0.8) cap.vy = 0;
        }

        const ccx = cap.x + cap.w / 2;
        const ccy = cap.y + cap.h / 2;
        const dx = ccx - ringCenter.x;
        const dy = ccy - ringCenter.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ringRadius + cap.radius;
        if (dist < minDist && dist > 0.1) {
          const nx = dx / dist;
          const ny = dy / dist;
          const push = minDist - dist;
          cap.x += nx * push;
          cap.y += ny * push;
          cap.vx += nx * (3.5 + ringSpeed * 0.35);
          cap.vy += ny * (3.5 + ringSpeed * 0.35);
          this.sound.playBounce(0.22);
        }
      }
      cap.el.style.transform = `translate3d(${cap.x.toFixed(1)}px, ${cap.y.toFixed(1)}px, 0)`;
    }
  }
}

/**
 * Hidden ?tweaks (or 'T' key) live physics and ring text customizer.
 */
export function initTweaksPanel(settings, defaults, storageKey, themeCtrl) {
  const panel = document.querySelector(".tweaks-panel");
  const syncUI = () => {
    panel.querySelectorAll("[data-tweak]").forEach((input) => {
      const key = input.dataset.tweak;
      input.value = settings[key];
      const out = panel.querySelector(`[data-tweak-out="${key}"]`);
      if (out) out.textContent = String(settings[key]);
    });
  };

  if (new URLSearchParams(window.location.search).has("tweaks")) {
    panel.hidden = false;
  }
  syncUI();

  panel.querySelectorAll("[data-tweak]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.tweak;
      settings[key] = input.type === "range" ? Number(input.value) : input.value;
      const out = panel.querySelector(`[data-tweak-out="${key}"]`);
      if (out) out.textContent = String(settings[key]);
      try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch {}
    });
  });

  document.querySelector(".tweaks-close").addEventListener("click", () => {
    panel.hidden = true;
  });
  document.querySelector(".tweak-theme").addEventListener("click", () => themeCtrl.next());
  document.querySelector(".tweak-reset").addEventListener("click", () => {
    Object.assign(settings, defaults);
    try { localStorage.removeItem(storageKey); } catch {}
    themeCtrl.reset();
    syncUI();
  });

  return {
    toggle: () => { panel.hidden = !panel.hidden; },
  };
}
