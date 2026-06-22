// Tests for the Blockly code generators in js/blocks.js.
//
// Strategy: mock all Blockly imports so the module loads cleanly in jsdom, then
// call each generator directly via the forBlock registry.

import { vi, describe, test, expect, beforeAll } from 'vitest';

// ── Blockly mocks ─────────────────────────────────────────────────────────────

// forBlock registry — generators register themselves here as a side effect.
const forBlock = {};

vi.mock('blockly/javascript', () => ({
  javascriptGenerator: {
    forBlock,
    ORDER_ATOMIC: 0,
    // blocks.js calls scrub_.bind(javascriptGenerator) then overrides it
    scrub_: function () {},
  },
  Order: { ATOMIC: 0, NONE: 99, FUNCTION_CALL: 18 },
}));

vi.mock('blockly', () => {
  const Blocks = {};
  class FieldDropdown {
    constructor() {}
  }
  class FieldVariable {
    constructor() {}
  }
  class FieldNumber {
    constructor() {}
  }
  class FieldTextInput {
    constructor() {}
  }
  return {
    default: { Blocks, FieldDropdown, FieldVariable, FieldNumber, FieldTextInput },
    Blocks,
    FieldDropdown,
    FieldVariable,
    FieldNumber,
    FieldTextInput,
  };
});

vi.mock('@blockly/field-colour', () => ({
  FieldColour: class FieldColour {
    constructor() {}
  },
}));

vi.mock('@blockly/field-angle', () => ({
  FieldAngle: class FieldAngle {
    constructor() {}
  },
}));

vi.mock('@blockly/field-slider', () => ({
  FieldSlider: class FieldSlider {
    constructor() {}
  },
}));

vi.mock('blockly/blocks', () => ({}));

// ── Import triggers side-effect registration ──────────────────────────────────
// Must come AFTER the vi.mock() calls.
await import('../js/blocks.js');

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Create a mock Blockly block.
 *
 * @param {Record<string,string>} fields   — field values returned by getFieldValue
 * @param {Record<string,object>} inputs   — target blocks returned by getInputTargetBlock
 * @param {object|null}           next     — block returned by nextConnection.targetBlock()
 */
const makeBlock = (fields = {}, inputs = {}, next = null) => ({
  getFieldValue: (name) => fields[name] ?? '',
  getInputTargetBlock: (name) => inputs[name] ?? null,
  nextConnection: {
    targetBlock: () => next,
  },
});

/**
 * Create a mock generator.
 *
 * @param {Record<string,string>} values     — code returned by valueToCode per input name
 * @param {Record<string,string>} statements — code returned by statementToCode per input name
 */
const makeGen = (values = {}, statements = {}) => ({
  valueToCode: (_block, name, _order) => values[name] ?? '',
  statementToCode: (_block, name) => statements[name] ?? '',
  // getVariableName mirrors what Blockly does: returns the variable name as-is
  // (real Blockly mangles it, but our generators just pass through getFieldValue)
  getVariableName: (name) => name,
  blockToCode: () => '',
});

// Shortcut: invoke a generator and return its output
const gen = (name, block, g) => forBlock[name](block, g);

// ── Turtle name helper ────────────────────────────────────────────────────────
// All turtle blocks use turtleName(block, gen) which calls
//   gen.getVariableName(block.getFieldValue("TURTLE"))
// With our helpers that resolves to the TURTLE field value directly.

const T = 't'; // turtle variable name used throughout

