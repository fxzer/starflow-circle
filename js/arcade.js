const LEADERBOARD_KEY = "starflow-circle-leaderboard-v1";
const SEED_SCORES = [
  { initials: "IAN", score: 185 },
  { initials: "FXJ", score: 150 },
  { initials: "AGI", score: 120 },
  { initials: "ZOE", score: 90 },
  { initials: "KAI", score: 65 },
];

const NOISE_LABELS = ["SPAM", "BUG", "HYPE", "FOMO", "404", "NOISE", "CLICKBAIT", "SLOP"];

/**
 * 15-second "Focus Filter: Smash the Noise" arcade mode triggered by double-tapping the ring.
 */
export class ArcadeMode {
  constructor(fxEngine, sound, themeCtrl) {
    this.fx = fxEngine;
    this.sound = sound;
    this.themeCtrl = themeCtrl;

    this.hud = document.querySelector(".arcade-hud");
    this.timerEl = document.querySelector(".hud-timer");
    this.scoreEl = document.querySelector(".hud-score");
    this.comboEl = document.querySelector(".hud-combo");
    this.burstLayer = document.querySelector(".burst-layer");

    this.modal = document.querySelector(".arcade-modal");
    this.finalScoreEl = document.querySelector(".arcade-final-score");
    this.rankEl = document.querySelector(".arcade-rank");
    this.statsEl = document.querySelector(".arcade-stats");
    this.lbList = document.querySelector(".leaderboard-list");
    this.lbForm = document.querySelector(".leaderboard-form");
    this.initialInputs = [...document.querySelectorAll(".initials-group input")];
    this.shareBtn = document.querySelector(".btn-share");

    this.active = false;
    this.roundOver = false;
    this.score = 0;
    this.hits = 0;
    this.combo = 0;
    this.maxCombo = 1;
    this.lastHitAt = 0;
    this.overdriveUntil = 0;
    this.endsAt = 0;
    this.lastWholeSec = 15;
    this.targets = [];
    this.nextSpawnAt = 0;
    this.lastRoundId = null;

    this.bindModalEvents();
  }

