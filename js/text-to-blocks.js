import esprima from "esprima";

// Parse JS turtle code and recreate blocks in the given workspace.
// Finds the first `new Turtle()` declaration, then walks statements
// calling methods on that variable.
// Returns true if anything was loaded, false if code is too complex.
export function textToBlocks(code, workspace) {
  let ast;
  try {
    ast = esprima.parseScript(code, { tolerant: true });
  } catch (_) {
    return false;
  }

  // Find turtle variable name and z-index
  let varName = null;
  let turtleZ = 0;
  for (const node of ast.body) {
    const found = findTurtleVarName(node);
    if (found) { varName = found.name; turtleZ = found.z; break; }
  }
  if (!varName) return false;

  workspace.clear();

  // Ensure a Turtle-typed variable exists for this name.
  const turtleVar =
    workspace.variableMap.getVariable(varName, "Turtle") ||
    workspace.variableMap.createVariable(varName, "Turtle");

  const x = 40;

  // Create turtle_create block for the declaration.
  const createBlock = workspace.newBlock("turtle_create");
  createBlock.getField("TURTLE").setValue(turtleVar.getId());
  createBlock.setFieldValue(String(turtleZ), "ZLAYER");
  createBlock.initSvg();
  createBlock.render();

  // Walk top-level statements, building a chain of blocks (skip the declaration).
  const topBlocks = [createBlock];
  for (const node of ast.body) {
    if (findTurtleVarName(node)?.name === varName) continue;
    const blocks = stmtToBlocks(node, varName, turtleVar, workspace);
    topBlocks.push(...blocks);
  }

  // If no event hat blocks exist, prepend event_on_start.
  const eventTypes = ["event_on_start", "event_on_key", "event_on_edge", "event_on_collide", "event_on_gesture", "event_on_expression"];
  const hasEventBlock = eventTypes.some((t) => workspace.getBlocksByType(t, false).length > 0);
  if (!hasEventBlock) {
    const hat = workspace.newBlock("event_on_start");
    hat.initSvg();
    hat.render();
    topBlocks.unshift(hat);
  }

  // Chain all top-level blocks together and position the first one.
  topBlocks[0].moveBy(x, 40);
  for (let i = 0; i < topBlocks.length - 1; i++) {
    const next = topBlocks[i].nextConnection;
    const prev = topBlocks[i + 1].previousConnection;
    if (next && prev) next.connect(prev);
  }

  // Side chains for onEdge/onCollide — hat blocks placed separately
  let sideX = 350;
  for (const node of ast.body) {
    if (findTurtleVarName(node)?.name === varName) continue;
    const chain = makeSideChain(node, varName, turtleVar, workspace);
    if (!chain || chain.length === 0) continue;
    chain[0].moveBy(sideX, 40);
    for (let i = 0; i < chain.length - 1; i++) {
      const next = chain[i].nextConnection;
      const prev = chain[i + 1].previousConnection;
      if (next && prev) next.connect(prev);
    }
    sideX += 260;
  }

  return topBlocks.length > 0;
}

function findTurtleVarName(node) {
  // const/let/var X = new Turtle() or new Turtle(z)
  if (node.type === "VariableDeclaration" && node.declarations.length > 0) {
    for (const decl of node.declarations) {
      if (
        decl.init &&
        decl.init.type === "NewExpression" &&
        decl.init.callee.type === "Identifier" &&
        decl.init.callee.name === "Turtle"
      ) {
        const zArg = decl.init.arguments[0];
        let z = 0;
        if (zArg?.type === "Literal" && typeof zArg.value === "number") {
          z = zArg.value;
        } else if (zArg?.type === "UnaryExpression" && zArg.operator === "-") {
          const inner = zArg.argument;
          if (inner?.type === "Literal" && typeof inner.value === "number") z = -inner.value;
        }
        return { name: decl.id.name, z };
      }
    }
  }
  return null;
}

