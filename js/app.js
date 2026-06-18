import { Turtle } from "./turtle.js";
import esprima from "esprima";
import * as Blockly from "blockly";
import { javascriptGenerator, TOOLBOX } from "./blocks.js";
import { textToBlocks } from "./text-to-blocks.js";

// Capture native timer functions before any user-code patching.
const _nativeSetInterval = window.setInterval.bind(window);
const _nativeClearInterval = window.clearInterval.bind(window);

// Expose Turtle on window so user code in the editor can call `new Turtle(c)`.
window.Turtle = Turtle;

const TURTLE_COMPLETIONS = [
  { text: "forward", displayText: "forward(amount) — move forward by amount pixels" },
  { text: "backward", displayText: "backward(amount) — move backward by amount pixels" },
  { text: "right", displayText: "right(deg) — turn right by degrees" },
  { text: "left", displayText: "left(deg) — turn left by degrees" },
  { text: "xy", displayText: "xy(x, y) — teleport to canvas coordinate" },
  { text: "x", displayText: "x(x) — move to x, keep y" },
  { text: "y", displayText: "y(y) — move to y, keep x" },
  { text: "heading", displayText: "heading(deg) — set absolute heading in degrees" },
  { text: "face", displayText: "face(x, y) — point toward canvas coordinate" },
  { text: "butt", displayText: "butt(x, y) — point away from canvas coordinate" },
  { text: "disc", displayText: "disc(radius) — draw filled circle at current position" },
  { text: "circle", displayText: "circle(radius) — draw circle outline at current position" },
  { text: "pu", displayText: "pu() — pen up: lift pen, stop drawing lines" },
  { text: "pd", displayText: "pd() — pen down: draw lines while moving" },
  { text: "color", displayText: "color(c) — set pen color (any CSS color string)" },
  { text: "thickness", displayText: "thickness(w) — set pen stroke width" },
  { text: "clean", displayText: "clean(color?) — fill background; optional color arg" },
  { text: "home", displayText: "home() — return to center and reset heading to 0°" },
  { text: "clear", displayText: "clear() — clean + home + pen down" },
  { text: "reset", displayText: "reset() — full reset: transparent bg, white pen, clear" },
  { text: "stop", displayText: "stop() — cancel all pending queued commands" },
  { text: "repeat", displayText: "repeat(n, fn) — call fn(i) n times; return false to break" },
  { text: "forever", displayText: "forever(fn) — loop fn(i) until fn returns false" },
  {
    text: "get",
    displayText:
      "get — getters: .x .y .heading .pu .pd .color .thickness .background .oob .top .left .right .bottom",
  },
  { text: "rand", displayText: "rand — randoms: .uni(lo,hi) .norm(mean,sd) .chance(odds)" },
  { text: "on", displayText: 'on(event, fn) — listen to: "move", "rotate", "pu", "pd"' },
];

// ── Drag-to-text toolkit data ─────────────────────────────────────────────
const TOOLKIT_CATEGORIES = [
  {
    name: "Turtle",
    commands: [
      { label: "create turtle", code: "const turtle = new Turtle();" },
    ],
  },
  {
    name: "Move",
    commands: [
      { label: "forward", code: "turtle.forward(50);" },
      { label: "backward", code: "turtle.backward(50);" },
      { label: "go to x, y", code: "turtle.xy(0, 0);" },
      { label: "home", code: "turtle.home();" },
      { label: "clear", code: "turtle.clear();" },
      { label: "clean", code: "turtle.clean();" },
    ],
  },
  {
    name: "Turn",
    commands: [
      { label: "right 90°", code: "turtle.right(90);" },
      { label: "left 90°", code: "turtle.left(90);" },
      { label: "heading", code: "turtle.heading(0);" },
      { label: "face x, y", code: "turtle.face(0, 0);" },
    ],
  },
  {
    name: "Pen",
    commands: [
      { label: "pen up", code: "turtle.pu();" },
      { label: "pen down", code: "turtle.pd();" },
      { label: "color", code: "turtle.color('red');" },
      { label: "thickness", code: "turtle.thickness(2);" },
    ],
  },
  {
    name: "Draw",
    commands: [
      { label: "disc", code: "turtle.disc(20);" },
      { label: "circle", code: "turtle.circle(20);" },
    ],
  },
  {
    name: "Control",
    commands: [
      { label: "repeat", code: "turtle.repeat(4, () => {\n  \n});" },
      { label: "forever", code: "turtle.forever(() => {\n  \n});" },
      { label: "set interval", code: "setInterval(() => {\n  \n}, 100);" },
      { label: "set timeout", code: "setTimeout(() => {\n  \n}, 1000);" },
    ],
  },
];

