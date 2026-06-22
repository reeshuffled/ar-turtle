import { textToBlocks } from '../js/text-to-blocks.js';

// ─── Mock workspace factory ───────────────────────────────────────────────────

let _blockId = 0;

function makeBlock(type) {
  const fields = {};
  const inputs = {};
  const block = {
    type,
    fields,
    inputs,
    _connections: [],
    nextConnection: {
      connect: (other) => block._connections.push({ side: 'next', to: other }),
    },
    previousConnection: {
      _owner: null, // set below
    },
    outputConnection: {
      _owner: null,
    },
    getField: (name) => ({
      setValue: (v) => {
        fields[name] = v;
      },
    }),
    setFieldValue: (v, name) => {
      fields[name] = v;
    },
    getInput: (name) => {
      if (!inputs[name]) {
        const conn = {
          connect: (other) => {
            block._connections.push({ input: name, to: other });
          },
        };
        inputs[name] = { connection: conn };
      }
      return inputs[name];
    },
    initSvg: () => {},
    render: () => {},
    setShadow: () => {},
    moveBy: () => {},
    getId: () => `block_${_blockId++}`,
  };
  block.previousConnection._owner = block;
  block.outputConnection._owner = block;
  return block;
}

function makeWorkspace() {
  const blocks = [];

  // Simple variable map — tracks variables by (name, type)
  const _vars = new Map();
  const variableMap = {
    getVariable: (name, type) => _vars.get(`${name}:${type}`) ?? null,
    createVariable: (name, type) => {
      const id = `var_${name}_${_blockId++}`;
      const v = { getId: () => id, name, type };
      _vars.set(`${name}:${type}`, v);
      return v;
    },
  };

  return {
    variableMap,
    _blocks: blocks,
    clear: () => {
      blocks.length = 0;
      _blockId = 0;
    },
    newBlock: (type) => {
      const b = makeBlock(type);
      blocks.push(b);
      return b;
    },
    getBlocksByType: (_type, _bool) => [],
    getAllBlocks: (_bool) => [],
    // Helpers for assertions
    blocksOfType: (type) => blocks.filter((b) => b.type === type),
    firstOfType: (type) => blocks.find((b) => b.type === type),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Get the value stored in the math_number shadow connected to a named input.
// makeNumBlock creates a shadow, then calls block.getInput(inputName).connection.connect(shadow.outputConnection).
// That records { input: inputName, to: shadow.outputConnection } in block._connections.
// shadow.outputConnection._owner is the shadow block itself, so we can read its NUM field.
function shadowValueForInput(block, inputName) {
  const conn = block._connections.find((c) => c.input === inputName);
  if (!conn) return undefined;
  return conn.to?._owner?.fields?.NUM;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('textToBlocks', () => {
  beforeEach(() => {
    _blockId = 0;
  });

  // ── Graceful failure cases ──────────────────────────────────────────────────

  describe('graceful failure', () => {
    test('returns false for invalid JS syntax', () => {
      const ws = makeWorkspace();
      const result = textToBlocks('{ broken syntax !!!', ws);
      expect(result).toBe(false);
    });

    test('does not throw for invalid JS syntax', () => {
      const ws = makeWorkspace();
      expect(() => textToBlocks('{ broken syntax !!!', ws)).not.toThrow();
    });

    test('returns false when no Turtle declaration is found', () => {
      const ws = makeWorkspace();
      const result = textToBlocks('const x = 5; console.log(x);', ws);
      expect(result).toBe(false);
    });

    test('returns false for empty string', () => {
      const ws = makeWorkspace();
      const result = textToBlocks('', ws);
      expect(result).toBe(false);
    });

    test('handles code with only a turtle declaration gracefully', () => {
      const ws = makeWorkspace();
      const result = textToBlocks('const t = new Turtle();', ws);
      // Should not throw and should return truthy (hat + create block)
      expect(result).not.toBe(false);
    });
  });

  // ── turtle_create block ─────────────────────────────────────────────────────

  describe('turtle_create block', () => {
    test('creates a turtle_create block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle();', ws);
      expect(ws.blocksOfType('turtle_create').length).toBeGreaterThan(0);
    });

    test('sets ZLAYER field to 0 for new Turtle() with no args', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle();', ws);
      const create = ws.firstOfType('turtle_create');
      expect(create.fields.ZLAYER).toBe('0');
    });

    test('sets ZLAYER field to 1 for new Turtle(1)', () => {
      const ws = makeWorkspace();
      textToBlocks('const t2 = new Turtle(1);', ws);
      const create = ws.firstOfType('turtle_create');
      expect(create.fields.ZLAYER).toBe('1');
    });

    test('uses let declaration for turtle variable', () => {
      const ws = makeWorkspace();
      textToBlocks('let t = new Turtle();', ws);
      expect(ws.blocksOfType('turtle_create').length).toBeGreaterThan(0);
    });

    test('uses var declaration for turtle variable', () => {
      const ws = makeWorkspace();
      textToBlocks('var t = new Turtle();', ws);
      expect(ws.blocksOfType('turtle_create').length).toBeGreaterThan(0);
    });
  });

  // ── event_on_start hat block ────────────────────────────────────────────────

  describe('event_on_start hat block', () => {
    test('prepends event_on_start when no event hat exists', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(100);', ws);
      expect(ws.blocksOfType('event_on_start').length).toBe(1);
    });

    test('event_on_start block is created', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(100);', ws);
      const hat = ws.firstOfType('event_on_start');
      expect(hat).toBeDefined();
    });
  });

  // ── forward / backward ──────────────────────────────────────────────────────

  describe('forward / backward', () => {
    test('t.forward(100) creates a turtle_forward block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(100);', ws);
      expect(ws.blocksOfType('turtle_forward').length).toBe(1);
    });

    test('t.forward(100) sets AMOUNT shadow to 100', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(100);', ws);
      const fwd = ws.firstOfType('turtle_forward');
      expect(shadowValueForInput(fwd, 'AMOUNT')).toBe('100');
    });

    test('t.forward(-50) sets AMOUNT shadow to -50', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(-50);', ws);
      const fwd = ws.firstOfType('turtle_forward');
      expect(shadowValueForInput(fwd, 'AMOUNT')).toBe('-50');
    });

    test('t.backward(75) creates a turtle_backward block with AMOUNT=75', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.backward(75);', ws);
      const bwd = ws.firstOfType('turtle_backward');
      expect(bwd).toBeDefined();
      expect(shadowValueForInput(bwd, 'AMOUNT')).toBe('75');
    });
  });

  // ── right / left ────────────────────────────────────────────────────────────

  describe('right / left', () => {
    test('t.right(90) creates a turtle_right block with DEGREES=90', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.right(90);', ws);
      const r = ws.firstOfType('turtle_right');
      expect(r).toBeDefined();
      expect(shadowValueForInput(r, 'DEGREES')).toBe('90');
    });

    test('t.right() with no args defaults DEGREES to 90', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.right();', ws);
      const r = ws.firstOfType('turtle_right');
      expect(r).toBeDefined();
      expect(shadowValueForInput(r, 'DEGREES')).toBe('90');
    });

    test('t.left(45) creates a turtle_left block with DEGREES=45', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.left(45);', ws);
      const l = ws.firstOfType('turtle_left');
      expect(l).toBeDefined();
      expect(shadowValueForInput(l, 'DEGREES')).toBe('45');
    });

    test('t.left() with no args defaults DEGREES to 90', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.left();', ws);
      const l = ws.firstOfType('turtle_left');
      expect(l).toBeDefined();
      expect(shadowValueForInput(l, 'DEGREES')).toBe('90');
    });
  });

  // ── multi-statement chaining ────────────────────────────────────────────────

  describe('multi-statement', () => {
    test('three method calls create three method blocks', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(50); t.right(90); t.forward(50);', ws);
      expect(ws.blocksOfType('turtle_forward').length).toBe(2);
      expect(ws.blocksOfType('turtle_right').length).toBe(1);
    });

    test('blocks are chained via next/previous connections', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forward(50); t.right(90);', ws);
      // At least one block should have a next connection recorded
      const connected = ws._blocks.some((b) => b._connections.some((c) => c.side === 'next'));
      expect(connected).toBe(true);
    });
  });

  // ── color ───────────────────────────────────────────────────────────────────

  describe('color', () => {
    test('t.color("red") creates a turtle_color block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.color("red");', ws);
      expect(ws.firstOfType('turtle_color')).toBeDefined();
    });

    test('t.color("#ff0000") sets COLOR field to #ff0000', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.color("#ff0000");', ws);
      const colorBlock = ws.firstOfType('turtle_color');
      expect(colorBlock.fields.COLOR).toBe('#ff0000');
    });

    test('named color falls back to the color name when canvas cannot resolve it', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.color("blue");', ws);
      const colorBlock = ws.firstOfType('turtle_color');
      // In jsdom the canvas 2d stub doesn't normalise named colors to hex,
      // so namedColorToHex returns null and makeColorBlock falls back to the
      // raw string value.
      expect(colorBlock.fields.COLOR).toBe('blue');
    });
  });

  // ── wait ────────────────────────────────────────────────────────────────────

  describe('wait', () => {
    test('t.wait(2) creates a turtle_wait block with SECONDS=2', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.wait(2);', ws);
      const w = ws.firstOfType('turtle_wait');
      expect(w).toBeDefined();
      expect(shadowValueForInput(w, 'SECONDS')).toBe('2');
    });

    test('t.wait(0.5) creates a turtle_wait block with SECONDS=0.5', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.wait(0.5);', ws);
      const w = ws.firstOfType('turtle_wait');
      expect(shadowValueForInput(w, 'SECONDS')).toBe('0.5');
    });
  });

  // ── xy / heading ─────────────────────────────────────────────────────────────

  describe('xy', () => {
    test('t.xy(50, -30) creates a turtle_xy block with X=50 and Y=-30', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.xy(50, -30);', ws);
      const xy = ws.firstOfType('turtle_xy');
      expect(xy).toBeDefined();
      expect(shadowValueForInput(xy, 'X')).toBe('50');
      expect(shadowValueForInput(xy, 'Y')).toBe('-30');
    });
  });

  describe('heading', () => {
    test('t.heading(45) creates a turtle_heading block with DEGREES=45', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.heading(45);', ws);
      const h = ws.firstOfType('turtle_heading');
      expect(h).toBeDefined();
      expect(h.fields.DEGREES).toBe('45');
    });

    test('t.heading(0) sets DEGREES to 0', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.heading(0);', ws);
      const h = ws.firstOfType('turtle_heading');
      expect(h.fields.DEGREES).toBe('0');
    });
  });

  // ── simple blocks (pu, pd, home, clear, clean, reset) ─────────────────────

  describe('simple blocks', () => {
    test('t.pu() creates a turtle_pen_up block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.pu();', ws);
      expect(ws.firstOfType('turtle_pen_up')).toBeDefined();
    });

    test('t.pd() creates a turtle_pen_down block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.pd();', ws);
      expect(ws.firstOfType('turtle_pen_down')).toBeDefined();
    });

    test('t.home() creates a turtle_home block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.home();', ws);
      expect(ws.firstOfType('turtle_home')).toBeDefined();
    });

    test('t.clear() creates a turtle_clear block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.clear();', ws);
      expect(ws.firstOfType('turtle_clear')).toBeDefined();
    });

    test('t.clean() creates a turtle_clean block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.clean();', ws);
      expect(ws.firstOfType('turtle_clean')).toBeDefined();
    });

    test('t.reset() creates a turtle_reset block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.reset();', ws);
      expect(ws.firstOfType('turtle_reset')).toBeDefined();
    });
  });

  // ── disc / circle / thickness ──────────────────────────────────────────────

  describe('disc / circle / thickness', () => {
    test('t.disc(20) creates a turtle_disc block with RADIUS=20', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.disc(20);', ws);
      const d = ws.firstOfType('turtle_disc');
      expect(d).toBeDefined();
      expect(shadowValueForInput(d, 'RADIUS')).toBe('20');
    });

    test('t.circle(30) creates a turtle_circle block with RADIUS=30', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.circle(30);', ws);
      const c = ws.firstOfType('turtle_circle');
      expect(c).toBeDefined();
      expect(shadowValueForInput(c, 'RADIUS')).toBe('30');
    });

    test('t.thickness(3) creates a turtle_thickness block with WIDTH=3', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.thickness(3);', ws);
      const th = ws.firstOfType('turtle_thickness');
      expect(th).toBeDefined();
      expect(th.fields.WIDTH).toBe('3');
    });
  });

  // ── arc ─────────────────────────────────────────────────────────────────────

  describe('arc', () => {
    test('t.arc(50, 90) creates a turtle_arc block with RADIUS=50 and DEGREES=90', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.arc(50, 90);', ws);
      const arc = ws.firstOfType('turtle_arc');
      expect(arc).toBeDefined();
      expect(shadowValueForInput(arc, 'RADIUS')).toBe('50');
      expect(shadowValueForInput(arc, 'DEGREES')).toBe('90');
    });
  });

  // ── repeat ──────────────────────────────────────────────────────────────────

  describe('repeat', () => {
    test('t.repeat(4, () => { t.forward(100); }) creates a turtle_repeat block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.repeat(4, () => { t.forward(100); });', ws);
      expect(ws.firstOfType('turtle_repeat')).toBeDefined();
    });

    test('repeat block COUNT shadow is 4', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.repeat(4, () => { t.forward(100); });', ws);
      const rep = ws.firstOfType('turtle_repeat');
      expect(shadowValueForInput(rep, 'COUNT')).toBe('4');
    });

    test('inner forward block is created inside repeat body', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.repeat(4, () => { t.forward(100); });', ws);
      expect(ws.firstOfType('turtle_forward')).toBeDefined();
    });

    test('inner forward block has correct AMOUNT', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.repeat(4, () => { t.forward(100); });', ws);
      const fwd = ws.firstOfType('turtle_forward');
      expect(shadowValueForInput(fwd, 'AMOUNT')).toBe('100');
    });

    test('repeat body uses function expression syntax', () => {
      const ws = makeWorkspace();
      textToBlocks(
        'const t = new Turtle(); t.repeat(3, function() { t.right(120); t.forward(50); });',
        ws,
      );
      expect(ws.firstOfType('turtle_repeat')).toBeDefined();
      expect(ws.firstOfType('turtle_right')).toBeDefined();
      expect(ws.firstOfType('turtle_forward')).toBeDefined();
    });

    test('inner blocks connect to DO input of repeat block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.repeat(4, () => { t.forward(100); });', ws);
      const rep = ws.firstOfType('turtle_repeat');
      const doConn = rep._connections.find((c) => c.input === 'DO');
      expect(doConn).toBeDefined();
    });
  });

  // ── forever ─────────────────────────────────────────────────────────────────

  describe('forever', () => {
    test('t.forever(() => { t.forward(10); }) creates a turtle_forever block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forever(() => { t.forward(10); });', ws);
      expect(ws.firstOfType('turtle_forever')).toBeDefined();
    });

    test('inner block is created inside forever body', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forever(() => { t.forward(10); });', ws);
      expect(ws.firstOfType('turtle_forward')).toBeDefined();
    });

    test('inner blocks connect to DO input of forever block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.forever(() => { t.forward(10); });', ws);
      const forever = ws.firstOfType('turtle_forever');
      const doConn = forever._connections.find((c) => c.input === 'DO');
      expect(doConn).toBeDefined();
    });

    test('multiple statements inside forever body are all created', () => {
      const ws = makeWorkspace();
      textToBlocks(
        'const t = new Turtle(); t.forever(() => { t.forward(10); t.right(5); });',
        ws,
      );
      expect(ws.blocksOfType('turtle_forward').length).toBe(1);
      expect(ws.blocksOfType('turtle_right').length).toBe(1);
    });
  });

  // ── unknown method ───────────────────────────────────────────────────────────

  describe('unknown method', () => {
    test('unknown method call is skipped without crashing', () => {
      const ws = makeWorkspace();
      expect(() =>
        textToBlocks('const t = new Turtle(); t.unknownMethod();', ws),
      ).not.toThrow();
    });

    test('unknown method does not create a block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.unknownMethod();', ws);
      // Only event_on_start and turtle_create should be created
      const nonSystemBlocks = ws._blocks.filter(
        (b) => b.type !== 'event_on_start' && b.type !== 'turtle_create',
      );
      expect(nonSystemBlocks.length).toBe(0);
    });

    test('valid methods after unknown method still get created', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.unknownMethod(); t.forward(100);', ws);
      expect(ws.firstOfType('turtle_forward')).toBeDefined();
    });
  });

  // ── face / seek / goTo ───────────────────────────────────────────────────────

  describe('face / seek / goTo', () => {
    test('t.face(100, 0) creates a turtle_face block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.face(100, 0);', ws);
      expect(ws.firstOfType('turtle_face')).toBeDefined();
    });

    test('t.seek() creates a turtle_seek block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.seek("person", 5);', ws);
      expect(ws.firstOfType('turtle_seek')).toBeDefined();
    });

    test('t.goTo() creates a turtle_goto block', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(); t.goTo("person");', ws);
      expect(ws.firstOfType('turtle_goto')).toBeDefined();
    });
  });

  // ── onEdge / onCollide side chains ──────────────────────────────────────────

  describe('side chains', () => {
    test('t.onEdge(...) creates an event_on_edge hat block', () => {
      const ws = makeWorkspace();
      textToBlocks(
        'const t = new Turtle(); t.onEdge(() => { t.home(); });',
        ws,
      );
      expect(ws.firstOfType('event_on_edge')).toBeDefined();
    });

    test('inner blocks of onEdge body are created', () => {
      const ws = makeWorkspace();
      textToBlocks(
        'const t = new Turtle(); t.onEdge(() => { t.home(); });',
        ws,
      );
      expect(ws.firstOfType('turtle_home')).toBeDefined();
    });

    test('t.onCollide(...) creates an event_on_collide hat block', () => {
      const ws = makeWorkspace();
      textToBlocks(
        'const t = new Turtle(); t.onCollide(t2, 30, () => { t.clear(); });',
        ws,
      );
      expect(ws.firstOfType('event_on_collide')).toBeDefined();
    });
  });

  // ── return value ─────────────────────────────────────────────────────────────

  describe('return value', () => {
    test('returns true when blocks are loaded', () => {
      const ws = makeWorkspace();
      const result = textToBlocks('const t = new Turtle(); t.forward(100);', ws);
      expect(result).toBe(true);
    });

    test('returns false for syntax error', () => {
      const ws = makeWorkspace();
      expect(textToBlocks('!!!', ws)).toBe(false);
    });
  });

  // ── variable name flexibility ─────────────────────────────────────────────

  describe('turtle variable name', () => {
    test('works with variable named "turtle" (not just "t")', () => {
      const ws = makeWorkspace();
      textToBlocks('const turtle = new Turtle(); turtle.forward(50);', ws);
      expect(ws.firstOfType('turtle_forward')).toBeDefined();
    });

    test('ignores calls on other variables with same method names', () => {
      const ws = makeWorkspace();
      // "other" is not the turtle variable — should be ignored
      textToBlocks(
        'const t = new Turtle(); const other = {}; other.forward(50);',
        ws,
      );
      expect(ws.blocksOfType('turtle_forward').length).toBe(0);
    });
  });

  // ── workspace.clear() is called ───────────────────────────────────────────

  describe('workspace management', () => {
    test('workspace.clear() is called before creating blocks', () => {
      const ws = makeWorkspace();
      let clearCalled = false;
      const origClear = ws.clear.bind(ws);
      ws.clear = () => {
        clearCalled = true;
        origClear();
      };
      textToBlocks('const t = new Turtle(); t.forward(100);', ws);
      expect(clearCalled).toBe(true);
    });
  });

  // ── z-layer ──────────────────────────────────────────────────────────────

  describe('z-layer', () => {
    test('new Turtle(1) sets ZLAYER to 1', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(1); t.forward(50);', ws);
      const create = ws.firstOfType('turtle_create');
      expect(create.fields.ZLAYER).toBe('1');
    });

    test('new Turtle(2) sets ZLAYER to 2', () => {
      const ws = makeWorkspace();
      textToBlocks('const t = new Turtle(2); t.forward(50);', ws);
      const create = ws.firstOfType('turtle_create');
      expect(create.fields.ZLAYER).toBe('2');
    });
  });
});