// Convert a statement AST node to Blockly block(s).
// Returns an array of blocks (may be empty for unrecognized nodes).
function stmtToBlocks(node, varName, turtleVar, workspace) {
  if (node.type !== "ExpressionStatement") return [];
  const expr = node.expression;
  if (expr.type !== "CallExpression") return [];

  const callee = expr.callee;
  if (callee.type !== "MemberExpression") return [];
  if (callee.object.type !== "Identifier" || callee.object.name !== varName) return [];

  const method = callee.property.name;
  const args = expr.arguments;

  return methodToBlocks(method, args, varName, turtleVar, workspace);
}

function methodToBlocks(method, args, varName, turtleVar, workspace) {
  const block = makeMethodBlock(method, args, varName, turtleVar, workspace);
  if (!block) return [];
  return [block];
}

function setTurtleField(block, turtleVar) {
  const field = block.getField("TURTLE");
  if (field) field.setValue(turtleVar.getId());
}

function makeMethodBlock(method, args, varName, turtleVar, workspace) {
  switch (method) {
    case "forward":
      return makeNumBlock("turtle_forward", "AMOUNT", numVal(args[0]), turtleVar, workspace);
    case "backward":
      return makeNumBlock("turtle_backward", "AMOUNT", numVal(args[0]), turtleVar, workspace);
    case "right":
      return makeNumBlock("turtle_right", "DEGREES", numVal(args[0]) ?? 90, turtleVar, workspace);
    case "left":
      return makeNumBlock("turtle_left", "DEGREES", numVal(args[0]) ?? 90, turtleVar, workspace);
    case "disc":
      return makeNumBlock("turtle_disc", "RADIUS", numVal(args[0]), turtleVar, workspace);
    case "circle":
      return makeNumBlock("turtle_circle", "RADIUS", numVal(args[0]), turtleVar, workspace);
    case "thickness":
      return makeSliderBlock("turtle_thickness", numVal(args[0]), turtleVar, workspace);
    case "pu":
      return makeSimpleBlock("turtle_pen_up", turtleVar, workspace);
    case "pd":
      return makeSimpleBlock("turtle_pen_down", turtleVar, workspace);
    case "home":
      return makeSimpleBlock("turtle_home", turtleVar, workspace);
    case "clear":
      return makeSimpleBlock("turtle_clear", turtleVar, workspace);
    case "clean":
      return makeSimpleBlock("turtle_clean", turtleVar, workspace);
    case "color":
      return makeColorBlock(args[0], turtleVar, workspace);
    case "repeat":
      return makeRepeatBlock(args, varName, turtleVar, workspace);
    case "forever":
      return makeForeverBlock(args, varName, turtleVar, workspace);
    case "wait":
      return makeNumBlock("turtle_wait", "SECONDS", numVal(args[0]), turtleVar, workspace);
    case "xy":
      return makeXYBlock("turtle_xy", args, turtleVar, workspace);
    case "heading": {
      const block = workspace.newBlock("turtle_heading");
      setTurtleField(block, turtleVar);
      const v = numVal(args[0]);
      if (v !== null) block.setFieldValue(String(v), "DEGREES");
      block.initSvg(); block.render();
      return block;
    }
    case "face":
      return makeXYBlock("turtle_face", args, turtleVar, workspace);
    case "arc":
      return makeArcBlock(args, turtleVar, workspace);
    case "seek":
      return makeSeekBlock(args, turtleVar, workspace);
    case "goTo":
      return makeGotoBlock(args, turtleVar, workspace);
    case "reset":
      return makeSimpleBlock("turtle_reset", turtleVar, workspace);
    default:
      return null;
  }
}

function numVal(node) {
  if (!node) return 0;
  if (node.type === "Literal") return Number(node.value);
  if (node.type === "UnaryExpression" && node.operator === "-") return -numVal(node.argument);
  return null; // complex expression — can't convert
}

function strVal(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  return null;
}

function makeSimpleBlock(type, turtleVar, workspace) {
  const block = workspace.newBlock(type);
  setTurtleField(block, turtleVar);
  block.initSvg();
  block.render();
  return block;
}

