import { ThemeController } from "./themes.js";
import { SoundEngine } from "./audio.js";
import { EffectsEngine } from "./particles.js";
import { KineticRing } from "./ring.js";
import { ArcadeMode } from "./arcade.js";
import { CapsuleManager, initTweaksPanel } from "./extras.js";

const DEFAULT_SETTINGS = {
  text: "starflow · @star_flow_ai · building ai tools & x-focus · drag · squeeze · double-tap ·",
  spinSpeed: 0.45,
  bounce: 0.92,
  friction: 0.982,
  gravity: 0.00035,
  popHoldMs: 680,
};

const TWEAKS_KEY = "starflow-circle-tweaks-v1";

function loadSettings() {
  try {
    const raw = localStorage.getItem(TWEAKS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

(() => {
  const settings = loadSettings();
  const themeCtrl = new ThemeController();
  const sound = new SoundEngine();
  const fx = new EffectsEngine(
    document.querySelector(".bg-canvas"),
    document.querySelector(".fx-canvas"),
  );
  const ringEl = document.querySelector(".ring-body");
  const ring = new KineticRing(ringEl, settings);
  const arcade = new ArcadeMode(fx, sound, themeCtrl);
  const capsules = new CapsuleManager(document.querySelector(".stage"), sound);
  const tweaks = initTweaksPanel(settings, DEFAULT_SETTINGS, TWEAKS_KEY, themeCtrl);

  let bouncesSinceTheme = 0;
  let lastTrailAt = 0;
  let lastTime = performance.now();

  let drag = null;
  let squeezeEdge = "";
  let squeezeStartedAt = 0;
  let lastTapAt = 0;
  let lastTapPos = { x: 0, y: 0 };
  let isHoveringRing = false;

  const enterArcade = () => {
    capsules.clear();
    ring.scale = window.innerWidth < 640 ? 0.86 : 0.78;
    ring.measureAndLayout();
    const center = ring.getCenter();
    fx.addRipple(center.x, center.y, ring.radius * 2.4, themeCtrl.current.accent, 3);
    arcade.start();
  };

  const exitArcade = () => {
    arcade.stop();
    ring.overdrive = false;
    ring.scale = 1;
    ring.measureAndLayout();
  };

  document.querySelector(".btn-replay").addEventListener("click", () => {
    sound.unlock();
    enterArcade();
  });
  document.querySelector(".btn-done").addEventListener("click", () => {
    sound.unlock();
    exitArcade();
  });

  ringEl.addEventListener("pointerenter", () => { isHoveringRing = true; });
  ringEl.addEventListener("pointerleave", () => { isHoveringRing = false; });

  ringEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || fx.popState) return;
    sound.unlock();
    ringEl.setPointerCapture(e.pointerId);
    ringEl.classList.add("is-dragging");

    const now = performance.now();
    drag = {
      pointerId: e.pointerId,
      offsetX: e.clientX - ring.x,
      offsetY: e.clientY - ring.y,
      startX: e.clientX,
      startY: e.clientY,
      startTime: now,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: now,
      moved: false,
    };
    ring.vx = 0;
    ring.vy = 0;
    squeezeEdge = "";
    squeezeStartedAt = 0;
    ring.squeezeCharge = 0;
  });

  ringEl.addEventListener("pointermove", (e) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastTime);
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 9) {
      drag.moved = true;
    }

    const rawX = e.clientX - drag.offsetX;
    const rawY = e.clientY - drag.offsetY;
    const bounds = ring.getBounds();

    if (!arcade.active) {
      const overLeft = bounds.minX - rawX;
      const overRight = rawX - bounds.maxX;
      const overTop = bounds.minY - rawY;
      const overBottom = rawY - bounds.maxY;
      const maxOver = Math.max(overLeft, overRight, overTop, overBottom);
      const nearWallLeft = rawX <= bounds.minX + 2 && e.clientX <= 24;
      const nearWallRight = rawX >= bounds.maxX - 2 && e.clientX >= window.innerWidth - 24;
      const nearWallTop = rawY <= bounds.minY + 2 && e.clientY <= 24;
      const nearWallBottom = rawY >= bounds.maxY - 2 && e.clientY >= window.innerHeight - 24;

      if (maxOver > 8 || nearWallLeft || nearWallRight || nearWallTop || nearWallBottom) {
        const edge =
          nearWallLeft || maxOver === overLeft ? "left"
            : nearWallRight || maxOver === overRight ? "right"
            : nearWallTop || maxOver === overTop ? "top" : "bottom";
        if (squeezeEdge !== edge) {
          squeezeEdge = edge;
          squeezeStartedAt = now;
        }
      } else {
        squeezeEdge = "";
        squeezeStartedAt = 0;
        ring.squeezeCharge = 0;
      }
    }

    ring.x = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
    ring.y = Math.max(bounds.minY, Math.min(bounds.maxY, rawY));

    const vx = ((e.clientX - drag.lastX) / dt) * 16;
    const vy = ((e.clientY - drag.lastY) / dt) * 16;
    ring.vx = ring.vx * 0.35 + vx * 0.65;
    ring.vy = ring.vy * 0.35 + vy * 0.65;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.lastTime = now;
  });

  const releaseRing = (e) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const now = performance.now();
    const wasTap = !drag.moved && now - drag.startTime < 300;
    const idleSinceMove = now - drag.lastTime;

    drag = null;
    squeezeEdge = "";
    squeezeStartedAt = 0;
    ring.squeezeCharge = 0;
    ringEl.classList.remove("is-dragging");

    if (idleSinceMove > 70) {
      ring.vx *= 0.25;
      ring.vy *= 0.25;
    }

    if (wasTap) {
      if (
        now - lastTapAt < 500 &&
        Math.hypot(e.clientX - lastTapPos.x, e.clientY - lastTapPos.y) < 48
      ) {
        lastTapAt = 0;
        if (arcade.active) exitArcade();
        else enterArcade();
      } else {
        lastTapAt = now;
        lastTapPos = { x: e.clientX, y: e.clientY };
        ring.vy = -2.2;
        ring.vx += (Math.random() - 0.5) * 2.4;
        ring.triggerSquish(Math.PI / 2, 0.08);
        sound.playBounce(0.3);
      }
    }
  };

  ringEl.addEventListener("pointerup", releaseRing);
  ringEl.addEventListener("pointercancel", releaseRing);

  document.addEventListener("pointermove", (e) => {
    const prevX = fx.pointer.x < -1000 ? e.clientX : fx.pointer.x;
    const prevY = fx.pointer.y < -1000 ? e.clientY : fx.pointer.y;
    fx.setPointer(e.clientX, e.clientY, e.clientX - prevX, e.clientY - prevY, true);
  }, { passive: true });

  document.addEventListener("pointerdown", () => {
    sound.unlock();
    if (fx.popState === "popped" && fx.beginReassemble()) {
      sound.playReassemble();
    }
  });

  window.addEventListener("wheel", (e) => {
    if (arcade.active || fx.popState) return;
    ring.scale = Math.max(0.55, Math.min(1.45, ring.scale - e.deltaY * 0.0008));
    ring.measureAndLayout();
  }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (document.activeElement?.tagName === "INPUT") return;
    const k = e.key.toLowerCase();
    if (k === "t") tweaks.toggle();
    else if (k === "m") sound.toggleMute();
    else if (k === "r") {
      exitArcade();
      capsules.clear();
      ring.vx = 0;
      ring.vy = 0;
      ring.center();
    } else if (e.code === "Space" && !fx.popState) {
      e.preventDefault();
      ring.vy = -12;
      ring.vx += (Math.random() - 0.5) * 14;
      themeCtrl.next();
      sound.playBounce(0.6);
    }
  });

  window.addEventListener("resize", () => {
    fx.resize();
    ring.measureAndLayout();
  });

  const tick = (now) => {
    const dt = Math.min(2.2, Math.max(0.2, (now - lastTime) / 16.667));
    lastTime = now;

    ring.hoverAmount += ((isHoveringRing || drag ? 1 : 0) - ring.hoverAmount) * 0.14;
    ring.spinVelocity *= 0.96;
    ring.spinAngle += (settings.spinSpeed * 0.012 + ring.spinVelocity) * dt;
    ring.overdrive = arcade.isOverdrive(now);

    if (drag && squeezeEdge && !arcade.active && !fx.popState) {
      ring.squeezeCharge = Math.min(1, (now - squeezeStartedAt) / settings.popHoldMs);
      sound.playSqueezeTick(ring.squeezeCharge);
      if (ring.squeezeCharge >= 1) {
        const c = ring.getCenter();
        fx.triggerWordPop(
          ring.getWordTokens(),
          c.x,
          c.y,
          ring.radius,
          ring.spinAngle,
          ring.fontSize,
          themeCtrl.current.fg,
          themeCtrl.current.accent,
        );
        sound.playPop();
        ringEl.classList.add("is-popped");
        drag = null;
        ringEl.classList.remove("is-dragging");
        squeezeEdge = "";
        ring.squeezeCharge = 0;
        capsules.clear();
      }
    }

    if (!drag && !fx.popState) {
      ring.vy += settings.gravity * 36 * dt;
      ring.x += ring.vx * dt;
      ring.y += ring.vy * dt;
      const dragFactor = Math.pow(settings.friction, dt);
      ring.vx *= dragFactor;
      ring.vy *= dragFactor;

      const bounds = ring.getBounds();
      let hitWall = false;
      let hitAngle = 0;
      let hitSpeed = 0;
      let contactX = ring.getCenter().x;
      let contactY = ring.getCenter().y;

      if (ring.x < bounds.minX) {
        ring.x = bounds.minX;
        hitSpeed = Math.abs(ring.vx);
        ring.vx = hitSpeed * settings.bounce;
        hitWall = true;
        hitAngle = 0;
        contactX = 4;
      } else if (ring.x > bounds.maxX) {
        ring.x = bounds.maxX;
        hitSpeed = Math.abs(ring.vx);
        ring.vx = -hitSpeed * settings.bounce;
        hitWall = true;
        hitAngle = Math.PI;
        contactX = window.innerWidth - 4;
      }

      if (ring.y < bounds.minY) {
        ring.y = bounds.minY;
        hitSpeed = Math.max(hitSpeed, Math.abs(ring.vy));
        ring.vy = Math.abs(ring.vy) * settings.bounce;
        hitWall = true;
        hitAngle = Math.PI / 2;
        contactY = 4;
      } else if (ring.y > bounds.maxY) {
        ring.y = bounds.maxY;
        hitSpeed = Math.max(hitSpeed, Math.abs(ring.vy));
        ring.vy = -Math.abs(ring.vy) * settings.bounce;
        hitWall = true;
        hitAngle = -Math.PI / 2;
        contactY = window.innerHeight - 4;
      }

      if (hitWall && hitSpeed > 1.8) {
        const intensity = Math.min(1, hitSpeed / 22);
        ring.triggerSquish(hitAngle, intensity * 0.22);
        ring.spinVelocity += (Math.random() - 0.5) * intensity * 0.08;
        sound.playBounce(intensity);
        fx.addRipple(contactX, contactY, 50 + intensity * 90, themeCtrl.current.accent, 1.8);

        if (hitSpeed > 8) {
          fx.addSparks(contactX, contactY, themeCtrl.current.accent, 6, 4.5);
          bouncesSinceTheme += 1;
          if (bouncesSinceTheme >= 2 && !arcade.active) {
            bouncesSinceTheme = 0;
            themeCtrl.next();
          }
        }
        if (!arcade.active && hitSpeed > 14 && Math.random() < 0.65) {
          capsules.spawn(
            contactX,
            contactY,
            (window.innerWidth / 2 - contactX) * 0.015 + (Math.random() - 0.5) * 4,
            -4 - Math.random() * 4,
          );
        }
      }
    }

    const center = ring.getCenter();
    const speed = Math.hypot(ring.vx, ring.vy);

    if (!fx.popState && speed > 7 && now - lastTrailAt > 24) {
      lastTrailAt = now;
      fx.addTrail(center.x, center.y, ring.radius, themeCtrl.current.accent);
    }

    capsules.update(dt, center, ring.getCollisionRadius(), speed);
    arcade.update(now, dt, center, ring.getCollisionRadius(), speed);
    fx.update(dt, center, ring.radius, ring.spinAngle, themeCtrl.current, () => {
      ringEl.classList.remove("is-popped");
    });

    const shakeOffset = fx.shake > 0.2
      ? { x: (Math.random() - 0.5) * fx.shake, y: (Math.random() - 0.5) * fx.shake }
      : { x: 0, y: 0 };

    fx.render(center, ring.radius, themeCtrl.current, ring.squeezeCharge, squeezeEdge);
    arcade.render(fx.fxCtx, themeCtrl.current);
    if (!fx.popState) ring.render(themeCtrl.current, now, shakeOffset);

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
})();
