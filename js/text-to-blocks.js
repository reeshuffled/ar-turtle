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

  // Find turtle variable name
  let varName = null;
  for (const node of ast.body) {
    varName = findTurtleVarName(node);
    if (varName) break;
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
  createBlock.initSvg();
  createBlock.render();

  // Walk top-level statements, building a chain of blocks (skip the declaration).
  const topBlocks = [createBlock];
  for (const node of ast.body) {
    if (findTurtleVarName(node) === varName) continue;
    const blocks = stmtToBlocks(node, varName, turtleVar, workspace);
    topBlocks.push(...blocks);
  }

  // Chain all top-level blocks together and position the first one.
  topBlocks[0].moveBy(x, 40);
  for (let i = 0; i < topBlocks.length - 1; i++) {
    const next = topBlocks[i].nextConnection;
    const prev = topBlocks[i + 1].previousConnection;
    if (next && prev) next.connect(prev);
  }

  return topBlocks.length > 0;
}

function findTurtleVarName(node) {
  // const/let/var X = new Turtle()
  if (node.type === "VariableDeclaration" && node.declarations.length > 0) {
    for (const decl of node.declarations) {
      if (
        decl.init &&
        decl.init.type === "NewExpression" &&
        decl.init.callee.type === "Identifier" &&
        decl.init.callee.name === "Turtle"
      ) {
        return decl.id.name;
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
      return makeAngleBlock("turtle_right", numVal(args[0]), turtleVar, workspace);
    case "left":
      return makeAngleBlock("turtle_left", numVal(args[0]), turtleVar, workspace);
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
