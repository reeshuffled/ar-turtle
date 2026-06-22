import { UndoStack } from '../js/undo-stack.js';

const makeAnti = (bytes, id) => {
  const fn = () => fn.calls++;
  fn.bytes = bytes;
  fn.calls = 0;
  fn.id = id;
  return fn;
};

describe('UndoStack', () => {
  // ── push / pop basics ──────────────────────────────────────────────────────

  test('starts empty', () => {
    const s = new UndoStack(1000);
    expect(s.length).toBe(0);
    expect(s.bytes).toBe(0);
  });

  test('pop on empty stack returns null', () => {
    expect(new UndoStack(1000).pop()).toBeNull();
  });

  test('push increases length and bytes', () => {
    const s = new UndoStack(1_000_000);
    s.push(makeAnti(100, 'a'));
    expect(s.length).toBe(1);
    expect(s.bytes).toBe(100);
    s.push(makeAnti(200, 'b'));
    expect(s.length).toBe(2);
    expect(s.bytes).toBe(300);
  });

  test('pop returns most recent entry (LIFO)', () => {
    const s = new UndoStack(1_000_000);
    const a = makeAnti(100, 'a');
    const b = makeAnti(200, 'b');
    s.push(a);
    s.push(b);
    expect(s.pop()).toBe(b);
    expect(s.pop()).toBe(a);
  });

  test('pop decrements bytes', () => {
    const s = new UndoStack(1_000_000);
    s.push(makeAnti(100, 'a'));
    s.push(makeAnti(200, 'b'));
    s.pop();
    expect(s.bytes).toBe(100);
    s.pop();
    expect(s.bytes).toBe(0);
  });

  test('calling popped anti executes it', () => {
    const s = new UndoStack(1_000_000);
    const a = makeAnti(50, 'a');
    s.push(a);
    s.pop()();
    expect(a.calls).toBe(1);
  });

  // ── byte budget eviction ───────────────────────────────────────────────────

  test('evicts oldest entry when budget exceeded', () => {
    const s = new UndoStack(250);
    const a = makeAnti(100, 'a');
    const b = makeAnti(100, 'b');
    const c = makeAnti(100, 'c');
    s.push(a);
    s.push(b);
    s.push(c); // total would be 300 > 250 → evicts a
    expect(s.length).toBe(2);
    expect(s.bytes).toBe(200);
    // b is now oldest; pop returns c
    expect(s.pop()).toBe(c);
    expect(s.pop()).toBe(b);
  });

  test('evicts multiple oldest entries if needed', () => {
    const s = new UndoStack(150);
    s.push(makeAnti(100, 'a'));
    s.push(makeAnti(100, 'b'));
    s.push(makeAnti(100, 'c')); // needs to evict a AND b to fit c within 150
    expect(s.length).toBe(1);
    expect(s.bytes).toBe(100);
  });

  test('always keeps at least one entry even if it exceeds budget', () => {
    const s = new UndoStack(10); // tiny budget
    s.push(makeAnti(1_000_000, 'huge'));
    expect(s.length).toBe(1); // not evicted — need at least one
    expect(s.bytes).toBe(1_000_000);
  });

  test('bytes never goes negative after pop', () => {
    const s = new UndoStack(1_000_000);
    s.push(makeAnti(0)); // anti with no bytes property
    s.pop();
    expect(s.bytes).toBe(0);
  });

  // ── entries without .bytes ─────────────────────────────────────────────────

  test('entries without .bytes are treated as 0 bytes', () => {
    const s = new UndoStack(100);
    const fn = () => {};  // no .bytes
    s.push(fn);
    expect(s.bytes).toBe(0);
    expect(s.length).toBe(1);
    s.pop();
    expect(s.bytes).toBe(0);
  });

  // ── clear ──────────────────────────────────────────────────────────────────

  test('clear resets length and bytes to zero', () => {
    const s = new UndoStack(1_000_000);
    s.push(makeAnti(100, 'a'));
    s.push(makeAnti(200, 'b'));
    s.clear();
    expect(s.length).toBe(0);
    expect(s.bytes).toBe(0);
    expect(s.pop()).toBeNull();
  });

  // ── step-sequence simulation ───────────────────────────────────────────────

  describe('step / step-back sequence', () => {
    // Simulates mock turtles with a queue of anti closures.
    const makeTurtle = (...antis) => {
      let idx = 0;
      return {
        get isIdle() { return idx >= antis.length; },
        get queueEmpty() { return idx >= antis.length; },
        stepOnce() { return idx < antis.length ? antis[idx++] : false; },
      };
    };

    const stepForward = (turtles, stack) => {
      for (const t of turtles) {
        const anti = t.stepOnce();
        if (anti !== false) { stack.push(anti); return true; }
      }
      return false;
    };

    const stepBackward = (stack) => {
      const anti = stack.pop();
      if (!anti) return false;
      anti();
      return true;
    };

    test('stepping forward accumulates antis', () => {
      const stack = new UndoStack(1_000_000);
      const a = makeAnti(10, 'a');
      const b = makeAnti(10, 'b');
      const turtle = makeTurtle(a, b);
      stepForward([turtle], stack);
      stepForward([turtle], stack);
      expect(stack.length).toBe(2);
      expect(stack.bytes).toBe(20);
    });

    test('step back calls anti and shrinks stack', () => {
      const stack = new UndoStack(1_000_000);
      const a = makeAnti(10, 'a');
      const turtle = makeTurtle(a);
      stepForward([turtle], stack);
      stepBackward(stack);
      expect(a.calls).toBe(1);
      expect(stack.length).toBe(0);
    });

    test('full forward-back-forward sequence', () => {
      const stack = new UndoStack(1_000_000);
      const a = makeAnti(10, 'a');
      const b = makeAnti(10, 'b');
      const turtle = makeTurtle(a, b);
      stepForward([turtle], stack); // step a
      stepForward([turtle], stack); // step b
      stepBackward(stack);           // undo b
      expect(b.calls).toBe(1);
      expect(stack.length).toBe(1);
      expect(stack.bytes).toBe(10);
    });

    test('budget eviction during stepping', () => {
      const stack = new UndoStack(15); // budget: 15 bytes
      const antis = [makeAnti(10, 'a'), makeAnti(10, 'b'), makeAnti(10, 'c')];
      const turtle = makeTurtle(...antis);
      stepForward([turtle], stack); // a: 10 bytes
      stepForward([turtle], stack); // b: evicts a, keeps b (10 bytes)
      stepForward([turtle], stack); // c: evicts b, keeps c (10 bytes)
      expect(stack.length).toBe(1);
    });
  });
});
