/*
Copyright (c) 2012 Greg Reimer — http://obadger.com/
MIT License — see full text in the original source.

Modernized to ES2022 by the ar-turtle project.
*/

import { getLayerForZ } from "./layer.js";

export class Turtle {
  constructor(z = 0) {
    const canvas = window.__ar_getLayerCanvas?.(0) ?? document.getElementById("turtle");
    let ctx = (window.__ar_getLayerCanvas?.(z) ?? canvas).getContext("2d");
    let currentZ = z;
    ctx.lineCap = "round";
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const DEFAULT_FG = "#000";
    const DEFAULT_BG = "#fff";
    const DEFAULT_WIDTH = "1";
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
      events[ev]?.forEach((h) => h.apply(this, args));
    };

    this.on = (ev, handler) => {
      if (!events[ev]) events[ev] = [];
      events[ev].push(handler);
      return this;
    };

    // ── Queue ────────────────────────────────────────────────────────────────
    // Processes one action per tick (or batches when the queue is very long).
    // The idle poll (200 ms) keeps the loop alive between bursts.
    let queueActive = false;
    let activeLoops = 0;
    let nextDelay = 0;
    let paused = false;
    let restartQueue;
    const q = (() => {
      const funs = [];
      let at = 0;
      const run = () => {
        if (stopped || paused) return;
        const len = funs.length - at;
        if (len > 0) {
          queueActive = true;
          if (len > 500) {
            for (let i = 0; i < len / 250; i++) {
              funs[at++]();
              if (nextDelay > 0) break;
            }
          } else {
            funs[at++]();
          }
          const delay = nextDelay;
          nextDelay = 0;
          setTimeout(run, delay);
        } else {
          queueActive = false;
          if (funs.length > 0) {
            funs.length = 0;
            at = 0;
          }
          setTimeout(run, 200);
        }
      };
      restartQueue = () => {
        if (!queueActive && !stopped) run();
      };
      run();
      return (fn) => {
        funs.push(fn);
        queueActive = true;
      };
    })();