// https://github.com/chinchang/web-maker/blob/master/src/utils.js
function addInfiniteLoopProtection(code, timeout = 2000) {
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

function friendlyError(raw) {
  const m = String(raw?.message ?? raw);
  const dup = m.match(/Identifier ['"]?(\w+)['"]? has already been declared/);
  if (dup) return `'${dup[1]}' is declared twice — remove the duplicate const/let/var line.`;

  const notFn = m.match(/['"]([\w.]+)['"] is not a function|(\S+) is not a function/);
  if (notFn) return `${notFn[1] ?? notFn[2]} is not a function — check the spelling.`;

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

function getTurtleVarNames(cm) {
  const names = new Set();
  const re = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+Turtle\s*\(/g;
  let m;
  while ((m = re.exec(cm.getValue())) !== null) names.add(m[1]);
  return names;
}

function turtleHint(cm, options) {
  const Pos = CodeMirror.Pos;
  const cur = cm.getCursor();
  let token = cm.getTokenAt(cur);

  if (/\b(?:string|comment)\b/.test(token.type)) return CodeMirror.hint.javascript(cm, options);

  if (!/^[\w$_]*$/.test(token.string)) {
    token = {
      start: cur.ch,
      end: cur.ch,
      string: "",
      type: token.string === "." ? "property" : null,
      state: token.state,
    };
  } else if (token.end > cur.ch) {
    token.end = cur.ch;
    token.string = token.string.slice(0, cur.ch - token.start);
  }

  if (token.type === "property") {
    const dotToken = cm.getTokenAt(Pos(cur.line, token.start));
    if (dotToken.string === ".") {
      const objToken = cm.getTokenAt(Pos(cur.line, dotToken.start));
      if (getTurtleVarNames(cm).has(objToken.string)) {
        const prefix = token.string;
        return {
          list: TURTLE_COMPLETIONS.filter((c) => c.text.startsWith(prefix)),
          from: Pos(cur.line, token.start),
          to: Pos(cur.line, token.end),
        };
      }
    }
  }

  return CodeMirror.hint.javascript(cm, options);
}

window.onload = () => {
  const splitter = document.querySelector(".splitter");
  const panelLeft = document.querySelector(".panel-left");
  splitter.addEventListener("mousedown", (e) => {
    const startX = e.clientX,
      startW = panelLeft.offsetWidth;
    const onMove = (e) => (panelLeft.style.width = `${startW + e.clientX - startX}px`);
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  const STORAGE_KEY = "ar-turtle-code";
  const savedCode = localStorage.getItem(STORAGE_KEY);
  const initialCode = savedCode ?? document.getElementById("code_text").innerHTML.trim();

  const editor = CodeMirror(document.getElementById("editor"), {
    mode: "javascript",
    lineNumbers: true,
    value: initialCode,
    extraKeys: { "Ctrl-Space": "autocomplete" },
    hintOptions: { hint: turtleHint, completeSingle: false },
  });

  let saveTimer;
  editor.on("change", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, editor.getValue()), 500);
  });

  // ── Build drag-to-text toolkit ────────────────────────────────────────────
  const toolkitBody = document.getElementById("toolkit-body");
  for (const cat of TOOLKIT_CATEGORIES) {
    const catEl = document.createElement("div");
    catEl.className = "toolkit-category";
    catEl.textContent = cat.name;
    toolkitBody.appendChild(catEl);
    for (const cmd of cat.commands) {
      const btn = document.createElement("div");
      btn.className = "toolkit-btn";
      btn.draggable = true;
      btn.innerHTML = `<span>${cmd.label}</span><span class="toolkit-info">ℹ</span>`;
      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("application/x-ar-toolkit", cmd.code);
        e.dataTransfer.effectAllowed = "copy";
        btn.classList.add("dragging");
      });
      btn.addEventListener("dragend", () => btn.classList.remove("dragging"));
      toolkitBody.appendChild(btn);
    }
  }

  // Drop code snippets onto CodeMirror
  const cmWrapper = editor.getWrapperElement();
  cmWrapper.addEventListener("dragover", (e) => {
    if (e.dataTransfer.types.includes("application/x-ar-toolkit")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });
  cmWrapper.addEventListener("drop", (e) => {
    const code = e.dataTransfer.getData("application/x-ar-toolkit");
    if (!code) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = editor.coordsChar({ left: e.clientX, top: e.clientY });
    editor.focus();
    const lines = code.split("\n");
    editor.replaceRange(code + "\n", pos);
    editor.setCursor({ line: pos.line + lines.length, ch: 0 });
  });

  editor.on("inputRead", (cm, change) => {
    if (change.text[0] === ".") {
      CodeMirror.commands.autocomplete(cm, turtleHint, { completeSingle: false });
    }
  });
  editor.setOption("lint", true);

  let currentScript = null;
  let currentStream = null;

  const turtleCanvas = document.getElementById("turtle");
  const canvasWrapper = document.getElementById("canvasWrapper");

  // Keep wrapper square and within panel bounds.
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const size = Math.min(width, height);
    canvasWrapper.style.width = `${size}px`;
    canvasWrapper.style.height = `${size}px`;
  }).observe(document.getElementById("fsContainer"));

  // ── Fullscreen ────────────────────────────────────────────────────────────────
  document.getElementById("fullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.getElementById("fsContainer").requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    const inFs = !!document.fullscreenElement;
    document.getElementById("fullscreenBtn").textContent = inFs ? "Exit Fullscreen" : "Fullscreen";
    document.getElementById("fullscreenBtn").classList.toggle("active", inFs);
    // On exit, inline styles restore; update sprite for restored size.
    if (!inFs) updateSprite();
  });

  // ── Webcam ─────────────────────────────────────────────────────────────────
  const video = document.createElement("video");
  video.autoplay = true;
  video.playsInline = true;

  const cameraCanvas = document.getElementById("camera");
  const cameraCtx = cameraCanvas.getContext("2d");
  let rafId = null;

  const drawFrame = () => {
    rafId = requestAnimationFrame(drawFrame);
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
    }
  };

  let cameraOn = false;

  const startCamera = (deviceId) => {
    currentStream?.getTracks().forEach((t) => t.stop());
    currentStream = null;
    const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        currentStream = stream;
        video.srcObject = stream;
        document.getElementById("cameraToggle").style.display = "";
        if (cameraOn && !rafId) drawFrame();
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(populateCameras)
      .catch((err) => console.warn("Camera unavailable:", err.message));
  };

  document.getElementById("cameraToggle").addEventListener("click", () => {
    cameraOn = !cameraOn;
    const toggle = document.getElementById("cameraToggle");
    toggle.textContent = cameraOn ? "Turn Camera Off" : "Turn Camera On";
    toggle.classList.toggle("active", cameraOn);
    if (cameraOn) {
      if (!rafId) drawFrame();
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
      cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
    }
  });

  const populateCameras = (devices) => {
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    const select = document.getElementById("cameraSelect");
    const current = select.value;
    select.innerHTML = "";
    videoDevices.forEach((device, i) => {
      const opt = document.createElement("option");
      opt.value = device.deviceId;
      opt.text = device.label || `Camera ${i + 1}`;
      if (opt.value === current) opt.selected = true;
      select.appendChild(opt);
    });
    document.getElementById("cameraWrapper").style.display = videoDevices.length > 1 ? "" : "none";
  };

  document.getElementById("cameraSelect").addEventListener("change", function () {
    startCamera(this.value);
  });

  if (navigator.mediaDevices?.getUserMedia) {
    startCamera(null);
  }

  // ── Console capture ───────────────────────────────────────────────────────
  const consoleEl = document.getElementById("console");
  const _log = console.log.bind(console);
  const _error = console.error.bind(console);
  const _clear = console.clear.bind(console);

  const appendConsole = (html) => {
    consoleEl.innerHTML += (consoleEl.innerHTML ? "<br>" : "") + html;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  };

  window.clearConsole = () => {
    consoleEl.innerHTML = "";
  };

  console.log = (...args) => {
    const msg = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
      .join(" ");
    appendConsole(msg);
    _log(...args);
  };
  console.error = (...args) => {
    const msg = args.map((a) => String(a)).join(" ");
    appendConsole(`<span class="err">${msg}</span>`);
    _error(...args);
  };
  console.clear = () => {
    consoleEl.innerHTML = "";
    _clear();
  };

  // ── Execute / Stop Running / Reset ───────────────────────────────────────
  // States: 'idle' → 'running' → 'stopped' → 'idle'
  const executeBtn = document.getElementById("execute");
  let btnState = "idle";
  let idleWatcher = null;

  // Patch window.setInterval/clearInterval so we can track active user intervals.
  // Uses _nativeSetInterval so our own idleWatcher is invisible to the tracker.
  const patchTimers = () => {
    window.__ar_intervals = new Set();
    window.setInterval = (...args) => {
      const id = _nativeSetInterval(...args);
      window.__ar_intervals.add(id);
      return id;
    };
    window.clearInterval = (id) => {
      window.__ar_intervals?.delete(id);
      _nativeClearInterval(id);
    };
  };

  const unpatchTimers = () => {
    window.setInterval = _nativeSetInterval;
    window.clearInterval = _nativeClearInterval;
    window.__ar_intervals = new Set();
  };

  const setIdle = () => {
    btnState = "idle";
    executeBtn.textContent = "Execute Program";
    executeBtn.style.backgroundColor = "green";
  };

  const setStopped = () => {
    if (idleWatcher) {
      _nativeClearInterval(idleWatcher);
      idleWatcher = null;
    }
    btnState = "stopped";
    executeBtn.textContent = "Reset";
    executeBtn.style.backgroundColor = "#b00";
  };

  const stopRunning = () => {
    unpatchTimers();
    for (let i = 1; i < 999999; i++) _nativeClearInterval(i);
    idleWatcher = null;
    setStopped();
  };
  window.stopRunning = stopRunning;

  window.__ar_friendlyError = friendlyError;

  window.onerror = (message, _source, _lineno, _colno, error) => {
    if (btnState !== "running") return false;
    console.error(`Error: ${friendlyError(error ?? message)}`);
    stopRunning();
    return false;
  };

  window.onunhandledrejection = (e) => {
    if (btnState !== "running") return;
    console.error(`Error: ${friendlyError(e.reason)}`);
    stopRunning();
  };

  const reset = () => {
    unpatchTimers();
    window.__ar_turtles?.forEach((t) => t.stop());
    window.__ar_turtles = [];
    for (let i = 1; i < 999999; i++) _nativeClearInterval(i);
    idleWatcher = null;
    if (currentScript) {
      document.body.removeChild(currentScript);
      currentScript = null;
    }
    turtleCanvas.getContext("2d").clearRect(0, 0, turtleCanvas.width, turtleCanvas.height);
    setIdle();
  };

  const execute = () => {
    reset();
    consoleEl.innerHTML = "";
    patchTimers();

    const raw = editor.getValue();
    let protected_code;
    try {
      protected_code = addInfiniteLoopProtection(raw);
    } catch (_) {
      protected_code = raw;
    }

    // .then() handles no-turtle, no-interval programs (pure console.log etc)
    const code =
      `(async function(){\n${protected_code}\n})()` +
      `.catch(e => console.error("Error: " + window.__ar_friendlyError(e)))` +
      `.then(() => window.__ar_iifeDone?.());`;

    window.__ar_iifeDone = () => {
      if (btnState !== "running") return;
      const turtles = window.__ar_turtles ?? [];
      const intervals = window.__ar_intervals ?? new Set();
      if (turtles.length === 0 && intervals.size === 0) setStopped();
    };

    btnState = "running";
    executeBtn.textContent = "Stop Running";
    executeBtn.style.backgroundColor = "#c07000";

    const script = document.createElement("script");
    try {
      script.appendChild(document.createTextNode(code));
    } catch (e) {
      script.text = code;
    }
    document.body.appendChild(script);
    currentScript = script;

    // Poll for turtle queue idle AND no active user intervals.
    idleWatcher = _nativeSetInterval(() => {
      if (btnState !== "running") {
        _nativeClearInterval(idleWatcher);
        idleWatcher = null;
        return;
      }
      const turtles = window.__ar_turtles ?? [];
      const intervals = window.__ar_intervals ?? new Set();
      if (turtles.length > 0 && turtles.every((t) => t.isIdle) && intervals.size === 0)
        setStopped();
    }, 300);
  };

  // ── Mode switching (Text ↔ Blocks) ───────────────────────────────────────
  const modeSelect = document.getElementById("modeSelect");
  const editorEl = document.getElementById("editor");
  const blocklyArea = document.getElementById("blockly-area");
  const blocklyDiv = document.getElementById("blockly-div");
  const panelRight = document.querySelector(".panel-right");
  const splitterEl = document.querySelector(".splitter");

  const BLOCKS_STORAGE_KEY = "ar-turtle-blocks";
  const toolkitPanel = document.getElementById("toolkit-panel");

  let blocklyWorkspace = null;
  let currentMode = "text";
  // Last code that was synced INTO the workspace — used to detect external edits.
  let lastSyncedCode = null;

  function initBlockly() {
    if (blocklyWorkspace) return;
    blocklyWorkspace = window.__ar_blocklyWorkspace = Blockly.inject(blocklyDiv, {
      toolbox: TOOLBOX,
      grid: { spacing: 20, length: 3, colour: "#ccc", snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0 },
      trashcan: true,
      scrollbars: true,
    });
    // Ensure a default Turtle-typed variable exists for new workspaces.
    if (!blocklyWorkspace.variableMap.getVariable("turtle", "Turtle")) {
      blocklyWorkspace.variableMap.createVariable("turtle", "Turtle");
    }
    // Restore saved workspace state
    const saved = localStorage.getItem(BLOCKS_STORAGE_KEY);
    if (saved) {
      try {
        Blockly.serialization.workspaces.load(JSON.parse(saved), blocklyWorkspace);
      } catch (_) {
        /* ignore corrupt state */
      }
    }
    blocklyWorkspace.addChangeListener(() => {
      if (blocklyWorkspace.isDragging()) return;
      localStorage.setItem(
        BLOCKS_STORAGE_KEY,
        JSON.stringify(Blockly.serialization.workspaces.save(blocklyWorkspace)),
      );
    });
  }

  function blocksToText() {
    if (!blocklyWorkspace) return;
    let generated = javascriptGenerator.workspaceToCode(blocklyWorkspace).trim();
    // Blockly auto-declares all variables with `var`; Turtle vars are declared as
    // `const` by turtle_create blocks, so strip the conflicting var declarations.
    const turtleVarNames = blocklyWorkspace.variableMap
      .getVariablesOfType("Turtle")
      .map((v) => v.name);
    for (const name of turtleVarNames) {
      generated = generated.replace(new RegExp(`^var ${name};\\n?`, "m"), "");
    }
    editor.setValue(generated.trim() || "const turtle = new Turtle();\n");
  }

  function switchToBlocks() {
    initBlockly();
    const code = editor.getValue();
    // Only rebuild blocks from text if the code changed since we last synced.
    // If unchanged, restore saved workspace state (preserves zoom/pan/positions).
    if (code !== lastSyncedCode) {
      textToBlocks(code, blocklyWorkspace);
      lastSyncedCode = code;
      localStorage.setItem(
        BLOCKS_STORAGE_KEY,
        JSON.stringify(Blockly.serialization.workspaces.save(blocklyWorkspace)),
      );
    } else {
      const saved = localStorage.getItem(BLOCKS_STORAGE_KEY);
      if (saved) {
        try {
          Blockly.serialization.workspaces.load(JSON.parse(saved), blocklyWorkspace);
        } catch (_) {}
      }
    }
    toolkitPanel.style.display = "none";
    editorEl.style.display = "none";
    blocklyArea.style.display = "block";
    setTimeout(() => Blockly.svgResize(blocklyWorkspace), 0);
    currentMode = "blocks";
  }

  function switchToText() {
    if (currentMode === "blocks") {
      blocksToText();
      lastSyncedCode = editor.getValue();
    }
    toolkitPanel.style.display = "none";
    editorEl.style.display = "";
    blocklyArea.style.display = "none";
    editor.refresh();
    currentMode = "text";
  }

  function switchToDragToText() {
    if (currentMode === "blocks") {
      blocksToText();
      lastSyncedCode = editor.getValue();
    }
    toolkitPanel.style.display = "";
    editorEl.style.display = "";
    blocklyArea.style.display = "none";
    editor.refresh();
    currentMode = "drag";
  }

  const executeInMode = () => {
    if (currentMode === "blocks") {
      blocksToText();
      execute();
    } else execute();
  };

  // Initial state: toolkit hidden (text mode is default)
  toolkitPanel.style.display = "none";

  // Single execute button listener (mode-aware)
  executeBtn.addEventListener("click", () => {
    if (btnState === "idle") executeInMode();
    else if (btnState === "running") stopRunning();
    else reset();
  });

  modeSelect.addEventListener("change", () => {
    reset();
    if (modeSelect.value === "blocks") switchToBlocks();
    else if (modeSelect.value === "drag") switchToDragToText();
    else switchToText();
  });

  // Blockly must be notified of any left-panel size change (splitter drag or window resize)
  new ResizeObserver(() => {
    if (currentMode === "blocks" && blocklyWorkspace) Blockly.svgResize(blocklyWorkspace);
  }).observe(panelLeft);

  window.addEventListener("resize", () => {
    if (currentMode === "blocks" && blocklyWorkspace) Blockly.svgResize(blocklyWorkspace);
  });
};