describe('Blockly code generators', () => {
  // ── turtle_create ───────────────────────────────────────────────────────────

  describe('turtle_create', () => {
    test('layer 0 omits the z argument', () => {
      const block = makeBlock({ TURTLE: T, ZLAYER: '0' });
      const g = makeGen();
      expect(gen('turtle_create', block, g)).toBe(`const ${T} = new Turtle();\n`);
    });

    test('non-zero layer includes z argument', () => {
      const block = makeBlock({ TURTLE: T, ZLAYER: '-1' });
      const g = makeGen();
      expect(gen('turtle_create', block, g)).toBe(`const ${T} = new Turtle(-1);\n`);
    });
  });

  // ── turtle_set_layer ────────────────────────────────────────────────────────

  describe('turtle_set_layer', () => {
    test('generates .z(N) call', () => {
      const block = makeBlock({ TURTLE: T, ZLAYER: '2' });
      const g = makeGen();
      expect(gen('turtle_set_layer', block, g)).toBe(`${T}.z(2);\n`);
    });

    test('layer 0 produces .z(0)', () => {
      const block = makeBlock({ TURTLE: T, ZLAYER: '0' });
      const g = makeGen();
      expect(gen('turtle_set_layer', block, g)).toBe(`${T}.z(0);\n`);
    });
  });

  // ── turtle_forward ──────────────────────────────────────────────────────────

  describe('turtle_forward', () => {
    test('uses valueToCode for AMOUNT', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ AMOUNT: '100' });
      expect(gen('turtle_forward', block, g)).toBe(`${T}.forward(100);\n`);
    });

    test('defaults to 0 when no AMOUNT provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_forward', block, g)).toBe(`${T}.forward(0);\n`);
    });
  });

  // ── turtle_backward ─────────────────────────────────────────────────────────

  describe('turtle_backward', () => {
    test('uses valueToCode for AMOUNT', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ AMOUNT: '50' });
      expect(gen('turtle_backward', block, g)).toBe(`${T}.backward(50);\n`);
    });

    test('defaults to 0 when no AMOUNT provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_backward', block, g)).toBe(`${T}.backward(0);\n`);
    });
  });

  // ── turtle_right ────────────────────────────────────────────────────────────

  describe('turtle_right', () => {
    test('uses valueToCode for DEGREES', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ DEGREES: '90' });
      expect(gen('turtle_right', block, g)).toBe(`${T}.right(90);\n`);
    });

    test('defaults to 90 when no DEGREES provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_right', block, g)).toBe(`${T}.right(90);\n`);
    });
  });

  // ── turtle_left ─────────────────────────────────────────────────────────────

  describe('turtle_left', () => {
    test('uses valueToCode for DEGREES', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ DEGREES: '45' });
      expect(gen('turtle_left', block, g)).toBe(`${T}.left(45);\n`);
    });

    test('defaults to 90 when no DEGREES provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_left', block, g)).toBe(`${T}.left(90);\n`);
    });
  });

  // ── turtle_pen_up / pen_down ─────────────────────────────────────────────────

  describe('turtle_pen_up', () => {
    test('generates .pu() call', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_pen_up', block, g)).toBe(`${T}.pu();\n`);
    });
  });

  describe('turtle_pen_down', () => {
    test('generates .pd() call', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_pen_down', block, g)).toBe(`${T}.pd();\n`);
    });
  });

  // ── turtle_home / clear / clean ──────────────────────────────────────────────

  describe('turtle_home', () => {
    test('generates .home() call', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_home', block, g)).toBe(`${T}.home();\n`);
    });
  });

  describe('turtle_clear', () => {
    test('generates .clear() call', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_clear', block, g)).toBe(`${T}.clear();\n`);
    });
  });

  describe('turtle_clean', () => {
    test('generates .clean() call', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_clean', block, g)).toBe(`${T}.clean();\n`);
    });
  });

  // ── turtle_color ────────────────────────────────────────────────────────────

  describe('turtle_color', () => {
    test('wraps valueToCode result in .color()', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ COLOR: '"#ff0000"' });
      expect(gen('turtle_color', block, g)).toBe(`${T}.color("${  '#ff0000'  }");\n`);
    });

    test('defaults to black when no color provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_color', block, g)).toBe(`${T}.color('#000000');\n`);
    });
  });

  // ── turtle_thickness ─────────────────────────────────────────────────────────

  describe('turtle_thickness', () => {
    test('reads WIDTH field', () => {
      const block = makeBlock({ TURTLE: T, WIDTH: '5' });
      const g = makeGen();
      expect(gen('turtle_thickness', block, g)).toBe(`${T}.thickness(5);\n`);
    });

    test('defaults to 1 when WIDTH is null (not provided by Blockly)', () => {
      // makeBlock returns '' for unknown fields; real Blockly returns null for
      // unset fields. Use null explicitly to hit the ?? 1 fallback.
      const block = { getFieldValue: (name) => (name === 'TURTLE' ? T : null) };
      const g = makeGen();
      expect(gen('turtle_thickness', block, g)).toBe(`${T}.thickness(1);\n`);
    });
  });

  // ── turtle_disc / circle ─────────────────────────────────────────────────────

  describe('turtle_disc', () => {
    test('uses valueToCode for RADIUS', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ RADIUS: '20' });
      expect(gen('turtle_disc', block, g)).toBe(`${T}.disc(20);\n`);
    });

    test('defaults to 10 when no RADIUS provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_disc', block, g)).toBe(`${T}.disc(10);\n`);
    });
  });

  describe('turtle_circle', () => {
    test('uses valueToCode for RADIUS', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ RADIUS: '30' });
      expect(gen('turtle_circle', block, g)).toBe(`${T}.circle(30);\n`);
    });

    test('defaults to 10 when no RADIUS provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_circle', block, g)).toBe(`${T}.circle(10);\n`);
    });
  });

  // ── turtle_repeat ────────────────────────────────────────────────────────────

  describe('turtle_repeat', () => {
    test('wraps body in .repeat(count, () => { ... })', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ COUNT: '4' }, { DO: '  t.forward(50);\n' });
      expect(gen('turtle_repeat', block, g)).toBe(
        `${T}.repeat(4, () => {\n  t.forward(50);\n});\n`,
      );
    });

    test('defaults COUNT to 0 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({}, { DO: '' });
      expect(gen('turtle_repeat', block, g)).toBe(`${T}.repeat(0, () => {\n});\n`);
    });

    test('empty body produces empty closure', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ COUNT: '3' }, {});
      expect(gen('turtle_repeat', block, g)).toBe(`${T}.repeat(3, () => {\n});\n`);
    });
  });

  // ── turtle_forever ───────────────────────────────────────────────────────────

  describe('turtle_forever', () => {
    test('wraps body in .forever(() => { ... })', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({}, { DO: '  t.forward(10);\n' });
      expect(gen('turtle_forever', block, g)).toBe(
        `${T}.forever(() => {\n  t.forward(10);\n});\n`,
      );
    });

    test('empty body produces empty closure', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({}, {});
      expect(gen('turtle_forever', block, g)).toBe(`${T}.forever(() => {\n});\n`);
    });
  });

  // ── turtle_wait ──────────────────────────────────────────────────────────────

  describe('turtle_wait', () => {
    test('uses valueToCode for SECONDS', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ SECONDS: '2' });
      expect(gen('turtle_wait', block, g)).toBe(`${T}.wait(2);\n`);
    });

    test('defaults to 1 when no SECONDS provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_wait', block, g)).toBe(`${T}.wait(1);\n`);
    });
  });

  // ── timer_set_interval ───────────────────────────────────────────────────────

  describe('timer_set_interval', () => {
    test('generates setInterval with delay and body', () => {
      const block = makeBlock({});
      const g = makeGen({ DELAY: '100' }, { DO: '  doSomething();\n' });
      expect(gen('timer_set_interval', block, g)).toBe(
        `setInterval(() => {\n  doSomething();\n}, 100);\n`,
      );
    });

    test('defaults DELAY to 1000 when not provided', () => {
      const block = makeBlock({});
      const g = makeGen({}, {});
      expect(gen('timer_set_interval', block, g)).toBe(`setInterval(() => {\n}, 1000);\n`);
    });
  });

  // ── timer_set_timeout ────────────────────────────────────────────────────────

  describe('timer_set_timeout', () => {
    test('generates setTimeout with delay and body', () => {
      const block = makeBlock({});
      const g = makeGen({ DELAY: '500' }, { DO: '  doOnce();\n' });
      expect(gen('timer_set_timeout', block, g)).toBe(
        `setTimeout(() => {\n  doOnce();\n}, 500);\n`,
      );
    });

    test('defaults DELAY to 1000 when not provided', () => {
      const block = makeBlock({});
      const g = makeGen({}, {});
      expect(gen('timer_set_timeout', block, g)).toBe(`setTimeout(() => {\n}, 1000);\n`);
    });
  });

  // ── colour_picker ────────────────────────────────────────────────────────────

  describe('colour_picker', () => {
    test('returns JSON-stringified hex as expression tuple', () => {
      const block = makeBlock({ COLOUR: '#00ff00' });
      const g = makeGen();
      const [code, order] = gen('colour_picker', block, g);
      expect(code).toBe('"#00ff00"');
      expect(order).toBe(0); // Order.ATOMIC
    });

    test('defaults to #ff0000 when COLOUR not set', () => {
      const block = makeBlock({ COLOUR: '' });
      const g = makeGen();
      const [code] = gen('colour_picker', block, g);
      expect(code).toBe('"#ff0000"');
    });
  });

  // ── color_random ─────────────────────────────────────────────────────────────

  describe('color_random', () => {
    test('returns Color.random() as expression tuple', () => {
      const [code, order] = gen('color_random', makeBlock(), makeGen());
      expect(code).toBe('Color.random()');
      expect(order).toBe(0); // Order.ATOMIC
    });
  });

  // ── console_log ──────────────────────────────────────────────────────────────

  describe('console_log', () => {
    test('wraps valueToCode in console.log()', () => {
      const block = makeBlock({});
      const g = makeGen({ VALUE: '"hello"' });
      expect(gen('console_log', block, g)).toBe(`console.log("hello");\n`);
    });

    test('defaults to empty string when no VALUE provided', () => {
      const block = makeBlock({});
      const g = makeGen();
      expect(gen('console_log', block, g)).toBe(`console.log("");\n`);
    });
  });

  // ── program_pause / resume / stop ────────────────────────────────────────────

  describe('program_pause', () => {
    test('generates pause() call', () => {
      expect(gen('program_pause', makeBlock(), makeGen())).toBe(`pause();\n`);
    });
  });

  describe('program_resume', () => {
    test('generates resume() call', () => {
      expect(gen('program_resume', makeBlock(), makeGen())).toBe(`resume();\n`);
    });
  });

  describe('program_stop', () => {
    test('generates stop() call', () => {
      expect(gen('program_stop', makeBlock(), makeGen())).toBe(`stop();\n`);
    });
  });

  // ── event_on_start ───────────────────────────────────────────────────────────

  describe('event_on_start', () => {
    test('returns empty string when no next block', () => {
      const block = makeBlock({}, {}, null);
      const g = makeGen();
      expect(gen('event_on_start', block, g)).toBe('');
    });

    test('returns blockToCode result from next block', () => {
      const nextBlock = {};
      const block = makeBlock({}, {}, nextBlock);
      const g = { ...makeGen(), blockToCode: (b) => (b === nextBlock ? 't.forward(50);\n' : '') };
      expect(gen('event_on_start', block, g)).toBe('t.forward(50);\n');
    });
  });

  // ── event_on_key ─────────────────────────────────────────────────────────────

  describe('event_on_key', () => {
    test('wraps next chain in onKey for a specific key', () => {
      const nextBlock = {};
      const block = makeBlock({ KEY: 'ArrowUp' }, {}, nextBlock);
      const g = { ...makeGen(), blockToCode: () => '  t.forward(10);\n' };
      expect(gen('event_on_key', block, g)).toBe(
        `onKey("ArrowUp", function(__e) {\n  t.forward(10);\n});\n`,
      );
    });

    test('translates __any__ to "any"', () => {
      const block = makeBlock({ KEY: '__any__' }, {}, null);
      const g = makeGen();
      expect(gen('event_on_key', block, g)).toBe(`onKey("any", function(__e) {\n});\n`);
    });

    test('uses empty inner when no next block', () => {
      const block = makeBlock({ KEY: ' ' }, {}, null);
      const g = makeGen();
      expect(gen('event_on_key', block, g)).toBe(`onKey(" ", function(__e) {\n});\n`);
    });
  });

  // ── event_on_gesture ─────────────────────────────────────────────────────────

  describe('event_on_gesture', () => {
    test('wraps next chain in vision.onGesture', () => {
      const nextBlock = {};
      const block = makeBlock({ GESTURE: 'Thumb_Up' }, {}, nextBlock);
      const g = { ...makeGen(), blockToCode: () => '  t.forward(10);\n' };
      expect(gen('event_on_gesture', block, g)).toBe(
        `vision.onGesture("Thumb_Up", function() {\n  t.forward(10);\n});\n`,
      );
    });

    test('empty body when no next block', () => {
      const block = makeBlock({ GESTURE: 'Open_Palm' }, {}, null);
      const g = makeGen();
      expect(gen('event_on_gesture', block, g)).toBe(
        `vision.onGesture("Open_Palm", function() {\n});\n`,
      );
    });
  });

  // ── event_on_expression ──────────────────────────────────────────────────────

  describe('event_on_expression', () => {
    test('wraps next chain in vision.onExpression', () => {
      const nextBlock = {};
      const block = makeBlock({ EXPRESSION: 'smile' }, {}, nextBlock);
      const g = { ...makeGen(), blockToCode: () => '  t.disc(10);\n' };
      expect(gen('event_on_expression', block, g)).toBe(
        `vision.onExpression("smile", function() {\n  t.disc(10);\n});\n`,
      );
    });

    test('empty body when no next block', () => {
      const block = makeBlock({ EXPRESSION: 'surprise' }, {}, null);
      const g = makeGen();
      expect(gen('event_on_expression', block, g)).toBe(
        `vision.onExpression("surprise", function() {\n});\n`,
      );
    });
  });

  // ── event_on_edge ────────────────────────────────────────────────────────────

  describe('event_on_edge', () => {
    test('generates turtle.onEdge(...) with next chain', () => {
      const nextBlock = {};
      const block = makeBlock({ TURTLE: T }, {}, nextBlock);
      const g = { ...makeGen(), blockToCode: () => '  t.home();\n' };
      expect(gen('event_on_edge', block, g)).toBe(
        `${T}.onEdge(function() {\n  t.home();\n});\n`,
      );
    });

    test('empty body when no next block', () => {
      const block = makeBlock({ TURTLE: T }, {}, null);
      const g = makeGen();
      expect(gen('event_on_edge', block, g)).toBe(`${T}.onEdge(function() {\n});\n`);
    });
  });

  // ── event_on_collide ─────────────────────────────────────────────────────────

  describe('event_on_collide', () => {
    test('generates t1.onCollide(t2, dist, fn) with next chain', () => {
      const nextBlock = {};
      const block = makeBlock({ TURTLE: 't1', OTHER: 't2' }, {}, nextBlock);
      const g = {
        getVariableName: (n) => n,
        valueToCode: (_b, name) => (name === 'DIST' ? '20' : ''),
        statementToCode: () => '',
        blockToCode: () => '  t1.home();\n',
      };
      expect(gen('event_on_collide', block, g)).toBe(
        `t1.onCollide(t2, 20, function() {\n  t1.home();\n});\n`,
      );
    });

    test('defaults DIST to 20 when not provided', () => {
      const block = makeBlock({ TURTLE: 't1', OTHER: 't2' }, {}, null);
      const g = {
        getVariableName: (n) => n,
        valueToCode: () => '',
        statementToCode: () => '',
        blockToCode: () => '',
      };
      expect(gen('event_on_collide', block, g)).toBe(
        `t1.onCollide(t2, 20, function() {\n});\n`,
      );
    });
  });

  // ── turtle_xy ────────────────────────────────────────────────────────────────

  describe('turtle_xy', () => {
    test('generates .xy(x, y) from value inputs', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ X: '10', Y: '-20' });
      expect(gen('turtle_xy', block, g)).toBe(`${T}.xy(10, -20);\n`);
    });

    test('defaults X and Y to 0 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_xy', block, g)).toBe(`${T}.xy(0, 0);\n`);
    });
  });

  // ── turtle_heading ────────────────────────────────────────────────────────────

  describe('turtle_heading', () => {
    test('reads DEGREES field for absolute heading', () => {
      const block = makeBlock({ TURTLE: T, DEGREES: '45' });
      const g = makeGen();
      expect(gen('turtle_heading', block, g)).toBe(`${T}.heading(45);\n`);
    });

    test('works with 0 degrees', () => {
      const block = makeBlock({ TURTLE: T, DEGREES: '0' });
      const g = makeGen();
      expect(gen('turtle_heading', block, g)).toBe(`${T}.heading(0);\n`);
    });
  });

  // ── turtle_face ──────────────────────────────────────────────────────────────

  describe('turtle_face', () => {
    test('generates .face(x, y) from value inputs', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ X: '100', Y: '0' });
      expect(gen('turtle_face', block, g)).toBe(`${T}.face(100, 0);\n`);
    });

    test('defaults X and Y to 0 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_face', block, g)).toBe(`${T}.face(0, 0);\n`);
    });
  });

  // ── turtle_arc ───────────────────────────────────────────────────────────────

  describe('turtle_arc', () => {
    test('generates .arc(radius, degrees)', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ RADIUS: '50', DEGREES: '90' });
      expect(gen('turtle_arc', block, g)).toBe(`${T}.arc(50, 90);\n`);
    });

    test('defaults RADIUS and DEGREES to 0 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_arc', block, g)).toBe(`${T}.arc(0, 0);\n`);
    });
  });

  // ── turtle_seek ──────────────────────────────────────────────────────────────

  describe('turtle_seek', () => {
    test('generates .seek(obj, step)', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ OBJ: 'vision.nearest("cat")', STEP: '10' });
      expect(gen('turtle_seek', block, g)).toBe(
        `${T}.seek(vision.nearest("cat"), 10);\n`,
      );
    });

    test('defaults OBJ to null and STEP to 10 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_seek', block, g)).toBe(`${T}.seek(null, 10);\n`);
    });
  });

  // ── turtle_goto ──────────────────────────────────────────────────────────────

  describe('turtle_goto', () => {
    test('generates .goTo(obj)', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ OBJ: 'vision.nearest("person")' });
      expect(gen('turtle_goto', block, g)).toBe(
        `${T}.goTo(vision.nearest("person"));\n`,
      );
    });

    test('defaults OBJ to null when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_goto', block, g)).toBe(`${T}.goTo(null);\n`);
    });
  });

  // ── turtle_reset ─────────────────────────────────────────────────────────────

  describe('turtle_reset', () => {
    test('generates .reset() call', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('turtle_reset', block, g)).toBe(`${T}.reset();\n`);
    });
  });

  // ── turtle_rand_uni ──────────────────────────────────────────────────────────

  describe('turtle_rand_uni', () => {
    test('returns randUni(lo, hi) as expression tuple', () => {
      const block = makeBlock({});
      const g = makeGen({ LO: '0', HI: '100' });
      const [code, order] = gen('turtle_rand_uni', block, g);
      expect(code).toBe('randUni(0, 100)');
      expect(order).toBe(18); // Order.FUNCTION_CALL
    });

    test('defaults LO to 0 and HI to 100 when not provided', () => {
      const block = makeBlock({});
      const g = makeGen();
      const [code] = gen('turtle_rand_uni', block, g);
      expect(code).toBe('randUni(0, 100)');
    });
  });

  // ── vision_nearest ───────────────────────────────────────────────────────────

  describe('vision_nearest', () => {
    test('returns vision.nearest("label") as expression tuple', () => {
      const block = makeBlock({ LABEL: 'cat' });
      const g = makeGen();
      const [code, order] = gen('vision_nearest', block, g);
      expect(code).toBe('vision.nearest("cat")');
      expect(order).toBe(18); // Order.FUNCTION_CALL
    });
  });

  // ── vision_any ───────────────────────────────────────────────────────────────

  describe('vision_any', () => {
    test('returns vision.any("label") as expression tuple', () => {
      const block = makeBlock({ LABEL: 'person' });
      const g = makeGen();
      const [code, order] = gen('vision_any', block, g);
      expect(code).toBe('vision.any("person")');
      expect(order).toBe(18);
    });
  });

  // ── vision_count ─────────────────────────────────────────────────────────────

  describe('vision_count', () => {
    test('returns vision.count("label") as expression tuple', () => {
      const block = makeBlock({ LABEL: 'dog' });
      const g = makeGen();
      const [code, order] = gen('vision_count', block, g);
      expect(code).toBe('vision.count("dog")');
      expect(order).toBe(18);
    });
  });

  // ── turtle_get_x / turtle_get_y ──────────────────────────────────────────────

  describe('turtle_get_x', () => {
    test('returns turtle.get.x() as expression tuple', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      const [code, order] = gen('turtle_get_x', block, g);
      expect(code).toBe(`${T}.get.x()`);
      expect(order).toBe(18);
    });
  });

  describe('turtle_get_y', () => {
    test('returns turtle.get.y() as expression tuple', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      const [code, order] = gen('turtle_get_y', block, g);
      expect(code).toBe(`${T}.get.y()`);
      expect(order).toBe(18);
    });
  });

  // ── canvas_width / canvas_height ─────────────────────────────────────────────

  describe('canvas_width', () => {
    test('returns turtle.getCanvas().width as expression tuple', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      const [code, order] = gen('canvas_width', block, g);
      expect(code).toBe(`${T}.getCanvas().width`);
      expect(order).toBe(18);
    });
  });

  describe('canvas_height', () => {
    test('returns turtle.getCanvas().height as expression tuple', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      const [code, order] = gen('canvas_height', block, g);
      expect(code).toBe(`${T}.getCanvas().height`);
      expect(order).toBe(18);
    });
  });

  // ── Layer generators ──────────────────────────────────────────────────────────
  // All layer generators produce turtle.getLayer().<method>(...)

  describe('layer_blur', () => {
    test('generates getLayer().blur(px)', () => {
      const block = makeBlock({ TURTLE: T, PX: '5' });
      const g = makeGen();
      expect(gen('layer_blur', block, g)).toBe(`${T}.getLayer().blur(5);\n`);
    });
  });

  describe('layer_hue', () => {
    test('generates getLayer().hue(deg)', () => {
      const block = makeBlock({ TURTLE: T, DEG: '180' });
      const g = makeGen();
      expect(gen('layer_hue', block, g)).toBe(`${T}.getLayer().hue(180);\n`);
    });
  });

  describe('layer_brightness', () => {
    test('generates getLayer().brightness(n)', () => {
      const block = makeBlock({ TURTLE: T, N: '1.5' });
      const g = makeGen();
      expect(gen('layer_brightness', block, g)).toBe(`${T}.getLayer().brightness(1.5);\n`);
    });
  });

  describe('layer_saturate', () => {
    test('generates getLayer().saturate(n)', () => {
      const block = makeBlock({ TURTLE: T, N: '2' });
      const g = makeGen();
      expect(gen('layer_saturate', block, g)).toBe(`${T}.getLayer().saturate(2);\n`);
    });
  });

  describe('layer_invert', () => {
    test('generates getLayer().invert(n)', () => {
      const block = makeBlock({ TURTLE: T, N: '1' });
      const g = makeGen();
      expect(gen('layer_invert', block, g)).toBe(`${T}.getLayer().invert(1);\n`);
    });
  });

  describe('layer_opacity', () => {
    test('generates getLayer().opacity(n)', () => {
      const block = makeBlock({ TURTLE: T, N: '0.5' });
      const g = makeGen();
      expect(gen('layer_opacity', block, g)).toBe(`${T}.getLayer().opacity(0.5);\n`);
    });
  });

  describe('layer_rotate', () => {
    test('generates getLayer().rotate(deg)', () => {
      const block = makeBlock({ TURTLE: T, DEG: '45' });
      const g = makeGen();
      expect(gen('layer_rotate', block, g)).toBe(`${T}.getLayer().rotate(45);\n`);
    });
  });

  describe('layer_rotateX', () => {
    test('generates getLayer().rotateX(deg) from value input', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ DEG: '30' });
      expect(gen('layer_rotateX', block, g)).toBe(`${T}.getLayer().rotateX(30);\n`);
    });

    test('defaults DEG to 30 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_rotateX', block, g)).toBe(`${T}.getLayer().rotateX(30);\n`);
    });
  });

  describe('layer_rotateY', () => {
    test('generates getLayer().rotateY(deg) from value input', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ DEG: '45' });
      expect(gen('layer_rotateY', block, g)).toBe(`${T}.getLayer().rotateY(45);\n`);
    });

    test('defaults DEG to 30 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_rotateY', block, g)).toBe(`${T}.getLayer().rotateY(30);\n`);
    });
  });

  describe('layer_scale', () => {
    test('generates getLayer().scale(n) from value input', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ N: '2' });
      expect(gen('layer_scale', block, g)).toBe(`${T}.getLayer().scale(2);\n`);
    });

    test('defaults N to 1 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_scale', block, g)).toBe(`${T}.getLayer().scale(1);\n`);
    });
  });

  describe('layer_perspective', () => {
    test('generates getLayer().perspective(px) from value input', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ PX: '800' });
      expect(gen('layer_perspective', block, g)).toBe(`${T}.getLayer().perspective(800);\n`);
    });

    test('defaults PX to 600 when not provided', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_perspective', block, g)).toBe(`${T}.getLayer().perspective(600);\n`);
    });
  });

  describe('layer_clip', () => {
    test('generates getLayer().clip(str) from value input', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ STR: "'polygon(50% 0%, 100% 100%, 0% 100%)'" });
      expect(gen('layer_clip', block, g)).toBe(
        `${T}.getLayer().clip('polygon(50% 0%, 100% 100%, 0% 100%)');\n`,
      );
    });

    test("defaults STR to 'circle(50%)' when not provided", () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_clip', block, g)).toBe(`${T}.getLayer().clip('circle(50%)');\n`);
    });
  });

  describe('layer_filter_raw', () => {
    test('generates getLayer().filter(str) from value input', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen({ STR: "'blur(5px)'" });
      expect(gen('layer_filter_raw', block, g)).toBe(`${T}.getLayer().filter('blur(5px)');\n`);
    });

    test("defaults STR to '' when not provided", () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_filter_raw', block, g)).toBe(`${T}.getLayer().filter('');\n`);
    });
  });

  describe('layer_reset', () => {
    test('generates getLayer().reset()', () => {
      const block = makeBlock({ TURTLE: T });
      const g = makeGen();
      expect(gen('layer_reset', block, g)).toBe(`${T}.getLayer().reset();\n`);
    });
  });
});
