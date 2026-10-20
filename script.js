(() => {
  'use strict';

  const canvas = document.getElementById('garden');
  const ctx = canvas.getContext('2d');
  const body = document.body;
  const root = document.documentElement;
  const overlay = document.getElementById('overlay');
  const card = document.getElementById('card');
  const heroBtn = document.getElementById('heroBtn');
  const closeBtn = document.getElementById('closeBtn');
  const reopenBtn = document.getElementById('reopenBtn');
  const replayBtn = document.getElementById('replayBtn');

  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
  const P = (r, a) => [Math.cos(a) * r, Math.sin(a) * r];
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STEM = '#3f7d3e';
  const PALETTES = {
    pink:  { light: '#fcd3dd', base: '#f4a0b6', dark: '#e27896', line: '#bb5576', w: 30 },
    rose:  { light: '#fbc6d2', base: '#ee88a3', dark: '#d65f86', line: '#a94266', w: 14 },
    peach: { light: '#fdd9c2', base: '#f7ae88', dark: '#ea8a61', line: '#c06846', w: 20 },
    green: { light: '#eef7cd', base: '#cfe894', dark: '#a6ce67', line: '#7aa948', w: 17 },
    blue:  { light: '#d9e9fb', base: '#a6c8ef', dark: '#7aaae1', line: '#5180bc', w: 10 },
    cream: { light: '#ffffff', base: '#f3ece3', dark: '#d6cabd', line: '#a99a8a', w: 8 },
  };
  const HERO_PAL = { light: '#fdd3dd', base: '#f49cb3', dark: '#e26f91', line: '#bd4d72' };
  const BUD_KEYS = ['pink', 'blue', 'peach', 'rose'];
  const HERO_D = 0.46; // depth at which the hero rose sits inside the garden

  /* ---------------- Sprites ---------------- */

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // Angular outer petal layer: a jittered polygon with slightly bulging edges.
  function outerLayer(g, pal, R, r, n) {
    const rot = rnd(0, TAU);
    const pts = [];
    for (let j = 0; j < n; j++) {
      pts.push({ a: rot + (j * TAU) / n + rnd(-0.12, 0.12), r: r * rnd(0.93, 1.02) });
    }
    const path = () => {
      g.beginPath();
      pts.forEach((p, j) => {
        const q = pts[(j + 1) % n];
        let qa = q.a;
        if (qa < p.a) qa += TAU;
        if (!j) g.moveTo(...P(p.r, p.a));
        const ma = (p.a + qa) / 2;
        const mr = ((p.r + q.r) / 2) * Math.cos((qa - p.a) / 2) * rnd(1.03, 1.08);
        g.quadraticCurveTo(...P(mr, ma), ...P(q.r, q.a));
      });
      g.closePath();
    };
    const grad = g.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
    grad.addColorStop(0, pal.dark);
    grad.addColorStop(0.55, pal.base);
    grad.addColorStop(1, pal.light);
    g.save();
    g.shadowColor = rgba(pal.line, 0.4);
    g.shadowBlur = R * 0.06;
    g.shadowOffsetY = R * 0.012;
    path();
    g.fillStyle = grad;
    g.fill();
    g.restore();
    path();
    g.strokeStyle = rgba(pal.line, 0.45);
    g.lineWidth = Math.max(0.8, R * 0.012);
    g.stroke();
    g.save();
    g.scale(0.965, 0.965);
    path();
    g.restore();
    g.strokeStyle = rgba(pal.light, 0.85);
    g.lineWidth = Math.max(0.8, R * 0.016);
    g.stroke();
  }

  // One crescent petal of the inner spiral: a light rim with shading falling toward the heart.
  function innerPetal(g, pal, R, rr, a0, a1) {
    const steps = 28;
    const wob = rnd(0, TAU);
    const rim = [], base = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const a = lerp(a0, a1, t);
      const rad = rr * (0.94 + 0.12 * t) * (1 + 0.025 * Math.sin(t * Math.PI * 3 + wob));
      const thick = 0.34 * Math.pow(Math.sin(Math.PI * t), 0.55);
      rim.push(P(rad, a));
      base.push(P(rad * (1 - thick), a));
    }
    const grad = g.createRadialGradient(0, 0, rr * 0.7, 0, 0, rr * 1.04);
    grad.addColorStop(0, pal.dark);
    grad.addColorStop(0.6, pal.base);
    grad.addColorStop(1, pal.light);

    g.save();
    g.shadowColor = rgba(pal.line, 0.5);
    g.shadowBlur = R * 0.045;
    g.beginPath();
    g.moveTo(...rim[0]);
    for (let k = 1; k <= steps; k++) g.lineTo(...rim[k]);
    for (let k = steps; k >= 0; k--) g.lineTo(...base[k]);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
    g.restore();

    g.beginPath();
    g.moveTo(...rim[0]);
    for (let k = 1; k <= steps; k++) g.lineTo(...rim[k]);
    g.strokeStyle = rgba(pal.light, 0.88);
    g.lineWidth = Math.max(0.9, R * 0.022);
    g.stroke();
  }

  // A layered "paper" rose seen from above. R is the radius in device pixels.
  function makeRose(pal, R) {
    const S = R * 2.5;
    const c = makeCanvas(S, S);
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.lineJoin = 'round';
    g.lineCap = 'round';

    // sepal tips peeking out from behind
    g.fillStyle = '#3d7c40';
    const so = rnd(0, TAU);
    for (let i = 0; i < 5; i++) {
      const a = so + i * TAU / 5 + rnd(-0.25, 0.25);
      g.beginPath();
      g.moveTo(...P(R * 0.78, a - 0.13));
      g.quadraticCurveTo(...P(R * 1.0, a - 0.02), ...P(R * 1.1, a + 0.02));
      g.lineTo(...P(R * 0.78, a + 0.13));
      g.fill();
    }

    outerLayer(g, pal, R, R, 8 + ((Math.random() * 3) | 0));
    outerLayer(g, pal, R, R * 0.9, 8 + ((Math.random() * 2) | 0));
    outerLayer(g, pal, R, R * 0.8, 7 + ((Math.random() * 2) | 0));

    const rings = 7;
    for (let i = 0; i < rings; i++) {
      const rr = R * lerp(0.7, 0.13, i / (rings - 1));
      const segs = i < 4 ? 3 : 2;
      const start = rnd(0, TAU);
      const span = TAU / segs;
      for (let s = 0; s < segs; s++) {
        const a0 = start + s * span;
        innerPetal(g, pal, R, rr, a0, a0 + span + rnd(0.45, 0.8));
      }
    }

    // the heart of the rose
    const heart = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.11);
    heart.addColorStop(0, pal.line);
    heart.addColorStop(1, rgba(pal.dark, 0));
    g.fillStyle = heart;
    g.beginPath();
    g.arc(0, 0, R * 0.11, 0, TAU);
    g.fill();
    g.strokeStyle = rgba(pal.light, 0.9);
    g.lineWidth = Math.max(0.9, R * 0.02);
    g.beginPath();
    const a0 = rnd(0, TAU);
    for (let i = 0; i <= 30; i++) {
      const rr = R * (0.015 + i * 0.0022);
      const a = a0 + i * 0.3;
      i ? g.lineTo(...P(rr, a)) : g.moveTo(...P(rr, a));
    }
    g.stroke();

    return { c, R, blur: makeBlurred(c) };
  }

  // Cheap cross-browser blur: shrink, then scale back up with smoothing.
  function makeBlurred(src) {
    const f = 7;
    const small = makeCanvas(src.width / f, src.height / f);
    const sg = small.getContext('2d');
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(src, 0, 0, small.width, small.height);
    const out = makeCanvas(src.width, src.height);
    const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(small, 0, 0, out.width, out.height);
    return out;
  }

  // Closed rosebud, origin at its base. h is the bud height in device pixels.
  function makeBud(pal, h) {
    const c = makeCanvas(h * 0.95, h * 1.18);
    const g = c.getContext('2d');
    const ox = c.width / 2, oy = h * 1.08;
    g.translate(ox, oy);
    g.lineJoin = 'round';
    const bw = h * 0.34;

    const grad = g.createLinearGradient(0, -h, 0, 0);
    grad.addColorStop(0, pal.dark);
    grad.addColorStop(0.4, pal.base);
    grad.addColorStop(0.85, '#fdfaf6');
    grad.addColorStop(1, '#f1ece4');

    g.save();
    g.shadowColor = 'rgba(60,60,60,0.18)';
    g.shadowBlur = h * 0.06;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-bw * 1.3, -h * 0.25, -bw * 0.95, -h * 0.82, 0, -h);
    g.bezierCurveTo(bw * 0.95, -h * 0.82, bw * 1.3, -h * 0.25, 0, 0);
    g.fillStyle = grad;
    g.fill();
    g.restore();
    g.strokeStyle = rgba(pal.line, 0.45);
    g.lineWidth = Math.max(0.8, h * 0.018);
    g.stroke();

    // wrapping front petal
    const grad2 = g.createLinearGradient(-bw, -h, bw * 0.4, 0);
    grad2.addColorStop(0, pal.base);
    grad2.addColorStop(0.55, pal.light);
    grad2.addColorStop(1, '#ffffff');
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-bw * 1.25, -h * 0.3, -bw * 0.85, -h * 0.78, -bw * 0.05, -h * 0.93);
    g.bezierCurveTo(bw * 0.25, -h * 0.6, bw * 0.4, -h * 0.22, 0, 0);
    g.fillStyle = grad2;
    g.fill();
    g.strokeStyle = rgba(pal.line, 0.4);
    g.stroke();

    // sepals
    g.fillStyle = '#4a964d';
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-bw * 1.25, -h * 0.12, -bw * 0.95, -h * 0.55);
    g.quadraticCurveTo(-bw * 0.35, -h * 0.22, 0, 0);
    g.moveTo(0, 0);
    g.quadraticCurveTo(bw * 1.25, -h * 0.12, bw * 0.9, -h * 0.5);
    g.quadraticCurveTo(bw * 0.35, -h * 0.2, 0, 0);
    g.moveTo(0, 0);
    g.quadraticCurveTo(-bw * 0.25, -h * 0.2, bw * 0.05, -h * 0.36);
    g.quadraticCurveTo(bw * 0.25, -h * 0.15, 0, 0);
    g.fill();
    g.beginPath();
    g.ellipse(0, -h * 0.02, bw * 0.28, h * 0.06, 0, 0, TAU);
    g.fill();

    return { c, ox, oy, h };
  }

  // Leaf pointing right, origin at its left tip (middle of the canvas height).
  function makeLeaf() {
    const L = 120;
    const c = makeCanvas(L, L * 0.6);
    const g = c.getContext('2d');
    g.translate(0, L * 0.3);
    const grad = g.createLinearGradient(0, -L * 0.25, 0, L * 0.25);
    grad.addColorStop(0, '#62b05f');
    grad.addColorStop(1, '#357f3d');
    g.beginPath();
    g.moveTo(1, 0);
    g.bezierCurveTo(L * 0.25, -L * 0.3, L * 0.68, -L * 0.29, L - 1, 0);
    g.bezierCurveTo(L * 0.68, L * 0.24, L * 0.25, L * 0.27, 1, 0);
    g.fillStyle = grad;
    g.fill();
    g.strokeStyle = 'rgba(30,80,35,0.45)';
    g.lineWidth = 1.5;
    g.stroke();
    g.beginPath();
    g.moveTo(L * 0.05, 0);
    g.quadraticCurveTo(L * 0.5, -L * 0.03, L * 0.9, 0);
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 2;
    g.stroke();
    return c;
  }

  /* ---------------- Layout ---------------- */

  let W = 0, H = 0, DPR = 1, unit = 40;
  let sprites = null, spriteKey = '';
  let hero = null;
  let flowers = [];
  let leafSprite = null;
  let dirty = true;

  const state = {
    phase: 'intro',   // intro → growing → grown → (retract → growing → grown)
    introT0: 0,
    gardenT0: 0,
    gardenEnd: 0,
    retractT0: 0,
    retractFrom: 0,
    cardSeen: false,
    cardOpen: false,
    cardOpenedAt: 0,
  };

  function buildSprites() {
    const key = `${Math.round(unit)}|${DPR}`;
    if (key === spriteKey && sprites) return;
    spriteKey = key;
    const roseR = Math.round(clamp(unit * 1.3 * DPR, 40, 170));
    const budH = Math.round(clamp(unit * 1.05 * DPR, 26, 120));
    sprites = { roses: {}, buds: {} };
    for (const k of Object.keys(PALETTES)) {
      sprites.roses[k] = [0, 1, 2].map(() => makeRose(PALETTES[k], roseR));
    }
    for (const k of BUD_KEYS) {
      sprites.buds[k] = [0, 1].map(() => makeBud(PALETTES[k], budH));
    }
    sprites.hero = makeRose(HERO_PAL, Math.round(clamp(heroRadius() * DPR * 1.08, 60, 280)));
    if (!leafSprite) leafSprite = makeLeaf();
  }

  function heroRadius() { return clamp(unit * 1.75, 58, 130); }

  function pickPalette() {
    let total = 0;
    for (const k in PALETTES) total += PALETTES[k].w;
    let r = Math.random() * total;
    for (const k in PALETTES) { r -= PALETTES[k].w; if (r <= 0) return k; }
    return 'pink';
  }

  function makeHero() {
    const r = heroRadius();
    const y = H * (W > H ? 0.47 : 0.45);
    hero = {
      type: 'rose', hero: true,
      x: W / 2, y, r, d: HERO_D, leafOff: r * 0.92,
      spr: sprites.hero,
      stemW: Math.max(2, r * 0.034),
      stemDur: 1.5, bloomDur: 1.2, spin: -1.1,
      bend: 0.04, lean: 0, sway: r * 0.03, swaySpeed: 0.7, phase: 0,
      alpha: 1,
      leaves: [
        { t: 0.03, side: -1, len: r * 0.62, ang: 0.22 },
        { t: 0.3, side: 1, len: r * 0.6, ang: 0.4 },
      ],
      pulseT0: -10,
    };
    root.style.setProperty('--hero-x', `${hero.x}px`);
    root.style.setProperty('--hero-y', `${hero.y}px`);
    root.style.setProperty('--hero-r', `${r}px`);
    const gap = Math.max(26, r * 0.42);
    root.style.setProperty('--intro-bottom', `${H - (hero.y - r) + gap}px`);
  }

  function makeGarden() {
    flowers = [];
    const bandTop = H * 0.4;
    const avg = unit * 0.75;
    const n = Math.round(clamp((2.5 * W * (H - bandTop)) / (Math.PI * avg * avg), 50, 230));
    const heroBottom = hero.y + hero.r * 1.02;

    for (let i = 0; i < n; i++) {
      const d = Math.pow(Math.random(), 0.85);
      const isBud = Math.random() < 0.09;
      let r = unit * lerp(0.48, 1.18, d) * rnd(0.86, 1.14);
      let y = lerp(H * 0.43, H * 0.94, d) + rnd(-0.5, 0.5) * unit;
      const x = rnd(-0.04, 1.04) * W;
      if (isBud) { r *= 0.5; y -= unit * rnd(0.4, 1.3); }

      // keep the hero's blossom clear of anything drawn in front of it
      if (d > HERO_D && Math.abs(x - hero.x) < hero.r + r * 0.8 && y - r < heroBottom) {
        y = heroBottom + r * rnd(0.55, 1.1);
      }

      const pk = isBud ? BUD_KEYS[(Math.random() * BUD_KEYS.length) | 0] : pickPalette();
      const variants = isBud ? sprites.buds[pk] : sprites.roses[pk];
      const leaves = [];
      const nl = isBud ? (Math.random() < 0.6 ? 1 : 0) : (Math.random() < 0.55 ? 2 : 1);
      let side = Math.random() < 0.5 ? -1 : 1;
      for (let j = 0; j < nl; j++) {
        leaves.push({
          t: rnd(0.02, 0.14) + j * rnd(0.1, 0.22),
          side,
          len: (isBud ? unit * 0.5 : r) * rnd(0.55, 0.85),
          ang: rnd(0.25, 0.75),
        });
        side = -side;
      }

      flowers.push({
        type: isBud ? 'bud' : 'rose',
        x, y, r, d,
        leafOff: isBud ? unit * 0.1 : r * 0.8,
        spr: variants[(Math.random() * variants.length) | 0],
        stemW: Math.max(1.1, (isBud ? unit * 0.6 : r) * 0.05),
        delay: 0.1 + d * 1.25 + rnd(0, 0.85),
        stemDur: rnd(0.75, 1.15),
        bloomDur: rnd(0.65, 0.9),
        spin: rnd(-1.2, 1.2),
        bend: rnd(-0.22, 0.22),
        lean: rnd(-0.5, 0.5) * r * 0.5,
        sway: r * rnd(0.03, 0.06),
        swaySpeed: rnd(0.55, 1.05),
        phase: rnd(0, TAU),
        budTilt: rnd(-0.18, 0.18),
        alpha: lerp(0.86, 1, d),
        leaves,
      });
    }
    flowers.sort((a, b) => a.d - b.d);
    state.gardenEnd = flowers.reduce((m, f) => Math.max(m, f.delay + f.stemDur * 0.55 + f.bloomDur), 0);
  }

  function resize(force) {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const big = force || dpr !== DPR || Math.abs(w - W) > 1 || Math.abs(h - H) > H * 0.18;
    W = w; H = h; DPR = dpr;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    if (big) {
      unit = Math.min(Math.max(W * 0.045, 34), H * 0.075);
      buildSprites();
      makeHero();
      makeGarden();
    }
    dirty = true;
  }

  /* ---------------- Drawing ---------------- */

  function drawLeaf(x, y, lf, grow) {
    if (grow <= 0) return;
    const L = lf.len * easeOutBack(grow);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(lf.side, 1);
    ctx.rotate(-lf.ang);
    ctx.drawImage(leafSprite, 0, -L * 0.3, L, L * 0.6);
    ctx.restore();
  }

  function drawFlower(f, t, now) {
    if (t <= 0) return;
    const ps = easeOutCubic(clamp(t / f.stemDur));
    const baseY = H + 6;
    const sw = reduceMotion ? 0 : Math.sin(now * f.swaySpeed + f.phase) * f.sway;
    const topY = lerp(baseY, f.y, ps);
    const topX = f.x + (f.lean + sw) * ps;
    const len = baseY - topY;
    const cx = f.x + f.bend * len * 0.18 + (f.lean + sw) * 0.35 * ps;
    const cy = baseY - len * 0.5;

    ctx.globalAlpha = f.alpha;
    ctx.strokeStyle = STEM;
    ctx.lineWidth = f.stemW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.x, baseY);
    ctx.quadraticCurveTo(cx, cy, topX, topY);
    ctx.stroke();

    for (const lf of f.leaves) {
      const ly = f.y + f.leafOff + (baseY - f.y - f.leafOff) * lf.t;
      if (topY >= ly) continue;
      const u = (baseY - ly) / len;
      const lx = (1 - u) * (1 - u) * f.x + 2 * u * (1 - u) * cx + u * u * topX;
      drawLeaf(lx, ly, lf, clamp((ly - topY) / (f.r * 1.3 + 10)));
    }

    const ph = clamp((t - f.stemDur * 0.55) / f.bloomDur);
    if (ph <= 0) { ctx.globalAlpha = 1; return; }

    let s = easeOutBack(ph);
    if (f.hero) {
      const since = now - f.pulseT0;
      if (since < 0.7) s *= 1 + 0.09 * Math.sin(Math.PI * (since / 0.7));
      else if (state.phase === 'intro' && ph >= 1 && !reduceMotion) s *= 1 + 0.018 * Math.sin(now * 2.4);
    }
    const alpha = clamp(ph * 2.2) * f.alpha;
    const rot = (1 - easeOutCubic(ph)) * f.spin + sw * 0.004;

    ctx.save();
    ctx.translate(topX, topY);
    if (f.type === 'rose') {
      ctx.rotate(rot);
      const k = (f.r / f.spr.R) * s;
      const S = f.spr.c.width * k;
      const sharp = smooth(0.2, 0.95, ph);
      if (sharp < 1) {
        ctx.globalAlpha = alpha * (1 - sharp);
        ctx.drawImage(f.spr.blur, -S / 2, -S / 2, S, S);
      }
      ctx.globalAlpha = alpha * sharp;
      ctx.drawImage(f.spr.c, -S / 2, -S / 2, S, S);
    } else {
      ctx.rotate(f.budTilt + sw * 0.01 + (1 - ph) * 0.3);
      const k = ((f.r * 2) / f.spr.h) * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(f.spr.c, -f.spr.ox * k, -f.spr.oy * k, f.spr.c.width * k, f.spr.c.height * k);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function gardenTau(now) {
    if (state.phase === 'intro') return -1;
    if (state.phase === 'retract') {
      const tau = state.retractFrom - (now - state.retractT0) * 2.4;
      if (tau <= 0) {
        makeGarden();
        state.gardenT0 = now + 0.15;
        state.phase = 'growing';
        return -1;
      }
      return tau;
    }
    return now - state.gardenT0;
  }

  function render(ms) {
    const now = ms / 1000;
    if (!state.introT0) state.introT0 = now;

    // the garden is static behind the card: skip redraws once it is fully blurred in
    const frozen = state.cardOpen && now - state.cardOpenedAt > 1;
    if (!frozen || dirty) {
      dirty = false;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const tau = gardenTau(now);
      const heroT = now - state.introT0 - 0.35;
      let heroDone = false;
      for (const f of flowers) {
        if (!heroDone && f.d > HERO_D) { drawFlower(hero, heroT, now); heroDone = true; }
        if (tau > 0) drawFlower(f, tau - f.delay, now);
      }
      if (!heroDone) drawFlower(hero, heroT, now);

      if (state.phase === 'growing' && tau > state.gardenEnd) onGrown();
    }
    requestAnimationFrame(render);
  }

  /* ---------------- Story ---------------- */

  function heroReadyTime() { return 0.35 + hero.stemDur * 0.55 + hero.bloomDur; }

  function wake() {
    if (state.phase !== 'intro') return;
    const now = performance.now() / 1000;
    // if tapped before the first rose has fully opened, finish it right away
    if (now - state.introT0 < heroReadyTime()) state.introT0 = now - heroReadyTime();
    hero.pulseT0 = now;
    body.classList.add('awake');
    heroBtn.blur();
    state.phase = 'growing';
    state.gardenT0 = now + 0.45;
  }

  function onGrown() {
    state.phase = 'grown';
    if (!state.cardSeen) setTimeout(openCard, 800);
    else body.classList.add('show-actions');
  }

  function openCard() {
    state.cardOpen = true;
    state.cardOpenedAt = performance.now() / 1000;
    body.classList.remove('show-actions', 'closing');
    body.classList.add('card-open');
    overlay.setAttribute('aria-hidden', 'false');
    card.scrollTop = 0;
    card.focus({ preventScroll: true });
  }

  function closeCard() {
    if (!state.cardOpen) return;
    state.cardOpen = false;
    state.cardSeen = true;
    dirty = true;
    body.classList.add('closing');
    body.classList.remove('card-open');
    overlay.setAttribute('aria-hidden', 'true');
    body.classList.add('show-actions');
  }

  function replay() {
    if (state.phase !== 'grown') return;
    const now = performance.now() / 1000;
    body.classList.remove('show-actions');
    state.retractFrom = Math.min(now - state.gardenT0, state.gardenEnd);
    state.retractT0 = now;
    state.phase = 'retract';
  }

  heroBtn.addEventListener('click', wake);
  canvas.addEventListener('click', e => {
    if (state.phase !== 'intro') return;
    const dx = e.clientX - hero.x, dy = e.clientY - hero.y;
    if (dx * dx + dy * dy < (hero.r * 1.4) ** 2) wake();
  });
  closeBtn.addEventListener('click', closeCard);
  reopenBtn.addEventListener('click', openCard);
  replayBtn.addEventListener('click', replay);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeCard();
  });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resize(false), 120);
  });

  resize(true);
  // #preview: render the whole garden at once (used for the link-preview image)
  if (location.hash === '#preview') {
    state.introT0 = -100;
    state.gardenT0 = -100;
    state.phase = 'grown';
  }
  requestAnimationFrame(() => body.classList.add('ready'));
  requestAnimationFrame(render);
})();
