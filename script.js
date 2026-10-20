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
  const soundBtn = document.getElementById('soundBtn');

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
    rose:  { light: '#fbc6d2', base: '#ee88a3', dark: '#d65f86', line: '#a94266', w: 12 },
    red:   { light: '#f9b8bf', base: '#e2606d', dark: '#c63b50', line: '#8c2237', w: 14 },
    peach: { light: '#fdd9c2', base: '#f7ae88', dark: '#ea8a61', line: '#c06846', w: 20 },
    green: { light: '#eef7cd', base: '#cfe894', dark: '#a6ce67', line: '#7aa948', w: 17 },
    blue:  { light: '#d9e9fb', base: '#a6c8ef', dark: '#7aaae1', line: '#5180bc', w: 10 },
    cream: { light: '#ffffff', base: '#f3ece3', dark: '#d6cabd', line: '#a99a8a', w: 8 },
  };
  const HERO_PAL = { light: '#fdd3dd', base: '#f49cb3', dark: '#e26f91', line: '#bd4d72' };
  const BUD_KEYS = ['pink', 'blue', 'peach', 'red'];
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
      alpha: 1, pal: HERO_PAL, push: 0, pushV: 0, popT0: -10,
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
        pal: PALETTES[pk], push: 0, pushV: 0, popT0: -10,
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
    if (t <= 0) { f.bloom = 0; return; }
    const ps = easeOutCubic(clamp(t / f.stemDur));
    const baseY = H + 6;
    const sw = (reduceMotion ? 0 : Math.sin(now * f.swaySpeed + f.phase) * f.sway) + f.push;
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
    f.hx = topX;
    f.hy = topY;
    f.bloom = ph;
    if (ph <= 0) { ctx.globalAlpha = 1; return; }

    let s = easeOutBack(ph);
    let rot = (1 - easeOutCubic(ph)) * f.spin + sw * 0.004;
    const sincePop = now - f.popT0;
    if (sincePop < 1.4) {
      const e = Math.exp(-sincePop * 4);
      s *= 1 + 0.24 * e * Math.sin(sincePop * 15);
      rot += 0.3 * e * Math.sin(sincePop * 11);
    }
    if (f.hero) {
      const since = now - f.pulseT0;
      if (since < 0.7) s *= 1 + 0.09 * Math.sin(Math.PI * (since / 0.7));
      else if (state.phase === 'intro' && ph >= 1 && !reduceMotion) s *= 1 + 0.018 * Math.sin(now * 2.4);
    }
    const alpha = clamp(ph * 2.2) * f.alpha;

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
      ctx.rotate(f.budTilt + sw * 0.01 + (1 - ph) * 0.3 + (rot - sw * 0.004) * 0.5);
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

  let lastNow = 0;
  function render(ms) {
    const now = ms / 1000;
    if (!state.introT0) state.introT0 = now;
    const dt = lastNow ? clamp(now - lastNow, 0, 0.05) : 0.016;
    lastNow = now;

    // the garden is static behind the card: skip redraws once it is fully blurred in
    const frozen = state.cardOpen && now - state.cardOpenedAt > 1;
    if (!frozen || dirty) {
      dirty = false;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const tau = gardenTau(now);
      const heroT = now - state.introT0 - 0.35;
      pointer.act *= Math.exp(-dt * 2.5);
      breeze(hero, dt);
      for (const f of flowers) breeze(f, dt);
      let heroDone = false;
      for (const f of flowers) {
        if (!heroDone && f.d > HERO_D) { drawFlower(hero, heroT, now); heroDone = true; }
        if (tau > 0) drawFlower(f, tau - f.delay, now);
      }
      if (!heroDone) drawFlower(hero, heroT, now);

      updateButterflies(dt, now);
      updateParticles(dt, now);
      drawButterflies();
      drawParticles();

      if (state.phase === 'growing' && tau > state.gardenEnd) onGrown();
    }
    requestAnimationFrame(render);
  }

  /* ---------------- Music: "Vườn thương", a slow 6/8 piece in D major ---------------- */

  const Music = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const BAR = 2.2;   // seconds per 6/8 bar (dotted quarter ≈ 55 bpm)
    const E = BAR / 6; // one eighth note
    const VOL = 0.85;
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

    // left-hand voicings: [bass, low, mid, high]
    const DMAJ7 = [38, 45, 54, 61], BM7 = [35, 42, 50, 57], GMAJ7 = [43, 50, 54, 59], A = [45, 52, 57, 61];
    const FSM7 = [42, 49, 52, 57], BM7B = [47, 54, 57, 62], EM7 = [40, 47, 55, 62], A7 = [45, 52, 55, 61];
    const INTRO = [DMAJ7, GMAJ7];
    const CHORDS = [DMAJ7, BM7, GMAJ7, A, FSM7, BM7B, EM7, A7];
    // right-hand melody, one bar per row: [midi note, length in eighths]
    const MELODY = [
      [[81, 3], [78, 2], [76, 1]], [[74, 3], [78, 2], [81, 1]], [[83, 4], [81, 1], [79, 1]], [[78, 3], [76, 3]],
      [[76, 2], [78, 1], [81, 3]], [[83, 3], [81, 2], [78, 1]], [[79, 3], [78, 2], [76, 1]], [[76, 2], [74, 1], [73, 3]],
      [[78, 2], [81, 1], [86, 3]], [[85, 2], [83, 1], [78, 3]], [[79, 2], [83, 1], [86, 2], [85, 1]], [[83, 2], [81, 1], [76, 3]],
      [[78, 3], [81, 2], [85, 1]], [[83, 3], [86, 2], [83, 1]], [[81, 3], [79, 2], [76, 1]], [[74, 3], [73, 3]],
    ];
    // D major pentatonic, low → high, for the flowers' chimes
    const CHIME = [81, 83, 86, 88, 90, 93, 95, 98];

    let ac = null, master = null, bus = null;
    let wanted = false, playing = false, timer = 0, nextBar = 0, bar = -INTRO.length;

    function impulse(seconds, decay) {
      const len = Math.floor(ac.sampleRate * seconds);
      const buf = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function init() {
      if (ac) return true;
      if (!AC) return false;
      // play even when an iPhone's silent switch is on
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 3;
      master.connect(comp);
      comp.connect(ac.destination);
      bus = ac.createGain();
      const dry = ac.createGain();
      const wet = ac.createGain();
      const verb = ac.createConvolver();
      dry.gain.value = 0.8;
      wet.gain.value = 0.35;
      verb.buffer = impulse(3.4, 2.6);
      bus.connect(dry);
      dry.connect(master);
      bus.connect(verb);
      verb.connect(wet);
      wet.connect(master);
      return true;
    }

    function osc(type, freq, detune, gain, dest, t, stop) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.value = gain;
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(stop);
    }

    // soft felt-piano voice: a few sine partials under a closing filter
    function piano(m, t, vel) {
      t = Math.max(t, ac.currentTime + 0.01);
      const f = mtof(m);
      const dur = clamp(3.6 - (m - 40) * 0.04, 1.4, 3.6);
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(vel, t + 0.008);
      env.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(Math.min(8000, f * 7), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), t + dur * 0.7);
      env.connect(lp);
      lp.connect(bus);
      [[1, 1, 0], [1, 0.5, 4], [2, 0.28, 0], [3, 0.1, 0], [4, 0.05, 0]].forEach(([mul, amp, det]) =>
        osc('sine', f * mul, det, amp, env, t, t + dur + 0.05));
    }

    // warm string pad under each bar
    function pad(notes, t, len) {
      t = Math.max(t, ac.currentTime + 0.01);
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.022, t + len * 0.4);
      env.gain.linearRampToValueAtTime(0.0001, t + len + 0.6);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      env.connect(lp);
      lp.connect(bus);
      notes.forEach(m => [-7, 7].forEach(det => osc('triangle', mtof(m), det, 1, env, t, t + len + 0.7)));
    }

    // music-box bell for the flowers
    function bell(m, t, vel) {
      const f = mtof(m);
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(vel, t + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      env.connect(bus);
      [[1, 1], [2.76, 0.3], [5.4, 0.1]].forEach(([mul, amp]) => osc('sine', f * mul, 0, amp, env, t, t + 1.9));
    }

    function playBar(i, t) {
      const ch = i < 0 ? INTRO[i + INTRO.length] : CHORDS[i % 8];
      [0, 1, 2, 3, 2, 1].forEach((p, j) =>
        piano(ch[p], t + j * E + rnd(-0.008, 0.008), (j === 0 ? 0.2 : 0.12) * rnd(0.88, 1.1)));
      pad(ch.slice(1).map(n => n + 12), t, BAR);
      if (i < 0) return;
      let pos = 0;
      for (const [m, len] of MELODY[i % 16]) {
        piano(m, t + pos * E + 0.012 + rnd(-0.008, 0.008), 0.26 * rnd(0.9, 1.08));
        pos += len;
      }
    }

    function tick() {
      while (nextBar < ac.currentTime + 1.2) {
        playBar(bar, nextBar);
        nextBar += BAR;
        bar++;
      }
    }

    function play() {
      if (playing || !init()) return;
      playing = true;
      if (ac.state === 'suspended') ac.resume();
      if (nextBar < ac.currentTime + 0.05) nextBar = ac.currentTime + 0.15;
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(VOL, t + 2.5);
      tick();
      timer = setInterval(tick, 250);
    }

    function pause() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.5);
      setTimeout(() => { if (!playing) ac.suspend(); }, 600);
    }

    // sound is a nice-to-have: never let an audio error stop the garden
    function safely(fn) {
      try { fn(); } catch (e) { console.warn('music:', e); }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) safely(pause);
      else if (wanted) safely(play);
    });

    return {
      supported: !!AC,
      get on() { return wanted; },
      start() { wanted = true; safely(play); },
      toggle() { wanted = !wanted; safely(wanted ? play : pause); },
      chime(xFrac, big) {
        if (!playing) return;
        const t = ac.currentTime + 0.02;
        if (big) [86, 90, 93, 98].forEach((m, i) => bell(m, t + i * 0.09, 0.15));
        else bell(CHIME[Math.round(clamp(xFrac) * (CHIME.length - 1))], t, 0.14);
      },
    };
  })();

  function syncSound() {
    soundBtn.classList.toggle('on', Music.on);
    soundBtn.setAttribute('aria-pressed', String(Music.on));
    soundBtn.setAttribute('aria-label', Music.on ? 'Tắt nhạc' : 'Bật nhạc');
  }

  /* ---------------- Petals, hearts, sparkles ---------------- */

  const particles = [];
  const PETAL_KEYS = ['pink', 'pink', 'rose', 'red', 'peach', 'cream'];
  const HEART_COLORS = ['#f25c7a', '#ff7f9c', '#e8455f', '#ff9fb4'];
  let ambientTimer = 0;

  function addParticle(p) {
    if (particles.length > 280) particles.shift();
    particles.push(p);
  }

  function addPetal(x, y, pal, vx, vy, life, ambient) {
    addParticle({
      kind: 'petal', x, y, vx, vy, life, ambient, age: 0,
      size: ambient ? clamp(unit * rnd(0.09, 0.16), 3.5, 9) : clamp(unit * rnd(0.14, 0.22), 5, 12),
      color: Math.random() < 0.5 ? pal.base : pal.light, edge: pal.dark,
      rot: rnd(0, TAU), vr: rnd(-3, 3), flip: rnd(0, TAU), vf: rnd(2, 5), sway: rnd(0, TAU),
    });
  }

  function addSparkles(x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      addParticle({
        kind: 'spark', x: x + rnd(-30, 30) * spread, y: y + rnd(-30, 20) * spread, vx: 0, vy: -12,
        life: rnd(0.6, 1), age: -rnd(0, 0.25), size: clamp(unit * rnd(0.14, 0.24), 5, 12),
      });
    }
  }

  function burst(x, y, pal, big) {
    addParticle({ kind: 'ring', x, y, vx: 0, vy: 0, age: 0, life: big ? 0.9 : 0.7, size: unit * (big ? 1.6 : 0.9) });
    const n = big ? 22 : 12;
    // petals in the flower's own colours, plus a few blush ones that read against it
    const mix = [pal, pal, PALETTES.cream, PALETTES.red];
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), sp = rnd(70, big ? 260 : 190);
      addPetal(x + Math.cos(a) * 6, y + Math.sin(a) * 6, mix[i % mix.length], Math.cos(a) * sp, Math.sin(a) * sp - 70, rnd(1.6, 2.6), false);
    }
    const hearts = big ? 9 : 3;
    for (let i = 0; i < hearts; i++) {
      addParticle({
        kind: 'heart', x: x + rnd(-14, 14), y: y - rnd(0, 10),
        vx: rnd(-1, 1) * (big ? 70 : 30), vy: rnd(-95, -55) * (big ? 1.25 : 1),
        life: rnd(1.9, 2.9), age: -i * 0.07, size: clamp(unit * rnd(0.3, 0.45), 12, 26) * (big ? 1.25 : 1),
        color: HEART_COLORS[(Math.random() * HEART_COLORS.length) | 0], sway: rnd(0, TAU),
      });
    }
    addSparkles(x, y, big ? 7 : 4, big ? 1.5 : 1);
  }

  function updateParticles(dt, now) {
    const wind = 16 + Math.sin(now * 0.23) * 12 + clamp(pointer.vx * 0.06, -60, 60) * pointer.act;
    // a gentle, steady drift of petals across the garden
    if (state.phase === 'grown' && !state.cardOpen && !reduceMotion) {
      ambientTimer -= dt;
      if (ambientTimer <= 0) {
        ambientTimer = rnd(0.3, 0.8);
        const live = particles.filter(p => p.ambient).length;
        if (live < (W < 600 ? 12 : 22)) {
          const pal = PALETTES[PETAL_KEYS[(Math.random() * PETAL_KEYS.length) | 0]];
          addPetal(rnd(-0.15, 0.95) * W, -12, pal, wind, rnd(18, 34), 60, true);
        }
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age < 0) continue;
      if (p.kind === 'petal') {
        if (p.ambient) {
          p.vx += (wind - p.vx) * Math.min(1, dt * 0.8);
          p.vy += (30 - p.vy) * Math.min(1, dt * 0.5);
        } else {
          p.vx *= Math.exp(-dt * 2.2);
          p.vy = p.vy * Math.exp(-dt * 2.2) + 120 * dt;
        }
        p.x += (p.vx + Math.sin(p.age * 2.2 + p.sway) * 14) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
      } else if (p.kind === 'heart') {
        p.x += (p.vx + Math.sin(p.age * 3 + p.sway) * 18) * dt;
        p.y += p.vy * dt;
        p.vy *= Math.exp(-dt * 0.6);
      } else {
        p.y += p.vy * dt;
      }
      if (p.age > p.life || p.y > H + 30 || p.x > W + 40 || p.x < -60) particles.splice(i, 1);
    }
  }

  function heartPath(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s * 0.08, s * 0.28, -s * 0.55, s * 0.02, -s * 0.55, -s * 0.22);
    ctx.bezierCurveTo(-s * 0.55, -s * 0.48, -s * 0.18, -s * 0.6, 0, -s * 0.32);
    ctx.bezierCurveTo(s * 0.18, -s * 0.6, s * 0.55, -s * 0.48, s * 0.55, -s * 0.22);
    ctx.bezierCurveTo(s * 0.55, s * 0.02, s * 0.08, s * 0.28, 0, s * 0.35);
    ctx.closePath();
  }

  function drawParticles() {
    for (const p of particles) {
      if (p.age < 0) continue;
      const fade = p.ambient ? 1 : 1 - smooth(p.life * 0.6, p.life, p.age);
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'petal') {
        const s = p.size;
        ctx.globalAlpha = 0.92 * fade;
        ctx.rotate(p.rot);
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flip)));
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.95, -s * 0.75, s * 0.75, s * 0.85, 0, s);
        ctx.bezierCurveTo(-s * 0.75, s * 0.85, -s * 0.95, -s * 0.75, 0, -s);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.strokeStyle = rgba(p.edge, 0.35);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else if (p.kind === 'heart') {
        const grow = easeOutBack(clamp(p.age / 0.35));
        ctx.globalAlpha = fade;
        ctx.scale(grow, grow);
        ctx.rotate(Math.sin(p.age * 3 + p.sway) * 0.2);
        heartPath(p.size);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(-p.size * 0.25, -p.size * 0.28, p.size * 0.1, p.size * 0.06, -0.6, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'ring') {
        const k = clamp(p.age / p.life);
        const e = easeOutCubic(k);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = 'rgba(255, 228, 236, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (0.3 + 0.9 * e), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.stroke();
      } else {
        const k = clamp(p.age / p.life);
        const s = p.size * Math.sin(Math.PI * k);
        ctx.rotate(k * 1.5);
        ctx.shadowColor = 'rgba(255, 214, 120, 0.9)';
        ctx.shadowBlur = s;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.fillStyle = '#fffbe6';
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- Butterflies ---------------- */

  const BUTTERFLY_PALS = [
    { wing: '#f8c9da', edge: '#e283a6', spot: '#fff5f8' },
    { wing: '#c9def7', edge: '#7ea7da', spot: '#ffffff' },
    { wing: '#fbe5ab', edge: '#e5b45b', spot: '#fffaf0' },
  ];
  const butterflies = [];
  let attract = null; // the last tap: butterflies gather around it for a moment

  function spawnButterflies() {
    if (butterflies.length || reduceMotion) return;
    const n = W < 600 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      butterflies.push({
        x: i % 2 ? W + 30 : -30, y: rnd(0.2, 0.5) * H, vx: 0, vy: 0,
        size: clamp(unit * 0.34, 11, 22) * rnd(0.85, 1.1),
        pal: BUTTERFLY_PALS[i % BUTTERFLY_PALS.length],
        flap: rnd(0, TAU), target: null, rest: 0, seed: rnd(0, 100), i,
      });
    }
  }

  function pickTarget(b) {
    const blooms = state.phase === 'grown'
      ? flowers.filter(f => f.type === 'rose' && f.bloom >= 1 && f.hx > 20 && f.hx < W - 20)
      : [];
    if (blooms.length && Math.random() < 0.65) b.target = { flower: blooms[(Math.random() * blooms.length) | 0] };
    else b.target = { x: rnd(0.08, 0.92) * W, y: rnd(0.15, 0.55) * H };
  }

  function updateButterflies(dt, now) {
    for (const b of butterflies) {
      let tx, ty, landing = false;
      if (attract && now - attract.t < 3.5) {
        const a = now * 1.6 + b.i * 2.1;
        tx = attract.x + Math.cos(a) * unit * 1.3;
        ty = attract.y - unit * 0.6 + Math.sin(a) * unit * 0.7;
        b.rest = 0;
      } else {
        if (!b.target || (b.target.flower && b.target.flower.bloom < 1)) pickTarget(b);
        const f = b.target.flower;
        if (f) { tx = f.hx; ty = f.hy - f.r * 0.15; landing = true; } else { tx = b.target.x; ty = b.target.y; }
      }
      if (b.rest > 0) {
        // perched: ride along with the swaying flower, wings slowly opening and closing
        b.rest -= dt;
        b.x = tx;
        b.y = ty;
        b.flap += dt * 3;
        if (b.rest <= 0) { b.target = null; b.vy = -70; }
        continue;
      }
      const dx = tx - b.x, dy = ty - b.y, dist = Math.hypot(dx, dy);
      if (dist < 8) {
        if (landing) { b.rest = rnd(1.8, 4); continue; }
        b.target = null;
      }
      const speed = 95 * Math.min(1, dist / 70 + 0.25);
      const wob = Math.sin(now * 3 + b.seed) * 40;
      const ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
      const k = Math.min(1, dt * 2.2);
      b.vx += (ux * speed - uy * wob - b.vx) * k;
      b.vy += (uy * speed + ux * wob + Math.sin(now * 9 + b.seed) * 25 - b.vy) * k;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.flap += dt * 17;
    }
  }

  function drawButterflies() {
    for (const b of butterflies) {
      const s = b.size;
      const open = b.rest > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(b.flap)) : 0.18 + 0.82 * Math.abs(Math.sin(b.flap));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(clamp(b.vx * 0.004, -0.45, 0.45));
      ctx.lineWidth = Math.max(1, s * 0.07);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side * open, 1);
        ctx.fillStyle = b.pal.wing;
        ctx.strokeStyle = b.pal.edge;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1);
        ctx.bezierCurveTo(s * 0.35, -s * 1.05, s * 1.15, -s * 0.95, s * 0.95, -s * 0.25);
        ctx.bezierCurveTo(s * 0.85, s * 0.05, s * 0.3, s * 0.05, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, s * 0.05);
        ctx.bezierCurveTo(s * 0.55, s * 0.05, s * 0.8, s * 0.55, s * 0.45, s * 0.75);
        ctx.bezierCurveTo(s * 0.2, s * 0.85, s * 0.05, s * 0.45, 0, s * 0.15);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = b.pal.spot;
        ctx.beginPath();
        ctx.arc(s * 0.62, -s * 0.5, s * 0.13, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#5b4652';
      ctx.strokeStyle = '#5b4652';
      ctx.lineWidth = Math.max(0.8, s * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, s * 0.1, s * 0.09, s * 0.45, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.quadraticCurveTo(-s * 0.1, -s * 0.7, -s * 0.32, -s * 0.85);
      ctx.moveTo(0, -s * 0.3);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.7, s * 0.32, -s * 0.85);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------------- Touch & breeze ---------------- */

  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, act: 0, t: 0 };

  function trackPointer(e) {
    const now = performance.now() / 1000;
    if (pointer.t && now - pointer.t < 0.2) {
      const dt = Math.max(0.008, now - pointer.t);
      const vx = (e.clientX - pointer.x) / dt, vy = (e.clientY - pointer.y) / dt;
      pointer.vx = lerp(pointer.vx, vx, 0.35);
      pointer.vy = lerp(pointer.vy, vy, 0.35);
      pointer.act = Math.min(1, pointer.act + (Math.hypot(vx, vy) * dt) / 120);
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.t = now;
  }

  // flowers near a moving pointer lean away from it, then spring back
  function breeze(f, dt) {
    let target = 0;
    if (pointer.act > 0.01 && f.hx !== undefined) {
      const dx = f.hx - pointer.x, dy = f.hy - pointer.y;
      const reach = unit * 2.4 + f.r;
      const infl = Math.exp(-(dx * dx + dy * dy) / (reach * reach)) * pointer.act;
      target = ((dx >= 0 ? 0.8 : -0.8) + clamp(pointer.vx / 900, -1, 1) * 0.7) * infl * f.r;
    }
    f.pushV += ((target - f.push) * 70 - f.pushV * 7) * dt;
    f.push += f.pushV * dt;
  }

  function hitFlower(x, y) {
    const near = (f, cx, cy, r) => f.bloom > 0.6 && (x - cx) ** 2 + (y - cy) ** 2 < r * r;
    if (near(hero, hero.hx, hero.hy, hero.r * 1.05)) return hero;
    for (let i = flowers.length - 1; i >= 0; i--) {
      const f = flowers[i];
      if (f.type === 'rose' ? near(f, f.hx, f.hy, f.r * 0.95) : near(f, f.hx, f.hy - f.r, f.r * 0.9)) return f;
    }
    return null;
  }

  function interact(x, y) {
    const now = performance.now() / 1000;
    const f = hitFlower(x, y);
    attract = { x, y, t: now };
    hideHint();
    if (f) {
      const big = f === hero;
      f.popT0 = now;
      burst(f.hx, f.type === 'rose' ? f.hy : f.hy - f.r, f.pal, big);
      Music.chime(f.hx / W, big);
    } else {
      addSparkles(x, y, 4, 0.8);
      Music.chime(x / W, false);
    }
  }

  let hintTimer = 0;
  function showHint() {
    hintTimer = setTimeout(() => {
      body.classList.add('show-hint');
      hintTimer = setTimeout(hideHint, 7000);
    }, 900);
  }
  function hideHint() {
    clearTimeout(hintTimer);
    body.classList.remove('show-hint');
  }

  /* ---------------- Story ---------------- */

  function heroReadyTime() { return 0.35 + hero.stemDur * 0.55 + hero.bloomDur; }

  function wake() {
    if (state.phase !== 'intro') return;
    const now = performance.now() / 1000;
    // if tapped before the first rose has fully opened, finish it right away
    if (!state.introT0 || now - state.introT0 < heroReadyTime()) state.introT0 = now - heroReadyTime();
    hero.pulseT0 = now;
    body.classList.add('awake');
    heroBtn.blur();
    Music.start();
    syncSound();
    state.phase = 'growing';
    state.gardenT0 = now + 0.45;
  }

  function onGrown() {
    state.phase = 'grown';
    spawnButterflies();
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
    if (!state.cardSeen) showHint();
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
    hideHint();
    body.classList.remove('show-actions');
    state.retractFrom = Math.min(now - state.gardenT0, state.gardenEnd);
    state.retractT0 = now;
    state.phase = 'retract';
  }

  heroBtn.addEventListener('click', wake);
  canvas.addEventListener('pointerdown', e => {
    trackPointer(e);
    if (state.phase === 'intro') {
      const dx = e.clientX - hero.x, dy = e.clientY - hero.y;
      if (dx * dx + dy * dy < (hero.r * 1.4) ** 2) wake();
      return;
    }
    if (!state.cardOpen) interact(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', e => {
    trackPointer(e);
    if (e.pointerType === 'mouse' && state.phase !== 'intro') {
      canvas.style.cursor = hitFlower(e.clientX, e.clientY) ? 'pointer' : '';
    }
  });
  canvas.addEventListener('pointerleave', () => { pointer.t = 0; });
  soundBtn.addEventListener('click', () => { Music.toggle(); syncSound(); });
  if (!Music.supported) soundBtn.hidden = true;
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
    soundBtn.hidden = true;
  }
  requestAnimationFrame(() => body.classList.add('ready'));
  requestAnimationFrame(render);
})();
