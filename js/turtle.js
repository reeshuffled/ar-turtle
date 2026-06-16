/*
Copyright (c) 2012 Greg Reimer — http://obadger.com/
MIT License — see full text in the original source.

Modernized to ES2022 by the ar-turtle project.
*/

export class Turtle {
  constructor(canvas = document.getElementById('turtle')) {
    const ctx = canvas.getContext('2d');
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    ctx.lineCap = 'round';

    const DEFAULT_FG = '#000';
    const DEFAULT_BG = '#fff';
    const DEFAULT_WIDTH = '1';
    const origin = {
      x: Math.floor(canvasWidth / 2) + 0.5,
      y: Math.floor(canvasHeight / 2) + 0.5,
    };

    let foreground = DEFAULT_FG;
    let background = DEFAULT_BG;
    let width = DEFAULT_WIDTH;
    let penDown = true;
    let pos = {};
    let heading = 0;
    let stopped = false;
    const events = {};

    // ── Event system ─────────────────────────────────────────────────────────
    const trigger = (ev, ...args) => {
      events[ev]?.forEach(h => h.apply(this, args));
    };

    this.on = (ev, handler) => {
      if (!events[ev]) events[ev] = [];
      events[ev].push(handler);
      return this;
    };

    // ── Queue ────────────────────────────────────────────────────────────────
    // Processes one action per tick (or batches when the queue is very long).
    // The idle poll (200 ms) keeps the loop alive between bursts.
    const q = (() => {
      const funs = [];
      let at = 0;
      const run = () => {
        if (stopped) return;
        const len = funs.length - at;
        if (len > 0) {
          if (len > 500) {
            for (let i = 0; i < len / 250; i++) funs[at++]();
          } else {
            funs[at++]();
          }
          setTimeout(run, 0);
        } else {
          if (funs.length > 0) { funs.length = 0; at = 0; }
          setTimeout(run, 200);
        }
      };
      run();
      return (fn) => funs.push(fn);
    })();

    // ── Low-level draw ───────────────────────────────────────────────────────
    // Caches strokeStyle/lineWidth to skip redundant ctx assignments.
    const go = (() => {
      let oldX, oldY, oldFg, oldWidth;
      return (args) => {
        ctx.beginPath();
        if (args.fg !== oldFg) { ctx.strokeStyle = args.fg; oldFg = args.fg; }
        if (args.width !== oldWidth) { ctx.lineWidth = args.width; oldWidth = args.width; }
        ctx.moveTo(oldX, oldY);
        ctx.lineTo(args.x, args.y);
        if (args.pd) ctx.stroke();
        oldX = args.x;
        oldY = args.y;
        trigger('move', args);
      };
    })();

    const moveTo = (x, y) => {
      pos.x = x;
      pos.y = y;
      const args = { x, y, pd: penDown, width, fg: foreground };
      q(() => go(args));
    };

    // ── Movement ─────────────────────────────────────────────────────────────
    this.forward = (amount) => {
      pos.x += Math.sin(heading) * -amount;
      pos.y += Math.cos(heading) * -amount;
      const args = { x: pos.x, y: pos.y, pd: penDown, width, fg: foreground };
      q(() => go(args));
      return this;
    };
    this.backward = (amount) => this.forward(-amount);

    this.xy = (x, y) => { moveTo(origin.x + x, origin.y - y); return this; };
    this.x  = (x)    => { moveTo(origin.x + x, pos.y);        return this; };
    this.y  = (y)    => { moveTo(pos.x, origin.y - y);        return this; };

    this.heading = (deg) => {
      heading = -deg * (Math.PI / 180);
      const absDeg = this.get.heading();
      q(() => trigger('rotate', absDeg));
      return this;
    };

    this.face = (x, y) => {
      const absX = origin.x + x;
      const absY = origin.y - y;
      heading = Math.atan2(pos.x - absX, pos.y - absY);
      q(() => trigger('rotate', heading * (180 / Math.PI)));
      return this;
    };

    this.butt = (x, y) => {
      const absX = origin.x + x;
      const absY = origin.y - y;
      heading = Math.atan2(pos.x - absX, pos.y - absY) + Math.PI;
      q(() => trigger('rotate', heading * (180 / Math.PI)));
      return this;
    };

    // ── Shapes ───────────────────────────────────────────────────────────────
    this.disc = (radius) => {
      const { x, y } = pos;
      q(() => {
        ctx.beginPath();
        ctx.fillStyle = foreground;
        ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
        ctx.fill();
      });
      return this;
    };

    this.circle = (radius) => {
      const { x, y } = pos;
      q(() => {
        ctx.beginPath();
        ctx.strokeStyle = foreground;
        ctx.arc(x, y, radius, 0, 2 * Math.PI, true);
        ctx.stroke();
      });
      return this;
    };

    // ── Rotation ─────────────────────────────────────────────────────────────
    this.right = (deg) => {
      heading -= deg * (Math.PI / 180);
      const absDeg = this.get.heading();
      q(() => trigger('rotate', absDeg));
      return this;
    };
    this.left = (deg) => this.right(-deg);

    // ── Pen ──────────────────────────────────────────────────────────────────
    this.pu = () => { penDown = false; q(() => trigger('pu')); return this; };
    this.pd = () => { penDown = true;  q(() => trigger('pd')); return this; };

    // ── Style ────────────────────────────────────────────────────────────────
    this.color     = (c) => { foreground = c; return this; };
    this.thickness = (w) => { width = w;      return this; };

    this.clean = (color) => {
      if (color) background = color;
      const bg = background;
      q(() => {
        ctx.fillStyle = bg;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      });
      return this;
    };

    this.home = () => {
      heading = 0;
      pos.x = origin.x;
      pos.y = origin.y;
      const args = { x: pos.x, y: pos.y, pd: false, width, fg: foreground };
      q(() => { go(args); trigger('rotate', 0); });
      return this;
    };

    this.clear = () => this.clean().home().pd();

    this.reset = this.init = () => {
      background = 'transparent';
      return this.color(DEFAULT_FG).thickness(DEFAULT_WIDTH).clear();
    };

    // ── Sprite ───────────────────────────────────────────────────────────────
    const sprite = document.createElement('span');
    Object.assign(sprite.style, {
      backgroundImage: "url('turtle.png')",
      width: '41px', height: '41px', margin: '-21px',
      transformOrigin: '50% 50%',
      position: 'absolute', zIndex: '31',
    });
    canvas.parentElement?.appendChild(sprite);

    const scale = () => canvas.clientWidth / canvas.width;
    this.on('move',   t   => {
      const s = scale();
      sprite.style.left = `${t.x * s}px`;
      sprite.style.top  = `${t.y * s}px`;
    });
    this.on('rotate', deg => {
      sprite.style.transform = `rotate(${Math.round(deg)}deg)`;
    });

    const ro = new ResizeObserver(() => {
      const s = scale();
      sprite.style.left = `${pos.x * s}px`;
      sprite.style.top  = `${pos.y * s}px`;
    });
    ro.observe(canvas.parentElement);

    (window.__ar_turtles ??= []).push(this);

    this.stop = () => { stopped = true; sprite.remove(); ro.disconnect(); };

    // ── Loopers ──────────────────────────────────────────────────────────────
    this.repeat = (amount, fn) => {
      for (let i = 0; i < amount; i++) {
        const result = fn.call(this, i);
        if (!result && result !== undefined) break;
      }
      return this;
    };

    // NOTE: forever() is a synchronous infinite loop — it will freeze the
    // browser unless fn returns false at some point to break out.
    this.forever = (fn) => {
      let i = 0;
      while (true) {
        const result = fn.call(this, i++);
        if (!result && result !== undefined) break;
      }
      return this;
    };

    // ── Getters ──────────────────────────────────────────────────────────────
    this.get = {
      x:          () => pos.x - origin.x,
      y:          () => origin.y - pos.y,
      heading:    () => -heading * (180 / Math.PI),
      pu:         () => !penDown,
      pd:         () => penDown,
      thickness:  () => width,
      color:      () => foreground,
      background: () => background,
      oob: () =>
        pos.x > canvasWidth || pos.y > canvasHeight || pos.x < 0 || pos.y < 0,
      top:    () => origin.y,
      left:   () => -origin.x,
      right:  () => origin.x,
      bottom: () => -origin.y,
    };

    // ── Random ───────────────────────────────────────────────────────────────
    // Box-Muller transform for normal distribution.
    const normal = (() => {
      let _u, _v;
      const generate = () => {
        while (true) {
          const u = Math.random() * 2 - 1;
          const v = Math.random() * 2 - 1;
          const r = u * u + v * v;
          if (r === 0 || r >= 1) continue;
          const c = Math.sqrt(-2 * Math.log(r) / r);
          _u = u * c; _v = v * c;
          return;
        }
      };
      return () => {
        if (_u === undefined && _v === undefined) generate();
        if (_u !== undefined) { const r = _u; _u = undefined; return r; }
        const r = _v; _v = undefined; return r;
      };
    })();

    this.rand = {
      uni:    (lower, upper) => {
        if (upper === undefined) { [lower, upper] = [0, lower]; }
        return Math.random() * (upper - lower) + lower;
      },
      norm:   (mean, stdDev) => mean + normal() * stdDev,
      chance: (odds) => Math.random() < odds,
    };

    // ─────────────────────────────────────────────────────────────────────────
    this.init();
  }
}
