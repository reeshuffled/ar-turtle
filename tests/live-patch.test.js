import { transformForLivePatch, friendlyError, addInfiniteLoopProtection } from '../js/live-patch.js';

// ── transformForLivePatch ────────────────────────────────────────────────────

describe('transformForLivePatch', () => {
  test('returns original code unchanged when no turtle is declared', () => {
    const code = 'console.log("hello");';
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(result).toBe(code);
    expect(liveDefaults).toEqual({});
  });

  test('returns original code when no patchable calls are in loops', () => {
    const code = `const turtle = new Turtle();\nturtle.forward(100);`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(result).toBe(code);
    expect(liveDefaults).toEqual({});
  });

  test('rewrites color literal inside forever callback', () => {
    const code = `const turtle = new Turtle();\nturtle.forever(() => { turtle.color("red"); });`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults.color).toBe('red');
    expect(result).toContain('window.__ar_live.color');
    // turtle call should use the live var, not the literal (the initializer still has "red" as JSON)
    expect(result).toContain('turtle.color(window.__ar_live.color)');
    expect(result).not.toContain('turtle.color("red")');
  });

  test('rewrites thickness literal inside forever callback', () => {
    const code = `const turtle = new Turtle();\nturtle.forever(() => { turtle.thickness(3); });`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults.thickness).toBe(3);
    expect(result).toContain('window.__ar_live.thickness');
  });

  test('rewrites color inside setInterval callback', () => {
    const code = `const turtle = new Turtle();\nsetInterval(() => { turtle.color("blue"); }, 100);`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults.color).toBe('blue');
    expect(result).toContain('window.__ar_live.color');
  });

  test('rewrites color inside setTimeout callback', () => {
    const code = `const turtle = new Turtle();\nsetTimeout(() => { turtle.color("green"); }, 500);`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults.color).toBe('green');
    expect(result).toContain('window.__ar_live.color');
  });

  test('rewrites color inside repeat callback', () => {
    const code = `const turtle = new Turtle();\nturtle.repeat(4, () => { turtle.color("purple"); });`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults.color).toBe('purple');
    expect(result).toContain('window.__ar_live.color');
  });

  test('does not rewrite top-level turtle.color call', () => {
    const code = `const turtle = new Turtle();\nturtle.color("orange");`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults).toEqual({});
    expect(result).toContain('"orange"');
  });

  test('does not rewrite non-literal (variable) color arg', () => {
    const code = `const turtle = new Turtle();\nconst c = "red";\nturtle.forever(() => { turtle.color(c); });`;
    const { code: result, liveDefaults } = transformForLivePatch(code);
    expect(liveDefaults).toEqual({});
    expect(result).not.toContain('window.__ar_live');
  });

  test('prepends window.__ar_live initializer when patches applied', () => {
    const code = `const turtle = new Turtle();\nturtle.forever(() => { turtle.color("red"); });`;
    const { code: result } = transformForLivePatch(code);
    expect(result.startsWith('window.__ar_live = ')).toBe(true);
  });

  test('returns empty liveDefaults for invalid code', () => {
    const { code: result, liveDefaults } = transformForLivePatch('((( invalid');
    expect(liveDefaults).toEqual({});
  });
});

// ── friendlyError ────────────────────────────────────────────────────────────

describe('friendlyError', () => {
  test('formats duplicate identifier error', () => {
    const msg = friendlyError(new Error("Identifier 'turtle' has already been declared"));
    expect(msg).toContain('turtle');
    expect(msg).toContain('declared twice');
  });

  test('formats not-a-function error with single quotes', () => {
    const msg = friendlyError(new Error("'turtle.forwrd' is not a function"));
    expect(msg).toContain('is not a function');
  });

  test('formats not-defined error', () => {
    const msg = friendlyError(new Error("myVar is not defined"));
    expect(msg).toContain('myVar');
    expect(msg).toContain('not defined');
  });

  test('formats cannot-read-property error with property name', () => {
    const msg = friendlyError(new Error("Cannot read properties of undefined (reading 'forward')"));
    expect(msg).toContain('.forward');
  });

  test('formats cannot-read-property error without property name', () => {
    const msg = friendlyError(new Error("Cannot read property of null"));
    expect(msg).toContain("doesn't exist yet");
  });

  test('formats unexpected token as syntax error', () => {
    const msg = friendlyError(new Error("Unexpected token '}'"));
    expect(msg).toContain('Syntax error');
  });

  test('formats unexpected identifier as syntax error', () => {
    const msg = friendlyError(new Error("Unexpected identifier 'foo'"));
    expect(msg).toContain('Syntax error');
  });

  test('passes infinite loop message through unchanged', () => {
    const raw = "Infinite loop detected. Please make changes and press Execute Program when you are ready to try again.";
    expect(friendlyError(new Error(raw))).toBe(raw);
  });

  test('strips TypeError prefix from unrecognised errors', () => {
    const msg = friendlyError(new Error("TypeError: something unexpected"));
    expect(msg).not.toMatch(/^TypeError:/);
    expect(msg).toContain('something unexpected');
  });

  test('accepts a plain string (not Error object)', () => {
    const msg = friendlyError("myFunc is not defined");
    expect(msg).toContain('myFunc');
  });
});

// ── addInfiniteLoopProtection ────────────────────────────────────────────────

describe('addInfiniteLoopProtection', () => {
  test('injects loop guard into for loop', () => {
    const code = `for (let i = 0; i < 10; i++) { doSomething(); }`;
    const result = addInfiniteLoopProtection(code);
    expect(result).toContain('Date.now()');
    expect(result).toContain('window.stopRunning()');
  });

  test('injects loop guard into while loop', () => {
    const code = `while (true) { doSomething(); }`;
    const result = addInfiniteLoopProtection(code);
    expect(result).toContain('Date.now()');
  });

  test('injects loop guard into do-while loop', () => {
    const code = `do { doSomething(); } while (true);`;
    const result = addInfiniteLoopProtection(code);
    expect(result).toContain('Date.now()');
  });

  test('leaves code without loops unchanged', () => {
    const code = `const x = 1 + 2;`;
    const result = addInfiniteLoopProtection(code);
    expect(result).toBe(code);
  });

  test('injects unique variable per loop', () => {
    const code = `for (let i = 0; i < 3; i++) {}\nfor (let j = 0; j < 3; j++) {}`;
    const result = addInfiniteLoopProtection(code);
    expect(result).toContain('_wmloopvar1');
    expect(result).toContain('_wmloopvar2');
  });
});
