import esprima from "esprima";

function getTurtleNames(code) {
  const names = new Set();
  const re = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+Turtle\s*\(/g;
  let m;
  while ((m = re.exec(code)) !== null) names.add(m[1]);
  return names;
}

export function addInfiniteLoopProtection(code, timeout = 2000) {
  let loopId = 1;
  let patches = [];
  const varPrefix = "_wmloopvar";
  const varStr = "var %d = Date.now();\n";
  const checkStr = `\nif (Date.now() - %d > ${timeout}) { window.stopRunning(); throw new Error("Infinite loop detected. Please make changes and press Execute Program when you are ready to try again."); break;}\n`;

  esprima.parseScript(code, { tolerant: true, range: true }, (node) => {
    switch (node.type) {
      case "DoWhileStatement":
      case "ForStatement":
      case "ForInStatement":
      case "ForOfStatement":
      case "WhileStatement": {
        let start = 1 + node.body.range[0];
        let end = node.body.range[1];
        let prolog = checkStr.replace("%d", varPrefix + loopId);
        let epilog = "";
        if (node.body.type !== "BlockStatement") {
          prolog = "{" + prolog;
          epilog = "}";
          --start;
        }
        patches.push({ pos: start, str: prolog });
        patches.push({ pos: end, str: epilog });
        patches.push({ pos: node.range[0], str: varStr.replace("%d", varPrefix + loopId) });
        ++loopId;
        break;
      }
      default:
        break;
    }
  });

  patches
    .sort((a, b) => b.pos - a.pos)
    .forEach((p) => {
      code = code.slice(0, p.pos) + p.str + code.slice(p.pos);
    });

  return code;
}

export function friendlyError(raw) {
  const m = String(raw?.message ?? raw);
  const dup = m.match(/Identifier ['"]?(\w+)['"]? has already been declared/);
  if (dup) return `'${dup[1]}' is declared twice — remove the duplicate const/let/var line.`;

  const notFn = m.match(/['"]([\w.]+)['"] is not a function|(\S+) is not a function/);
  if (notFn) {
    const name = notFn[1] ?? notFn[2];
    const obj = name.split(".")[0];
    const hint = /^(turtle|t)\b/.test(obj)
      ? `did you forget to create it with \`new Turtle()\`?`
      : `check the spelling.`;
    return `${name} is not a function — ${hint}`;
  }

  const notDef = m.match(/(\w+) is not defined/);
  if (notDef) return `'${notDef[1]}' is not defined — did you forget to create it?`;

  const prop = m.match(/Cannot read propert(?:y|ies) of (undefined|null)(?: \(reading ['"](\w+)['"]\))?/);
  if (prop) return prop[2]
    ? `Tried to use .${prop[2]} on something that doesn't exist yet.`
    : `Tried to use a property on something that doesn't exist yet.`;

  if (m.includes("Unexpected token") || m.includes("Unexpected end of"))
    return `Syntax error — check for missing or extra brackets, quotes, or commas.`;

  if (m.includes("Unexpected identifier"))
    return `Syntax error — unexpected word. Check for missing punctuation on the line above.`;

  if (m.includes("Infinite loop detected")) return m;

  return m.replace(/^(TypeError|SyntaxError|ReferenceError|RangeError|EvalError): /, "");
}

export function transformForLivePatch(code) {
  const PATCHABLE = new Set(["color", "thickness"]);
  let ast;
  try {
    ast = esprima.parseScript(code, { range: true, tolerant: true });
  } catch (_) {
    return { code, liveDefaults: {} };
  }
  const turtleNames = getTurtleNames(code);
  if (turtleNames.size === 0) return { code, liveDefaults: {} };

  const patches = [];
  const liveDefaults = {};

  function walkCallback(node) {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "ExpressionStatement" &&
      node.expression?.type === "CallExpression" &&
      node.expression.callee?.type === "MemberExpression" &&
      node.expression.callee.object?.type === "Identifier" &&
      turtleNames.has(node.expression.callee.object.name) &&
      PATCHABLE.has(node.expression.callee.property?.name)
    ) {
      const call = node.expression;
      const method = call.callee.property.name;
      const firstArg = call.arguments[0];
      if (firstArg?.type === "Literal") {
        liveDefaults[method] = firstArg.value;
        patches.push({ pos: firstArg.range[0], end: firstArg.range[1], str: `window.__ar_live.${method}` });
      }
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(walkCallback);
      else if (v && typeof v === "object" && v.type) walkCallback(v);
    }
  }

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      (node.callee.name === "setInterval" || node.callee.name === "setTimeout") &&
      (node.arguments[0]?.type === "ArrowFunctionExpression" || node.arguments[0]?.type === "FunctionExpression")
    ) {
      walkCallback(node.arguments[0].body);
      return;
    }
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "MemberExpression" &&
      node.callee.object?.type === "Identifier" &&
      turtleNames.has(node.callee.object.name)
    ) {
      const method = node.callee.property?.name;
      const cbArg = method === "forever" ? node.arguments[0] : method === "repeat" ? node.arguments[1] : null;
      if (cbArg && (cbArg.type === "ArrowFunctionExpression" || cbArg.type === "FunctionExpression")) {
        walkCallback(cbArg.body);
        return;
      }
    }
    for (const v of Object.values(node)) {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object" && v.type) walk(v);
    }
  }

  walk(ast);

  if (patches.length === 0) return { code, liveDefaults: {} };

  patches.sort((a, b) => b.pos - a.pos);
  let result = code;
  for (const p of patches) {
    result = result.slice(0, p.pos) + p.str + result.slice(p.end);
  }
  return { code: `window.__ar_live = ${JSON.stringify(liveDefaults)};\n` + result, liveDefaults };
}
