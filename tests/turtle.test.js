import { Turtle } from '../js/turtle.js';

// ─── Canvas stub ─────────────────────────────────────────────────────────────
function createCanvas(width = 600, height = 600) {
  const ctx = {
    lineCap: '',
    strokeStyle: '#000',
    fillStyle: '#000',
    lineWidth: 1,
    beginPath:    vi.fn(),
    moveTo:       vi.fn(),
    lineTo:       vi.fn(),
    stroke:       vi.fn(),
    fill:         vi.fn(),
    clearRect:    vi.fn(),
    fillRect:     vi.fn(),
    arc:          vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
  };
  return { width, height, getContext: () => ctx, _ctx: ctx };
}

// ─── Queue helpers ───────────────────────────────────────────────────────────
// The turtle queue starts with a 200 ms idle poll (fired once on construction
// before any items are pushed).  After the first poll fires and there are items
// to process, all follow-on ticks use setTimeout(run, 0).  Advancing 200 ms
// drains the init queue without triggering the *next* 200 ms idle poll.
function flushQueue() {
  vi.advanceTimersByTime(200);
}

// ─── Test suite ──────────────────────────────────────────────────────────────
describe('Turtle', () => {
  let canvas, turtle;

  beforeEach(() => {
    vi.useFakeTimers();
    canvas = createCanvas(600, 600);
    window.__ar_getLayerCanvas = () => canvas;
    turtle = new Turtle();
    // Advance far enough that all init queue items (clean/home/pd, each on
    // a 0ms follow-up timer) are fully processed, not just the first 200ms tick.
    vi.advanceTimersByTime(500);
    vi.clearAllMocks();      // reset call counts so tests start clean
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    test('position is at origin', () => {
      expect(turtle.get.x()).toBe(0);
      expect(turtle.get.y()).toBe(0);
    });

    test('heading is north (0°)', () => {
      expect(turtle.get.heading()).toBeCloseTo(0);
    });

    test('pen is down', () => {
      expect(turtle.get.pd()).toBe(true);
      expect(turtle.get.pu()).toBe(false);
    });

    test('default drawing color is black', () => {
      expect(turtle.get.color()).toBe('#000');
    });

    test('default line thickness is "1"', () => {
      expect(turtle.get.thickness()).toBe('1');
    });

    test('background is transparent (for AR overlay)', () => {
      expect(turtle.get.background()).toBe('transparent');
    });

    test('canvas boundary getters match half-dimensions', () => {
      expect(turtle.get.right()).toBeCloseTo(300.5, 1);
      expect(turtle.get.left()).toBeCloseTo(-300.5, 1);
      expect(turtle.get.top()).toBeCloseTo(300.5, 1);
      expect(turtle.get.bottom()).toBeCloseTo(-300.5, 1);
    });
  });

  // ── Movement ───────────────────────────────────────────────────────────────

  describe('forward / backward', () => {
    test('forward(100) moves 100 units north', () => {
      turtle.forward(100);
      expect(turtle.get.x()).toBeCloseTo(0);
      expect(turtle.get.y()).toBeCloseTo(100);
    });

    test('backward(100) moves 100 units south', () => {
      turtle.backward(100);
      expect(turtle.get.y()).toBeCloseTo(-100);
    });

    test('forward(-n) equals backward(n)', () => {
      turtle.forward(-50);
      expect(turtle.get.y()).toBeCloseTo(-50);
    });

    test('movements accumulate', () => {
      turtle.forward(60).forward(40);
      expect(turtle.get.y()).toBeCloseTo(100);
    });

    test('right(90) then forward(100) moves 100 units east', () => {
      turtle.right(90).forward(100);
      expect(turtle.get.x()).toBeCloseTo(100);
      expect(turtle.get.y()).toBeCloseTo(0);
    });

    test('left(90) then forward(100) moves 100 units west', () => {
      turtle.left(90).forward(100);
      expect(turtle.get.x()).toBeCloseTo(-100);
      expect(turtle.get.y()).toBeCloseTo(0);
    });

    test('right(180) then forward(100) moves 100 units south', () => {
      turtle.right(180).forward(100);
      expect(turtle.get.x()).toBeCloseTo(0);
      expect(turtle.get.y()).toBeCloseTo(-100);
    });
  });

  // ── Absolute positioning ────────────────────────────────────────────────────

  describe('xy / x / y', () => {
    test('xy(50, 80) sets both coordinates', () => {
      turtle.xy(50, 80);
      expect(turtle.get.x()).toBeCloseTo(50);
      expect(turtle.get.y()).toBeCloseTo(80);
    });

    test('x(30) changes only the x coordinate', () => {
      turtle.xy(10, 20).x(30);
      expect(turtle.get.x()).toBeCloseTo(30);
      expect(turtle.get.y()).toBeCloseTo(20);
    });

    test('y(40) changes only the y coordinate', () => {
      turtle.xy(10, 20).y(40);
      expect(turtle.get.x()).toBeCloseTo(10);
      expect(turtle.get.y()).toBeCloseTo(40);
    });
  });

  // ── Heading ─────────────────────────────────────────────────────────────────

  describe('right / left / heading', () => {
    test('right(90) sets heading to 90', () => {
      turtle.right(90);
      expect(turtle.get.heading()).toBeCloseTo(90);
    });

    test('left(45) sets heading to -45', () => {
      turtle.left(45);
      expect(turtle.get.heading()).toBeCloseTo(-45);
    });

    test('right(90).right(90) accumulates to 180', () => {
      turtle.right(90).right(90);
      expect(turtle.get.heading()).toBeCloseTo(180);
    });

    test('heading(45) sets an absolute heading', () => {
      turtle.right(90).heading(45);
      expect(turtle.get.heading()).toBeCloseTo(45);
    });
  });

  // ── face() ──────────────────────────────────────────────────────────────────

  describe('face()', () => {
    test('face(0, 100) points north', () => {
      turtle.face(0, 100);
      expect(turtle.get.heading()).toBeCloseTo(0);
    });

    test('face(100, 0) points east', () => {
      turtle.face(100, 0);
      expect(turtle.get.heading()).toBeCloseTo(90);
    });
  });

  // ── Pen ─────────────────────────────────────────────────────────────────────

  describe('pu / pd', () => {
    test('pu() lifts the pen', () => {
      turtle.pu();
      expect(turtle.get.pu()).toBe(true);
      expect(turtle.get.pd()).toBe(false);
    });

    test('pd() after pu() puts pen back down', () => {
      turtle.pu().pd();
      expect(turtle.get.pd()).toBe(true);
    });
  });

  // ── Color & thickness ───────────────────────────────────────────────────────

  describe('color / thickness', () => {
    test('color() stores the new color', () => {
      turtle.color('red');
      expect(turtle.get.color()).toBe('red');
    });

    test('thickness() stores the new width', () => {
      turtle.thickness(5);
      expect(turtle.get.thickness()).toBe(5);
    });
  });

  // ── home / clear ────────────────────────────────────────────────────────────

  describe('home / clear', () => {
    test('home() resets position to origin', () => {
      turtle.forward(100).right(90).home();
      expect(turtle.get.x()).toBe(0);
      expect(turtle.get.y()).toBe(0);
    });

    test('home() resets heading to 0', () => {
      turtle.right(90).home();
      expect(turtle.get.heading()).toBeCloseTo(0);
    });

    test('clear() resets position, heading, and puts pen down', () => {
      turtle.pu().right(45).xy(100, 100).clear();
      expect(turtle.get.x()).toBe(0);
      expect(turtle.get.y()).toBe(0);
      expect(turtle.get.heading()).toBeCloseTo(0);
      expect(turtle.get.pd()).toBe(true);
    });
  });

  // ── Out-of-bounds ────────────────────────────────────────────────────────────

  describe('get.oob()', () => {
    test('false at origin', () => {
      expect(turtle.get.oob()).toBe(false);
    });

    test('true when x exceeds canvas width', () => {
      turtle.xy(400, 0); // abs canvas x = 300.5 + 400 = 700.5 > 600
      expect(turtle.get.oob()).toBe(true);
    });

    test('true when y exceeds canvas height', () => {
      turtle.xy(0, -400); // abs canvas y = 300.5 + 400 = 700.5 > 600
      expect(turtle.get.oob()).toBe(true);
    });
  });

  // ── Canvas drawing (async via queue) ────────────────────────────────────────

  describe('canvas drawing', () => {
    test('forward with pen down calls ctx.stroke', () => {
      turtle.forward(100);
      flushQueue();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('forward with pen up does not call ctx.stroke', () => {
      turtle.pu().forward(100);
      flushQueue();
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
    });

    test('forward calls ctx.lineTo with the destination canvas coords', () => {
      turtle.forward(50);
      flushQueue();
      // canvas y decreases as turtle y increases (y axis is flipped)
      // origin = (300.5, 300.5); forward 50 north → canvas (300.5, 250.5)
      expect(canvas._ctx.lineTo).toHaveBeenCalledWith(
        expect.closeTo(300.5, 1),
        expect.closeTo(250.5, 1),
      );
    });

    test('clean() calls ctx.clearRect', () => {
      turtle.clean();
      flushQueue();
      expect(canvas._ctx.clearRect).toHaveBeenCalledWith(0, 0, 600, 600);
    });

    test('disc() calls ctx.arc and ctx.fill', () => {
      turtle.disc(20);
      flushQueue();
      expect(canvas._ctx.arc).toHaveBeenCalled();
      expect(canvas._ctx.fill).toHaveBeenCalled();
    });

    test('circle() calls ctx.arc and ctx.stroke', () => {
      turtle.circle(30);
      flushQueue();
      expect(canvas._ctx.arc).toHaveBeenCalled();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });
  });

  // ── Events (async via queue) ─────────────────────────────────────────────────

  describe('events', () => {
    test('move event fires after forward', () => {
      const handler = vi.fn();
      turtle.on('move', handler);
      turtle.forward(100);
      flushQueue();
      expect(handler).toHaveBeenCalled();
    });

    test('move event receives canvas-space position', () => {
      const handler = vi.fn();
      turtle.on('move', handler);
      turtle.forward(100);
      flushQueue();
      // home() (from init) fires move with pd=false; forward fires with pd=true
      const [args] = handler.mock.calls.find(([a]) => a.pd);
      expect(args.x).toBeCloseTo(300.5, 1);
      expect(args.y).toBeCloseTo(200.5, 1);
    });

    test('rotate event fires after right()', () => {
      const handler = vi.fn();
      turtle.on('rotate', handler);
      turtle.right(90);
      flushQueue();
      expect(handler).toHaveBeenCalledWith(expect.closeTo(90, 1));
    });

    test('rotate event fires after heading()', () => {
      const handler = vi.fn();
      turtle.on('rotate', handler);
      turtle.heading(45);
      flushQueue();
      expect(handler).toHaveBeenCalledWith(expect.closeTo(45, 1));
    });

    test('multiple handlers on same event all fire', () => {
      const a = vi.fn();
      const b = vi.fn();
      turtle.on('move', a).on('move', b);
      turtle.forward(10);
      flushQueue();
      expect(a).toHaveBeenCalled();
      expect(b).toHaveBeenCalled();
    });
  });

  // ── repeat ───────────────────────────────────────────────────────────────────

  describe('repeat', () => {
    test('calls fn the requested number of times', () => {
      const fn = vi.fn().mockReturnValue(true);
      turtle.repeat(4, fn);
      expect(fn).toHaveBeenCalledTimes(4);
    });

    test('passes the iteration index to fn', () => {
      const indices = [];
      turtle.repeat(3, (i) => { indices.push(i); return true; });
      expect(indices).toEqual([0, 1, 2]);
    });

    test('stops early when fn returns false', () => {
      const fn = vi.fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      turtle.repeat(10, fn);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ── rand ─────────────────────────────────────────────────────────────────────

  describe('rand', () => {
    test('rand.uni(n) returns value in [0, n)', () => {
      for (let i = 0; i < 30; i++) {
        const v = turtle.rand.uni(10);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(10);
      }
    });

    test('rand.uni(lo, hi) returns value in [lo, hi)', () => {
      for (let i = 0; i < 30; i++) {
        const v = turtle.rand.uni(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThan(10);
      }
    });

    test('rand.chance(1) always returns true', () => {
      for (let i = 0; i < 10; i++) expect(turtle.rand.chance(1)).toBe(true);
    });

    test('rand.chance(0) always returns false', () => {
      for (let i = 0; i < 10; i++) expect(turtle.rand.chance(0)).toBe(false);
    });

    test('rand.norm returns a number', () => {
      expect(typeof turtle.rand.norm(0, 1)).toBe('number');
    });
  });

  // ── Method chaining ──────────────────────────────────────────────────────────

  describe('method chaining', () => {
    test('movement methods return the turtle', () => {
      expect(turtle.forward(0)).toBe(turtle);
      expect(turtle.backward(0)).toBe(turtle);
      expect(turtle.right(0)).toBe(turtle);
      expect(turtle.left(0)).toBe(turtle);
      expect(turtle.xy(0, 0)).toBe(turtle);
      expect(turtle.x(0)).toBe(turtle);
      expect(turtle.y(0)).toBe(turtle);
      expect(turtle.home()).toBe(turtle);
    });

    test('config methods return the turtle', () => {
      expect(turtle.color('#fff')).toBe(turtle);
      expect(turtle.thickness(1)).toBe(turtle);
      expect(turtle.pu()).toBe(turtle);
      expect(turtle.pd()).toBe(turtle);
      expect(turtle.clean()).toBe(turtle);
      expect(turtle.clear()).toBe(turtle);
      expect(turtle.repeat(0, () => {})).toBe(turtle);
    });

    test('on() is chainable', () => {
      expect(turtle.on('move', () => {})).toBe(turtle);
    });
  });

  // ── stop() ───────────────────────────────────────────────────────────────────

  describe('stop()', () => {
    test('prevents queued canvas draws from executing', () => {
      turtle.forward(100);
      turtle.stop();
      vi.advanceTimersByTime(2000); // well past any queue drain
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
    });

    test('synchronous state (position) is still updated after stop()', () => {
      turtle.stop();
      turtle.forward(100);
      expect(turtle.get.y()).toBeCloseTo(100);
    });

    test('events do not fire after stop()', () => {
      const handler = vi.fn();
      turtle.on('move', handler);
      turtle.forward(100);
      turtle.stop();
      vi.advanceTimersByTime(2000);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── wait() ───────────────────────────────────────────────────────────────────

  describe('wait()', () => {
    test('wait(1) delays next queued command by 1 second', () => {
      turtle.wait(1).forward(50);
      vi.advanceTimersByTime(200); // idle timer fires, processes wait item only
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000); // 1s wait elapses, processes forward
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('wait(0) does not delay the next command', () => {
      turtle.wait(0).forward(50);
      vi.advanceTimersByTime(200);
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('wait(1) is chainable', () => {
      expect(turtle.wait(1)).toBe(turtle);
    });
  });

  // ── pu / pd events ───────────────────────────────────────────────────────────

  describe('pu / pd events', () => {
    test('pu event fires after pu()', () => {
      const handler = vi.fn();
      turtle.on('pu', handler);
      turtle.pu();
      flushQueue();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('pd event fires after pd()', () => {
      const handler = vi.fn();
      turtle.on('pd', handler);
      turtle.pd();
      flushQueue();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('pu then pd fires both events in order', () => {
      const log = [];
      turtle.on('pu', () => log.push('pu'));
      turtle.on('pd', () => log.push('pd'));
      turtle.pu().pd();
      flushQueue();
      expect(log).toEqual(['pu', 'pd']);
    });
  });

  // ── onEdge ───────────────────────────────────────────────────────────────────

  describe('onEdge()', () => {
    test('fires when turtle exits canvas boundary', () => {
      const cb = vi.fn();
      turtle.onEdge(cb);
      turtle.xy(400, 0); // canvas-space x = 700.5 > 600
      flushQueue();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test('fires only once per crossing, not on every OOB move', () => {
      const cb = vi.fn();
      turtle.onEdge(cb);
      turtle.xy(400, 0).xy(450, 0); // both OOB
      flushQueue();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test('fires again after re-entry and second exit', () => {
      const cb = vi.fn();
      turtle.onEdge(cb);
      turtle.xy(400, 0); // exit
      flushQueue();
      turtle.xy(0, 0);   // re-enter: canvas-space (300.5, 300.5) — inside
      flushQueue();
      turtle.xy(400, 0); // exit again
      flushQueue();
      expect(cb).toHaveBeenCalledTimes(2);
    });

    test('does not fire when turtle stays within bounds', () => {
      const cb = vi.fn();
      turtle.onEdge(cb);
      turtle.xy(100, 100).xy(-100, -100); // both inside 600×600 canvas
      flushQueue();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── onCollide ────────────────────────────────────────────────────────────────

  describe('onCollide()', () => {
    test('fires when turtles are within dist', () => {
      const canvas2 = createCanvas();
      const turtle2 = new Turtle(canvas2);
      flushQueue();
      vi.clearAllMocks();

      const cb = vi.fn();
      turtle.onCollide(turtle2, 50, cb);
      turtle.xy(10, 0); // turtle at (10, 0), turtle2 at (0, 0) → dist=10 ≤ 50
      flushQueue();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    test('does not fire when turtles are beyond dist', () => {
      const canvas2 = createCanvas();
      const turtle2 = new Turtle(canvas2);
      flushQueue();
      vi.clearAllMocks();

      const cb = vi.fn();
      turtle.onCollide(turtle2, 50, cb);
      turtle.xy(200, 0); // dist=200 > 50
      flushQueue();
      expect(cb).not.toHaveBeenCalled();
    });

    test('fires only once per collision entry (not on every close move)', () => {
      const canvas2 = createCanvas();
      const turtle2 = new Turtle(canvas2);
      flushQueue();
      vi.clearAllMocks();

      const cb = vi.fn();
      turtle.onCollide(turtle2, 50, cb);
      turtle.xy(10, 0).xy(20, 0); // both within 50px of (0,0)
      flushQueue();
      expect(cb).toHaveBeenCalledTimes(1);
    });
  });

  // ── forever ──────────────────────────────────────────────────────────────────

  describe('forever()', () => {
    test('loops until fn returns false', () => {
      let count = 0;
      turtle.forever(() => {
        count++;
        return count < 3;
      });
      // tick() fires once synchronously (count=1), then 2 more via setTimeout(0).
      // 1ms advances needed — advanceTimersByTime(0) does not fire timers at current time.
      vi.advanceTimersByTime(1);
      vi.advanceTimersByTime(1);
      expect(count).toBe(3);
    });

    test('passes incrementing index to fn', () => {
      const indices = [];
      turtle.forever((i) => {
        indices.push(i);
        return i < 2;
      });
      vi.advanceTimersByTime(1);
      vi.advanceTimersByTime(1);
      expect(indices).toEqual([0, 1, 2]);
    });

    test('is chainable', () => {
      expect(turtle.forever(() => false)).toBe(turtle);
    });
  });

  // ── butt() ───────────────────────────────────────────────────────────────────

  describe('butt()', () => {
    test('butt(100, 0) points away from east — heading west (-90°)', () => {
      turtle.butt(100, 0);
      expect(turtle.get.heading()).toBeCloseTo(-90, 0);
    });

    test('butt(0, 100) points away from north — heading south (±180°)', () => {
      turtle.butt(0, 100);
      // atan2(dx=0, dy=100)+π = π; get.heading() = -π*(180/π) = -180
      // -180 and 180 are the same compass direction
      expect(Math.abs(turtle.get.heading())).toBeCloseTo(180, 0);
    });

    test('butt is opposite of face for same coordinate', () => {
      turtle.face(100, 0);
      const faceHeading = turtle.get.heading();
      turtle.butt(100, 0);
      const buttHeading = turtle.get.heading();
      // butt heading = face heading ± 180
      expect(Math.abs(Math.abs(faceHeading - buttHeading) - 180)).toBeLessThan(1);
    });

    test('is chainable', () => {
      expect(turtle.butt(0, 0)).toBe(turtle);
    });
  });

  // ── isIdle ───────────────────────────────────────────────────────────────────

  describe('isIdle', () => {
    test('true after init queue drains', () => {
      expect(turtle.isIdle).toBe(true);
    });

    test('false immediately after pushing a command', () => {
      turtle.forward(10);
      expect(turtle.isIdle).toBe(false);
    });

    test('true again after queue drains', () => {
      turtle.forward(10);
      flushQueue();
      expect(turtle.isIdle).toBe(true);
    });

    test('false while forever loop is active', () => {
      let stop = false;
      turtle.forever(() => !stop);
      expect(turtle.isIdle).toBe(false);
      stop = true;
      vi.advanceTimersByTime(1); // tick fires → fn returns false → activeLoops--
      expect(turtle.isIdle).toBe(true);
    });
  });

  // ── stepOnce / queueEmpty ────────────────────────────────────────────────────

  describe('stepOnce()', () => {
    test('returns false when queue is empty', () => {
      expect(turtle.stepOnce()).toBe(false);
    });

    test('returns an anti function when item is executed', () => {
      turtle.pause();
      turtle.forward(10);
      const result = turtle.stepOnce();
      expect(typeof result).toBe('function');
    });

    test('drains exactly one item per call', () => {
      turtle.pause();
      turtle.repeat(2, () => { turtle.forward(10); });
      expect(turtle.queueEmpty).toBe(false);
      expect(turtle.stepOnce()).not.toBe(false);
      expect(turtle.stepOnce()).not.toBe(false);
      expect(turtle.stepOnce()).toBe(false);
    });

    test('queueEmpty false with items, true after all drained', () => {
      turtle.pause();
      turtle.forward(10);
      expect(turtle.queueEmpty).toBe(false);
      turtle.stepOnce();
      expect(turtle.queueEmpty).toBe(true);
    });

    test('anti restores turtle position', () => {
      turtle.pause();
      const yBefore = turtle.get.y();
      turtle.forward(50); // heading=0 → moves in y
      const anti = turtle.stepOnce();
      expect(turtle.get.y()).not.toBeCloseTo(yBefore, 0);
      anti();
      expect(turtle.get.y()).toBeCloseTo(yBefore, 1);
    });

    test('anti is a no-op for state-only steps (pen up)', () => {
      turtle.pause();
      turtle.pu();
      const anti = turtle.stepOnce();
      expect(typeof anti).toBe('function');
      expect(turtle.get.pu()).toBe(true);
      anti();
      expect(turtle.get.pu()).toBe(false);
    });
  });

  // ── reset / init ─────────────────────────────────────────────────────────────

  describe('reset() / init()', () => {
    test('reset() sets background to transparent', () => {
      turtle.clean('blue');
      turtle.reset();
      expect(turtle.get.background()).toBe('transparent');
    });

    test('reset() restores default foreground color', () => {
      turtle.color('hotpink');
      turtle.reset();
      expect(turtle.get.color()).toBe('#000');
    });

    test('reset() restores default thickness', () => {
      turtle.thickness(10);
      turtle.reset();
      expect(turtle.get.thickness()).toBe('1');
    });

    test('reset() returns turtle (chainable)', () => {
      expect(turtle.reset()).toBe(turtle);
    });
  });

  // ── seek / goTo ───────────────────────────────────────────────────────────────

  describe('seek() / goTo()', () => {
    test('goTo() teleports turtle to object cx/cy', () => {
      turtle.goTo({ cx: 100, cy: 0 });
      expect(turtle.get.x()).toBeCloseTo(100);
      expect(turtle.get.y()).toBeCloseTo(0);
    });

    test('goTo() with cy moves on y axis', () => {
      turtle.goTo({ cx: 0, cy: 50 });
      expect(turtle.get.x()).toBeCloseTo(0);
      expect(turtle.get.y()).toBeCloseTo(50);
    });

    test('goTo() is chainable', () => {
      expect(turtle.goTo({ cx: 0, cy: 0 })).toBe(turtle);
    });

    test('goTo(null) is a no-op', () => {
      const xBefore = turtle.get.x();
      const yBefore = turtle.get.y();
      turtle.goTo(null);
      expect(turtle.get.x()).toBe(xBefore);
      expect(turtle.get.y()).toBe(yBefore);
    });

    test('seek() moves turtle toward object by default step (10)', () => {
      turtle.seek({ cx: 100, cy: 0 });
      expect(turtle.get.x()).toBeCloseTo(10, 0);
      expect(turtle.get.y()).toBeCloseTo(0, 0);
    });

    test('seek() accepts a custom step', () => {
      turtle.seek({ cx: 100, cy: 0 }, 25);
      expect(turtle.get.x()).toBeCloseTo(25, 0);
    });

    test('seek() is chainable', () => {
      expect(turtle.seek({ cx: 0, cy: 0 })).toBe(turtle);
    });

    test('seek(null) is a no-op', () => {
      const xBefore = turtle.get.x();
      turtle.seek(null);
      expect(turtle.get.x()).toBe(xBefore);
    });

    test('seek() draws a line when pen is down', () => {
      turtle.seek({ cx: 100, cy: 0 });
      flushQueue();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('goTo() draws a line when pen is down', () => {
      turtle.goTo({ cx: 50, cy: 50 });
      flushQueue();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });
  });

  // ── pause / resume ────────────────────────────────────────────────────────────

  describe('pause() / resume()', () => {
    test('pause() prevents queued commands from executing', () => {
      turtle.pause();
      turtle.forward(100);
      vi.advanceTimersByTime(2000);
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
    });

    test('resume() after pause() allows queued commands to execute', () => {
      turtle.pause();
      turtle.forward(100);
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
      turtle.resume();
      vi.advanceTimersByTime(500);
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('resume() processes multiple queued commands', () => {
      turtle.pause();
      turtle.forward(10).forward(10).forward(10);
      turtle.resume();
      vi.advanceTimersByTime(500);
      expect(canvas._ctx.stroke).toHaveBeenCalledTimes(3);
    });

    test('position updated synchronously even while paused', () => {
      turtle.pause();
      turtle.forward(50);
      expect(turtle.get.y()).toBeCloseTo(50);
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
    });

    test('turtle works normally after pause/resume cycle', () => {
      turtle.pause();
      turtle.resume();
      turtle.forward(10);
      flushQueue();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });
  });

  // ── arc() ─────────────────────────────────────────────────────────────────────

  describe('arc()', () => {
    test('arc() calls ctx.arc', () => {
      turtle.arc(50, 90);
      flushQueue();
      expect(canvas._ctx.arc).toHaveBeenCalled();
    });

    test('arc() calls ctx.stroke when pen is down', () => {
      turtle.arc(50, 90);
      flushQueue();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('arc() does not call ctx.stroke when pen is up', () => {
      turtle.pu().arc(50, 90);
      flushQueue();
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
    });

    test('arc() changes turtle position', () => {
      const xBefore = turtle.get.x();
      const yBefore = turtle.get.y();
      turtle.arc(50, 90);
      expect(
        Math.abs(turtle.get.x() - xBefore) + Math.abs(turtle.get.y() - yBefore)
      ).toBeGreaterThan(1);
    });

    test('arc() changes heading by the specified degrees', () => {
      turtle.arc(50, 90);
      expect(turtle.get.heading()).toBeCloseTo(-90, 0);
    });

    test('arc() is chainable', () => {
      expect(turtle.arc(50, 90)).toBe(turtle);
    });

    test('arc() with negative degrees curves in opposite direction', () => {
      turtle.arc(50, -90);
      expect(turtle.get.heading()).toBeCloseTo(90, 0);
    });
  });

  // ── rand (extended) ───────────────────────────────────────────────────────────

  describe('rand (extended)', () => {
    test('rand.norm(100, 0) returns exactly 100 when stdDev is 0', () => {
      expect(turtle.rand.norm(100, 0)).toBe(100);
    });

    test('rand.chance(0.5) returns a boolean', () => {
      expect(typeof turtle.rand.chance(0.5)).toBe('boolean');
    });

    test('rand.uni is deterministic when Math.random is mocked', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(turtle.rand.uni(10, 20)).toBeCloseTo(15);
      spy.mockRestore();
    });

    test('rand.uni(upper) single-arg uses 0 as lower bound', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      expect(turtle.rand.uni(10)).toBeCloseTo(5);
      spy.mockRestore();
    });

    test('rand.chance returns true when Math.random is below odds', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.3);
      expect(turtle.rand.chance(0.5)).toBe(true);
      spy.mockRestore();
    });

    test('rand.chance returns false when Math.random is at or above odds', () => {
      const spy = vi.spyOn(Math, 'random').mockReturnValue(0.7);
      expect(turtle.rand.chance(0.5)).toBe(false);
      spy.mockRestore();
    });
  });

  // ── stepOnce with draw operations ─────────────────────────────────────────────

  describe('stepOnce with draw operations', () => {
    test('stepOnce() executes disc() and calls ctx.arc + fill', () => {
      turtle.pause();
      turtle.disc(20);
      const result = turtle.stepOnce();
      expect(result).not.toBe(false);
      expect(canvas._ctx.arc).toHaveBeenCalled();
      expect(canvas._ctx.fill).toHaveBeenCalled();
    });

    test('stepOnce() executes circle() and calls ctx.arc + stroke', () => {
      turtle.pause();
      turtle.circle(10);
      const result = turtle.stepOnce();
      expect(result).not.toBe(false);
      expect(canvas._ctx.arc).toHaveBeenCalled();
      expect(canvas._ctx.stroke).toHaveBeenCalled();
    });

    test('stepOnce() executes clean() and calls ctx.clearRect', () => {
      turtle.pause();
      turtle.clean();
      const result = turtle.stepOnce();
      expect(result).not.toBe(false);
      expect(canvas._ctx.clearRect).toHaveBeenCalledWith(0, 0, 600, 600);
    });

    test('stepOnce() returns false after draw op drains queue', () => {
      turtle.pause();
      turtle.disc(20);
      turtle.stepOnce();
      expect(turtle.stepOnce()).toBe(false);
    });
  });

  // ── z() / getLayer() ──────────────────────────────────────────────────────────

  describe('z() / getLayer()', () => {
    test('z() switches ctx to new layer canvas', () => {
      const layer1Canvas = createCanvas(600, 600);
      window.__ar_getLayerCanvas = (n) => (n === 1 ? layer1Canvas : canvas);
      window.__ar_layer_objects = new Map();
      turtle.z(1);
      turtle.forward(10);
      flushQueue();
      expect(layer1Canvas._ctx.stroke).toHaveBeenCalled();
      expect(canvas._ctx.stroke).not.toHaveBeenCalled();
    });

    test('z() is chainable', () => {
      expect(turtle.z(0)).toBe(turtle);
    });

    test('getLayer() returns a Layer object with Layer API methods', () => {
      window.__ar_layer_objects = new Map();
      const layer = turtle.getLayer();
      expect(layer).toBeDefined();
      expect(typeof layer.blur).toBe('function');
    });

    test('getLayer() returns different layer after z() switches to new z', () => {
      const layer1Canvas = createCanvas(600, 600);
      window.__ar_getLayerCanvas = (n) => (n === 1 ? layer1Canvas : canvas);
      window.__ar_layer_objects = new Map();
      const layerBefore = turtle.getLayer();
      turtle.z(1);
      const layerAfter = turtle.getLayer();
      expect(layerBefore).not.toBe(layerAfter);
    });
  });
});