function makeNumBlock(type, inputName, value, turtleVar, workspace) {
  const block = workspace.newBlock(type);
  setTurtleField(block, turtleVar);
  if (value !== null) {
    const shadow = workspace.newBlock("math_number");
    shadow.setFieldValue(String(value), "NUM");
    shadow.setShadow(true);
    shadow.initSvg();
    shadow.render();
    block.getInput(inputName)?.connection?.connect(shadow.outputConnection);
  }
  block.initSvg();
  block.render();
  return block;
}

function makeAngleBlock(type, value, turtleVar, workspace) {
  const block = workspace.newBlock(type);
  setTurtleField(block, turtleVar);
  if (value !== null) block.setFieldValue(String(value), "DEGREES");
  block.initSvg();
  block.render();
  return block;
}

function makeSliderBlock(type, value, turtleVar, workspace) {
  const block = workspace.newBlock(type);
  setTurtleField(block, turtleVar);
  if (value !== null) block.setFieldValue(String(value), "WIDTH");
  block.initSvg();
  block.render();
  return block;
}

function makeColorBlock(argNode, turtleVar, workspace) {
  const block = workspace.newBlock("turtle_color");
  setTurtleField(block, turtleVar);
  const value = strVal(argNode);
  if (value !== null) {
    // FieldColour only accepts hex; named colors fall back to default
    const hex = namedColorToHex(value) ?? value;
    block.setFieldValue(hex, "COLOR");
  }
  block.initSvg();
  block.render();
  return block;
}

const _colorCanvas = document.createElement("canvas");
_colorCanvas.width = _colorCanvas.height = 1;
const _colorCtx = _colorCanvas.getContext("2d");

function namedColorToHex(color) {
  _colorCtx.clearRect(0, 0, 1, 1);
  _colorCtx.fillStyle = "#000000";
  _colorCtx.fillStyle = color;
  // If the browser didn't recognise it, fillStyle stays '#000000'
  // which may be correct anyway, so just return what we got.
  const computed = _colorCtx.fillStyle;
  // fillStyle normalises to hex or rgb(...)
  if (computed.startsWith("#")) return computed;
  const m = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (m)
    return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  return null;
}

function makeRepeatBlock(args, varName, turtleVar, workspace) {
  const block = workspace.newBlock("turtle_repeat");
  setTurtleField(block, turtleVar);
  const countVal = numVal(args[0]);
  if (countVal !== null) {
    const shadow = workspace.newBlock("math_number");
    shadow.setFieldValue(String(countVal), "NUM");
    shadow.setShadow(true);
    shadow.initSvg();
    shadow.render();
    block.getInput("COUNT")?.connection?.connect(shadow.outputConnection);
  }

  // Parse body: second arg is an arrow function or regular function
  const bodyFn = args[1];
  if (bodyFn) {
    const bodyStmts = getFunctionBody(bodyFn);
    const innerBlocks = [];
    for (const stmt of bodyStmts) {
      const bs = stmtToBlocks(stmt, varName, turtleVar, workspace);
      innerBlocks.push(...bs);
    }
    // Chain inner blocks and connect to DO input
    if (innerBlocks.length > 0) {
      for (let i = 0; i < innerBlocks.length - 1; i++) {
        const next = innerBlocks[i].nextConnection;
        const prev = innerBlocks[i + 1].previousConnection;
        if (next && prev) next.connect(prev);
      }
      block.getInput("DO")?.connection?.connect(innerBlocks[0].previousConnection);
    }
  }

  block.initSvg();
  block.render();
  return block;
}

function makeForeverBlock(args, varName, turtleVar, workspace) {
  const block = workspace.newBlock("turtle_forever");
  setTurtleField(block, turtleVar);
  const bodyFn = args[0];
  if (bodyFn) {
    const bodyStmts = getFunctionBody(bodyFn);
    const innerBlocks = [];
    for (const stmt of bodyStmts) {
      const bs = stmtToBlocks(stmt, varName, turtleVar, workspace);
      innerBlocks.push(...bs);
    }
    if (innerBlocks.length > 0) {
      for (let i = 0; i < innerBlocks.length - 1; i++) {
        const next = innerBlocks[i].nextConnection;
        const prev = innerBlocks[i + 1].previousConnection;
        if (next && prev) next.connect(prev);
      }
      block.getInput("DO")?.connection?.connect(innerBlocks[0].previousConnection);
    }
  }
  block.initSvg();
  block.render();
  return block;
}

