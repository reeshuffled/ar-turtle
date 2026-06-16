import { Turtle } from '../js/turtle.js';

// ─── Canvas stub ─────────────────────────────────────────────────────────────
function createCanvas(width = 600, height = 600) {
  const ctx = {
    lineCap: '',
    strokeStyle: '#000',
    fillStyle: '#000',
    lineWidth: 1,
    beginPath: vi.fn(),
    moveTo:    vi.fn(),
    lineTo:    vi.fn(),
    stroke:    vi.fn(),
    fill:      vi.fn(),
    clearRect: vi.fn(),
    fillRect:  vi.fn(),
    arc:       vi.fn(),
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
    turtle = new Turtle(canvas);
    flushQueue();            // drain the init queue (clean + home + pd)
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

    test('default drawing color is white', () => {
      expect(turtle.get.color()).toBe('#fff');
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
});