    // ── Low-level draw ───────────────────────────────────────────────────────
    // Caches strokeStyle/lineWidth to skip redundant ctx assignments.
    // resetCache() must be called when ctx changes (turtle.z()).
    const go = (() => {
      let oldX, oldY, oldFg, oldWidth;
      const fn = (args) => {
        ctx.beginPath();
        if (args.fg !== oldFg) {
          ctx.strokeStyle = args.fg;
          oldFg = args.fg;
        }
        if (args.width !== oldWidth) {
          ctx.lineWidth = args.width;
          oldWidth = args.width;
        }
        ctx.moveTo(oldX, oldY);
        ctx.lineTo(args.x, args.y);
        if (args.pd) ctx.stroke();
        oldX = args.x;
        oldY = args.y;
        trigger("move", args);
      };
      fn.resetCache = () => {
        oldFg = oldWidth = undefined;
      };
      return fn;
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

    this.xy = (x, y) => {
      moveTo(origin.x + x, origin.y - y);
      return this;
    };
    this.x = (x) => {
      moveTo(origin.x + x, pos.y);
      return this;
    };
    this.y = (y) => {
      moveTo(pos.x, origin.y - y);
      return this;
    };

    this.heading = (deg) => {
      heading = -deg * (Math.PI / 180);
      const absDeg = this.get.heading();
      q(() => trigger("rotate", absDeg));
      return this;
    };

    this.face = (x, y) => {
      const absX = origin.x + x;
      const absY = origin.y - y;
      heading = Math.atan2(pos.x - absX, pos.y - absY);
      q(() => trigger("rotate", heading * (180 / Math.PI)));
      return this;
    };

    this.butt = (x, y) => {
      const absX = origin.x + x;
      const absY = origin.y - y;
      heading = Math.atan2(pos.x - absX, pos.y - absY) + Math.PI;
      q(() => trigger("rotate", heading * (180 / Math.PI)));
      return this;
    };

    this.seek = (obj, step = 10) => {
      if (!obj) return this;
      this.face(obj.cx, obj.cy);
      this.forward(step);
      return this;
    };

    this.goTo = (obj) => {
      if (!obj) return this;
      this.xy(obj.cx, obj.cy);
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

    this.arc = (radius, degrees) => {
      const d = degrees * (Math.PI / 180);
      let cx, cy, startA, endA, ccw;
      if (degrees >= 0) {
        cx = pos.x - Math.cos(heading) * radius;
        cy = pos.y + Math.sin(heading) * radius;
        startA = -heading;
        endA = -heading - d;
        ccw = true;
      } else {
        cx = pos.x + Math.cos(heading) * radius;
        cy = pos.y - Math.sin(heading) * radius;
        startA = Math.PI - heading;
        endA = Math.PI - heading - d;
        ccw = false;
      }
      pos.x = cx + Math.cos(endA) * radius;
      pos.y = cy + Math.sin(endA) * radius;
      heading += d;
      const arcArgs = {
        cx,
        cy,
        r: radius,
        startA,
        endA,
        ccw,
        x: pos.x,
        y: pos.y,
        pd: penDown,
        width,
        fg: foreground,
      };
      q(() => {
        if (arcArgs.pd) {
          ctx.beginPath();
          ctx.strokeStyle = arcArgs.fg;
          ctx.lineWidth = Number(arcArgs.width);
          ctx.arc(arcArgs.cx, arcArgs.cy, arcArgs.r, arcArgs.startA, arcArgs.endA, arcArgs.ccw);
          ctx.stroke();
        }
        go({ x: arcArgs.x, y: arcArgs.y, pd: false, width: arcArgs.width, fg: arcArgs.fg });
      });
      return this;
    };

    // ── Rotation ─────────────────────────────────────────────────────────────
    this.right = (deg) => {
      heading -= deg * (Math.PI / 180);
      const absDeg = this.get.heading();
      q(() => trigger("rotate", absDeg));
      return this;
    };
    this.left = (deg) => this.right(-deg);

    // ── Pen ──────────────────────────────────────────────────────────────────
    this.pu = () => {
      penDown = false;
      q(() => trigger("pu"));
      return this;
    };
    this.pd = () => {
      penDown = true;
      q(() => trigger("pd"));
      return this;
    };

    // ── Style ────────────────────────────────────────────────────────────────
    this.color = (c) => {
      foreground = c;
      return this;
    };
    this.thickness = (w) => {
      width = w;
      return this;
    };

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
      q(() => {
        go(args);
        trigger("rotate", 0);
      });
      return this;
    };

    this.clear = () => this.clean().home().pd();

    this.reset = this.init = () => {
      background = "transparent";
      return this.color(DEFAULT_FG).thickness(DEFAULT_WIDTH).clear();
    };

    // ── Layer ────────────────────────────────────────────────────────────────
    this.getCanvas = () => ctx.canvas;

    this.z = (n) => {
      currentZ = n;
      const newCanvas = window.__ar_getLayerCanvas?.(n) ?? canvas;
      ctx = newCanvas.getContext("2d");
      ctx.lineCap = "round";
      go.resetCache();
      return this;
    };

    this.getLayer = () => getLayerForZ(currentZ);

    // ── Sprite ───────────────────────────────────────────────────────────────
    const sprite = document.createElement("span");
    Object.assign(sprite.style, {
      backgroundImage: "url('turtle.png')",
      width: "41px",
      height: "41px",
      margin: "-21px",
      transformOrigin: "50% 50%",
      position: "absolute",
      zIndex: "1000",
    });
    canvas.parentElement?.appendChild(sprite);

    const scale = () => canvas.clientWidth / canvas.width;
    this.on("move", (t) => {
      const s = scale();
      sprite.style.left = `${t.x * s}px`;
      sprite.style.top = `${t.y * s}px`;
    });
    this.on("rotate", (deg) => {
      sprite.style.transform = `rotate(${Math.round(deg)}deg)`;
    });

    const ro = new ResizeObserver(() => {
      const s = scale();
      sprite.style.left = `${pos.x * s}px`;
      sprite.style.top = `${pos.y * s}px`;
    });
    ro.observe(canvas.parentElement);

    (window.__ar_turtles ??= []).push(this);

    Object.defineProperty(this, "isIdle", { get: () => !queueActive && activeLoops === 0 });

    this.stop = () => {
      stopped = true;
      sprite.remove();
      ro.disconnect();
    };

    this.pause = () => {
      paused = true;
    };
    this.resume = () => {
      paused = false;
      restartQueue();
    };

    // ── Loopers ──────────────────────────────────────────────────────────────
    this.repeat = (amount, fn) => {
      for (let i = 0; i < amount; i++) {
        const result = fn.call(this, i);
        if (!result && result !== undefined) break;
      }
      return this;
    };

    this.forever = (fn) => {
      activeLoops++;
      let i = 0;
      const tick = () => {
        if (stopped) {
          activeLoops--;
          return;
        }
        if (paused) {
          setTimeout(tick, 50);
          return;
        }
        const result = fn.call(this, i++);
        if (!result && result !== undefined) {
          activeLoops--;
          return;
        }
        setTimeout(tick, 0);
      };
      tick();
      return this;
    };

    this.wait = (seconds) => {
      q(() => {
        nextDelay = Math.round(seconds * 1000);
      });
      return this;
    };

    // ── Edge / Collision events ───────────────────────────────────────────────
    this.onEdge = (cb) => {
      let wasOutside = false;
      this.on("move", (t) => {
        const outside = t.x < 0 || t.x > canvasWidth || t.y < 0 || t.y > canvasHeight;
        if (outside && !wasOutside) cb.call(this);
        wasOutside = outside;
      });
      return this;
    };

    this.onCollide = (other, dist = 20, cb) => {
      let wasColliding = false;
      const check = () => {
        const dx = this.get.x() - other.get.x();
        const dy = this.get.y() - other.get.y();
        const colliding = Math.hypot(dx, dy) <= dist;
        if (colliding && !wasColliding) cb.call(this);
        wasColliding = colliding;
      };
      this.on("move", check);
      other.on("move", check);
      return this;
    };

    // ── Getters ──────────────────────────────────────────────────────────────
    this.get = {
      x: () => pos.x - origin.x,
      y: () => origin.y - pos.y,
      heading: () => -heading * (180 / Math.PI),
      pu: () => !penDown,
      pd: () => penDown,
      thickness: () => width,
      color: () => foreground,
      background: () => background,
      oob: () => pos.x > canvasWidth || pos.y > canvasHeight || pos.x < 0 || pos.y < 0,
      top: () => origin.y,
      left: () => -origin.x,
      right: () => origin.x,
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
          const c = Math.sqrt((-2 * Math.log(r)) / r);
          _u = u * c;
          _v = v * c;
          return;
        }
      };
      return () => {
        if (_u === undefined && _v === undefined) generate();
        if (_u !== undefined) {
          const r = _u;
          _u = undefined;
          return r;
        }
        const r = _v;
        _v = undefined;
        return r;
      };
    })();

    this.rand = {
      uni: (lower, upper) => {
        if (upper === undefined) {
          [lower, upper] = [0, lower];
        }
        return Math.random() * (upper - lower) + lower;
      },
      norm: (mean, stdDev) => mean + normal() * stdDev,
      chance: (odds) => Math.random() < odds,
    };

    // ─────────────────────────────────────────────────────────────────────────
    this.init();
  }
}
