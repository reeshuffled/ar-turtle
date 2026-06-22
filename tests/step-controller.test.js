import { computeStepAction } from '../js/step-controller.js';

const makeTurtle = ({ isIdle = true, queueEmpty = true, antiReturn = false } = {}) => ({
  get isIdle() { return isIdle; },
  get queueEmpty() { return queueEmpty; },
  stepOnce() { return antiReturn; },
});

describe('computeStepAction', () => {
  // ── stepped ────────────────────────────────────────────────────────────────

  test('returns stepped with anti when turtle has queue item', () => {
    const anti = () => {};
    const turtle = makeTurtle({ isIdle: false, queueEmpty: false, antiReturn: anti });
    const result = computeStepAction([turtle]);
    expect(result.kind).toBe('stepped');
    expect(result.anti).toBe(anti);
  });

  test('steps first turtle that has an item', () => {
    const anti = () => {};
    const empty = makeTurtle({ antiReturn: false });
    const full = makeTurtle({ isIdle: false, queueEmpty: false, antiReturn: anti });
    const result = computeStepAction([empty, full]);
    expect(result.kind).toBe('stepped');
    expect(result.anti).toBe(anti);
  });

  test('does not call stepOnce on later turtles once one yields', () => {
    const anti = () => {};
    const calls = [];
    const first = {
      get isIdle() { return false; },
      get queueEmpty() { return false; },
      stepOnce() { calls.push('first'); return anti; },
    };
    const second = {
      get isIdle() { return false; },
      get queueEmpty() { return false; },
      stepOnce() { calls.push('second'); return anti; },
    };
    computeStepAction([first, second]);
    expect(calls).toEqual(['first']);
  });

  // ── await-forever ──────────────────────────────────────────────────────────

  test('returns await-forever when turtle is not idle but queue is empty', () => {
    // !isIdle && queueEmpty → forever loop waiting, no items queued yet
    const turtle = makeTurtle({ isIdle: false, queueEmpty: true, antiReturn: false });
    const result = computeStepAction([turtle]);
    expect(result.kind).toBe('await-forever');
  });

  test('await-forever when at least one turtle matches even if others are idle', () => {
    const idle = makeTurtle({ isIdle: true, queueEmpty: true });
    const forever = makeTurtle({ isIdle: false, queueEmpty: true, antiReturn: false });
    const result = computeStepAction([idle, forever]);
    expect(result.kind).toBe('await-forever');
  });

  // ── idle ───────────────────────────────────────────────────────────────────

  test('returns idle when all turtles are idle', () => {
    const result = computeStepAction([
      makeTurtle({ isIdle: true, queueEmpty: true }),
      makeTurtle({ isIdle: true, queueEmpty: true }),
    ]);
    expect(result.kind).toBe('idle');
  });

  test('returns idle with empty turtle list', () => {
    expect(computeStepAction([]).kind).toBe('idle');
  });

  // ── priority: stepped > await-forever ─────────────────────────────────────

  test('stepped takes priority over another turtle with forever loop', () => {
    const anti = () => {};
    const stepped = makeTurtle({ isIdle: false, queueEmpty: false, antiReturn: anti });
    const forever = makeTurtle({ isIdle: false, queueEmpty: true, antiReturn: false });
    // stepped comes first
    const result = computeStepAction([stepped, forever]);
    expect(result.kind).toBe('stepped');
  });
});