  bindModalEvents() {
    this.initialInputs.forEach((input, idx) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 1);
        if (input.value && idx < this.initialInputs.length - 1) {
          this.initialInputs[idx + 1].focus();
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && idx > 0) {
          this.initialInputs[idx - 1].focus();
        }
      });
    });

    this.lbForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const initials = this.initialInputs.map((i) => i.value || "X").join("").slice(0, 3);
      if (!initials.trim()) return;
      this.saveScore(initials, this.score);
      this.lbForm.hidden = true;
      this.renderLeaderboard();
    });

    this.shareBtn.addEventListener("click", async () => {
      const rank = this.getRank(this.score);
      const txt = `✦ StarFlow Signal Filter: ${this.score} pts (${rank}, max x${this.maxCombo} combo) in 15s!`;
      try {
        await navigator.clipboard.writeText(txt);
        this.shareBtn.textContent = "copied!";
      } catch {
        this.shareBtn.textContent = `${this.score} pts`;
      }
      setTimeout(() => {
        this.shareBtn.textContent = "copy score";
      }, 1500);
    });
  }

  start() {
    this.active = true;
    this.roundOver = false;
    this.score = 0;
    this.hits = 0;
    this.combo = 0;
    this.maxCombo = 1;
    this.lastHitAt = 0;
    this.overdriveUntil = 0;
    this.endsAt = performance.now() + 15000;
    this.lastWholeSec = 15;
    this.targets = [];
    this.nextSpawnAt = 0;
    this.lastRoundId = null;

    this.hud.hidden = false;
    this.modal.hidden = true;
    this.timerEl.classList.remove("is-urgent");
    this.timerEl.textContent = ":15";
    this.scoreEl.textContent = "0";
    this.comboEl.hidden = true;

    for (let i = 0; i < 4; i += 1) {
      this.spawnTarget(i === 3);
    }
  }

  stop() {
    this.active = false;
    this.roundOver = false;
    this.targets = [];
    this.hud.hidden = true;
    this.modal.hidden = true;
    this.overdriveUntil = 0;
  }

  isOverdrive(now = performance.now()) {
    return this.active && now < this.overdriveUntil;
  }

  spawnTarget(preferGold = false) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pad = 68;
    const isGold = preferGold || Math.random() < 0.16;
    const label = isGold
      ? "✦ SIGNAL"
      : NOISE_LABELS[Math.floor(Math.random() * NOISE_LABELS.length)];
    const radius = isGold ? 34 : 28 + Math.min(18, label.length * 2.4);

    let x = pad + Math.random() * Math.max(40, w - pad * 2);
    let y = Math.max(96, pad) + Math.random() * Math.max(40, h - pad * 2 - 48);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const cx = pad + Math.random() * Math.max(40, w - pad * 2);
      const cy = Math.max(96, pad) + Math.random() * Math.max(40, h - pad * 2 - 48);
      const clear = this.targets.every((t) => Math.hypot(t.x - cx, t.y - cy) > 88);
      if (clear) {
        x = cx;
        y = cy;
        break;
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = isGold ? 3.2 : 1.2 + Math.random() * 1.6;

    this.targets.push({
      label,
      isGold,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      scale: 0.48,
      bornAt: performance.now(),
    });
  }

  update(now, dt, ringCenter, ringRadius, ringSpeed) {
    if (!this.active || this.roundOver) return;

    const remainingMs = Math.max(0, this.endsAt - now);
    const wholeSec = Math.ceil(remainingMs / 1000);
    if (wholeSec !== this.lastWholeSec) {
      this.lastWholeSec = wholeSec;
      this.timerEl.textContent = `:${String(wholeSec).padStart(2, "0")}`;
      if (wholeSec <= 5 && wholeSec > 0) {
        this.timerEl.classList.add("is-urgent");
        this.sound.playTick();
      }
    }

    if (remainingMs <= 0) {
      this.finishRound();
      return;
    }

    // Combo decay
    if (this.combo > 0 && now - this.lastHitAt > 1700) {
      this.combo = 0;
      this.comboEl.hidden = true;
    }

    // Maintain target population
    if (this.targets.length < 5 && now >= this.nextSpawnAt) {
      this.spawnTarget(false);
      this.nextSpawnAt = now + 260;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const hitRadius = ringRadius * (this.isOverdrive(now) ? 1.15 : 1);

    for (let i = this.targets.length - 1; i >= 0; i -= 1) {
      const t = this.targets[i];
      t.scale += (1 - t.scale) * 0.28;
      t.x += t.vx * dt;
      t.y += t.vy * dt;

      if (t.x < t.radius + 12 || t.x > w - t.radius - 12) t.vx *= -1;
      if (t.y < t.radius + 72 || t.y > h - t.radius - 12) t.vy *= -1;
      t.x = Math.max(t.radius + 12, Math.min(w - t.radius - 12, t.x));
      t.y = Math.max(t.radius + 72, Math.min(h - t.radius - 12, t.y));

      // Check collision with the main ring
      const dist = Math.hypot(t.x - ringCenter.x, t.y - ringCenter.y);
      if (dist <= hitRadius + t.radius * 0.72) {
        this.handleHit(t, i, now, ringSpeed);
      }
    }
  }

  handleHit(target, index, now, ringSpeed) {
    this.targets.splice(index, 1);
    this.hits += 1;
    this.combo = now - this.lastHitAt <= 1700 ? this.combo + 1 : 1;
    this.lastHitAt = now;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const overdriveMult = this.isOverdrive(now) ? 2 : 1;
    const speedBonus = ringSpeed > 12 ? 5 : 0;
    const basePts = target.isGold ? 25 : 10;
    const gained = (basePts + speedBonus) * Math.min(5, this.combo) * overdriveMult;
    this.score += gained;
    this.scoreEl.textContent = String(this.score);

    if (this.combo > 1) {
      this.comboEl.hidden = false;
      this.comboEl.textContent = `x${Math.min(5, this.combo)}${overdriveMult > 1 ? " ⚡" : ""}`;
      this.comboEl.classList.remove("is-pop");
      void this.comboEl.offsetWidth;
      this.comboEl.classList.add("is-pop");
    }

    if (target.isGold) {
      this.overdriveUntil = now + 2600;
      this.themeCtrl.next();
    }

    const theme = this.themeCtrl.current;
    const burstColor = target.isGold ? theme.gold : theme.danger;
    this.fx.addSparks(target.x, target.y, burstColor, target.isGold ? 22 : 14, target.isGold ? 9 : 6.5);
    this.fx.addRipple(target.x, target.y, target.isGold ? 150 : 90, burstColor, 2.5);
    this.fx.addShake(target.isGold ? 7 : 3.5);
    this.sound.playSmash(this.combo, target.isGold);
    this.spawnFloatingScore(target.x, target.y, `+${gained}`, target.isGold);
  }

  spawnFloatingScore(x, y, text, isGold) {
    const el = document.createElement("div");
    el.className = `score-float${isGold ? " is-gold" : ""}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.burstLayer.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  render(ctx, theme) {
    if (!this.active || this.roundOver) return;
    const now = performance.now();
    for (const t of this.targets) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      const pulse = 1 + Math.sin(now * 0.008 + t.x) * 0.04;
      ctx.scale(pulse, pulse);

      ctx.font = `700 12px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const textWidth = ctx.measureText(t.label).width;
      const w = Math.max(66, textWidth + 26);
      const h = 34;

      ctx.beginPath();
      if (t.isGold) {
        ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
        ctx.shadowColor = theme.gold;
        ctx.shadowBlur = 16;
        ctx.fillStyle = theme.gold;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#050507";
      } else {
        ctx.roundRect(-w / 2, -h / 2, w, h, 10);
        ctx.fillStyle = "rgba(5, 5, 7, 0.62)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.danger;
        ctx.stroke();
        ctx.fillStyle = "#f5f5f7";
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, 0, 1);
      ctx.restore();
    }
  }

  getRank(score) {
    if (score >= 450) return "S+ SIGNAL ARCHITECT";
    if (score >= 280) return "A+ NOISE ANNIHILATOR";
    if (score >= 160) return "B+ FOCUS SNIPER";
    if (score >= 80) return "C+ BUG SMASHER";
    return "SIGNAL INITIATE";
  }

  loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [...SEED_SCORES];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length ? parsed : [...SEED_SCORES];
    } catch {
      return [...SEED_SCORES];
    }
  }

  saveScore(initials, score) {
    const id = `${Date.now()}-${Math.random()}`;
    this.lastRoundId = id;
    const list = this.loadLeaderboard();
    list.push({ initials, score, id });
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, 5);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    } catch {}
  }

  renderLeaderboard() {
    const entries = this.loadLeaderboard().slice(0, 5);
    this.lbList.innerHTML = "";
    entries.forEach((entry, idx) => {
      const li = document.createElement("li");
      if (entry.id && entry.id === this.lastRoundId) li.classList.add("is-me");
      li.innerHTML = `<span class="lb-rank">${idx + 1}.</span><span class="lb-name">${entry.initials}</span><span class="lb-score">${entry.score}</span>`;
      this.lbList.appendChild(li);
    });
  }

  finishRound() {
    this.roundOver = true;
    this.hud.hidden = true;
    this.sound.playGameOver();

    this.finalScoreEl.textContent = String(this.score);
    this.rankEl.textContent = this.getRank(this.score);
    this.statsEl.textContent = `${this.hits} hits · max x${this.maxCombo} combo`;

    const entries = this.loadLeaderboard();
    const qualifies = this.score > 0 && (entries.length < 5 || this.score > entries[entries.length - 1].score);
    this.lbForm.hidden = !qualifies;
    this.renderLeaderboard();
    this.modal.hidden = false;

    if (qualifies) {
      this.initialInputs.forEach((i) => { i.value = ""; });
      setTimeout(() => this.initialInputs[0]?.focus(), 60);
    }
  }
}