function makeXYBlock(type, args, turtleVar, workspace) {
  const block = workspace.newBlock(type);
  setTurtleField(block, turtleVar);
  const xVal = numVal(args[0]);
  const yVal = numVal(args[1]);
  for (const [input, val] of [["X", xVal], ["Y", yVal]]) {
    if (val !== null) {
      const s = workspace.newBlock("math_number");
      s.setFieldValue(String(val), "NUM");
      s.setShadow(true); s.initSvg(); s.render();
      block.getInput(input)?.connection?.connect(s.outputConnection);
    }
  }
  block.initSvg(); block.render();
  return block;
}

function makeArcBlock(args, turtleVar, workspace) {
  const block = workspace.newBlock("turtle_arc");
  setTurtleField(block, turtleVar);
  for (const [input, idx] of [["RADIUS", 0], ["DEGREES", 1]]) {
    const val = numVal(args[idx]);
    if (val !== null) {
      const s = workspace.newBlock("math_number");
      s.setFieldValue(String(val), "NUM");
      s.setShadow(true); s.initSvg(); s.render();
      block.getInput(input)?.connection?.connect(s.outputConnection);
    }
  }
  block.initSvg(); block.render();
  return block;
}

function makeSeekBlock(args, turtleVar, workspace) {
  const block = workspace.newBlock("turtle_seek");
  setTurtleField(block, turtleVar);
  const stepVal = numVal(args[1]);
  if (stepVal !== null) {
    const s = workspace.newBlock("math_number");
    s.setFieldValue(String(stepVal), "NUM");
    s.setShadow(true); s.initSvg(); s.render();
    block.getInput("STEP")?.connection?.connect(s.outputConnection);
  }
  block.initSvg(); block.render();
  return block;
}

function makeGotoBlock(args, turtleVar, workspace) {
  const block = workspace.newBlock("turtle_goto");
  setTurtleField(block, turtleVar);
  block.initSvg(); block.render();
  return block;
}

function makeSideChain(node, varName, turtleVar, workspace) {
  if (node.type !== "ExpressionStatement") return null;
  const expr = node.expression;
  if (expr.type !== "CallExpression") return null;
  const callee = expr.callee;
  if (callee.type !== "MemberExpression") return null;
  if (callee.object?.type !== "Identifier" || callee.object.name !== varName) return null;

  const method = callee.property.name;
  const args = expr.arguments;

  if (method === "onEdge") {
    const hat = workspace.newBlock("event_on_edge");
    setTurtleField(hat, turtleVar);
    hat.initSvg(); hat.render();
    const bodyStmts = getFunctionBody(args[0]);
    const inner = bodyStmts.flatMap(s => stmtToBlocks(s, varName, turtleVar, workspace));
    return [hat, ...inner];
  }

  if (method === "onCollide") {
    const hat = workspace.newBlock("event_on_collide");
    setTurtleField(hat, turtleVar);
    const distVal = numVal(args[1]);
    if (distVal !== null) {
      const s = workspace.newBlock("math_number");
      s.setFieldValue(String(distVal), "NUM");
      s.setShadow(true); s.initSvg(); s.render();
      hat.getInput("DIST")?.connection?.connect(s.outputConnection);
    }
    hat.initSvg(); hat.render();
    const bodyStmts = getFunctionBody(args[2]);
    const inner = bodyStmts.flatMap(s => stmtToBlocks(s, varName, turtleVar, workspace));
    return [hat, ...inner];
  }

  return null;
}

function getFunctionBody(node) {
  // Arrow function: () => { stmts } or ArrowFunctionExpression
  // FunctionExpression: function() { stmts }
  let body = null;
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    body = node.body;
  }
  if (!body) return [];
  if (body.type === "BlockStatement") return body.body;
  // Expression body — single expression
  return [{ type: "ExpressionStatement", expression: body }];
}
