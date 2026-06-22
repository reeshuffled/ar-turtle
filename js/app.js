import { Turtle } from "./turtle.js";
import esprima from "esprima";
import { transformForLivePatch, friendlyError, addInfiniteLoopProtection } from "./live-patch.js";
import * as Blockly from "blockly";
import { javascriptGenerator, TOOLBOX } from "./blocks.js";
import { textToBlocks } from "./text-to-blocks.js";
import { vision, stopVision, preloadVision } from "./vision.js";
import { TOOLKIT_CATEGORIES, getTurtleVarNames, turtleHint } from "./completions.js";
import { initCamera } from "./camera.js";

// Capture native timer/event functions before any user-code patching.
const _nativeSetInterval = window.setInterval.bind(window);
const _nativeClearInterval = window.clearInterval.bind(window);
const _nativeSetTimeout = window.setTimeout.bind(window);
const _nativeClearTimeout = window.clearTimeout.bind(window);
const _nativeELAdd = EventTarget.prototype.addEventListener;

// Expose Turtle and vision on window so user code in the editor can call them.
window.Turtle = Turtle;
window.vision = vision;

class Color {
  static random() {
    return `hsl(${Math.floor(Math.random() * 360)},${50 + Math.floor(Math.random() * 50)}%,${40 + Math.floor(Math.random() * 30)}%)`;
  }
  static invert(color) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
  }
}
window.Color = Color;

window.onKey = (key, fn) => {
  document.addEventListener("keydown", (e) => {
    if (key === "any" || e.key === key) fn(e);
  });
};

window.randUni = (lo, hi) => Math.random() * (hi - lo) + lo;

// Pre-load models immediately — detection loop still starts lazily on first vision.* call.
preloadVision();

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
  const MODE_STORAGE_KEY = "ar-turtle-mode";
  const savedCode = localStorage.getItem(STORAGE_KEY);
  const initialCode = savedCode ?? document.getElementById("code_text").innerHTML.trim();

  const editor = CodeMirror(document.getElementById("editor"), {
    mode: "javascript",
    lineNumbers: true,
    value: initialCode,
    extraKeys: { "Ctrl-Space": "autocomplete" },
    hintOptions: { hint: turtleHint, completeSingle: false },
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
  });

  let saveTimer;
  editor.on("change", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, editor.getValue()), 500);
  });

  // ── Live-patch turtle state while program runs ────────────────────────────
  // Validates code with esprima before applying — incomplete lines are silently skipped.
  const LIVE_STATE_SETTERS = new Set(["color", "thickness", "pu", "pd"]);

  function applyLivePatch(code) {
    if (btnState !== "running") return;
    const turtles = window.__ar_turtles;
    if (!turtles?.length) return;

    let ast;
    try {
      ast = esprima.parseScript(code, { range: true });
    } catch (_) {
      return; // invalid / incomplete — bail silently
    }

    const turtleNames = getTurtleVarNames({ getValue: () => code });
    if (turtleNames.size === 0) return;

    const latest = new Map(); // method → argsStr, last occurrence wins

    function walk(node) {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "ExpressionStatement" &&
        node.expression?.type === "CallExpression" &&
        node.expression.callee?.type === "MemberExpression" &&
        node.expression.callee.object?.type === "Identifier" &&
        turtleNames.has(node.expression.callee.object.name) &&
        LIVE_STATE_SETTERS.has(node.expression.callee.property?.name)
      ) {
        const call = node.expression;
        const method = call.callee.property.name;
        const argsStr = call.arguments.length
          ? code.slice(
              call.arguments[0].range[0],
              call.arguments[call.arguments.length - 1].range[1],
            )
          : "";
        latest.set(method, argsStr);
      }
      for (const v of Object.values(node)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object" && v.type) walk(v);
      }
    }
    walk(ast);

    for (const [method, argsStr] of latest) {
      try {
        // eslint-disable-next-line no-new-func
        new Function(
          "turtles",
          `
          if (window.__ar_live) window.__ar_live.${method} = ${argsStr};
          turtles.forEach(t => t.${method}(${argsStr}));
        `,
        )(turtles);
      } catch (_) {
        /* malformed args — skip */
      }
    }
  }

  let livePatchTimer;
  editor.on("change", () => {
    clearTimeout(livePatchTimer);
    livePatchTimer = setTimeout(() => applyLivePatch(editor.getValue()), 400);
  });

  // ── Build drag-to-text toolkit ────────────────────────────────────────────
  const toolkitBody = document.getElementById("toolkit-body");

  const toolTipEl = document.createElement("div");
  toolTipEl.id = "toolkit-tooltip";
  document.body.appendChild(toolTipEl);

  const showTooltip = (text, anchorEl) => {
    toolTipEl.textContent = text;
    toolTipEl.style.display = "block";
    const rect = anchorEl.getBoundingClientRect();
    const left = rect.right + 8;
    const top = rect.top + rect.height / 2;
    toolTipEl.style.left = `${left}px`;
    toolTipEl.style.top = `${top}px`;
    toolTipEl.style.transform = "translateY(-50%)";
  };
  const hideTooltip = () => {
    toolTipEl.style.display = "none";
  };

  for (const cat of TOOLKIT_CATEGORIES) {
    const catEl = document.createElement("div");
    catEl.className = "toolkit-category";
    catEl.textContent = cat.name;
    toolkitBody.appendChild(catEl);
    for (const cmd of cat.commands) {
      const btn = document.createElement("div");
      btn.className = "toolkit-btn";
      btn.draggable = true;
      btn.innerHTML = `<span>${cmd.label}</span><span class="toolkit-info" title="">ℹ</span>`;
      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("application/x-ar-toolkit", cmd.code);
        e.dataTransfer.effectAllowed = "copy";
        btn.classList.add("dragging");
        hideTooltip();
      });
      btn.addEventListener("dragend", () => btn.classList.remove("dragging"));

      if (cmd.hint) {
        const infoSpan = btn.querySelector(".toolkit-info");
        infoSpan.addEventListener("mouseenter", () => showTooltip(cmd.hint, infoSpan));
        infoSpan.addEventListener("mouseleave", hideTooltip);
        infoSpan.addEventListener("mousedown", (e) => e.stopPropagation());
      }

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

  const turtleCanvas = document.getElementById("turtle");
  const canvasWrapper = document.getElementById("canvasWrapper");
  canvasWrapper.tabIndex = 0;
  window.__ar_canvasEl = canvasWrapper;

  // Layer canvas management — each turtle z-index gets its own canvas.
  // z=0 reuses #turtle; other z values create canvases on demand.
  // CSS z-index: negative turtle z → negative CSS (behind camera); positive → 20+z.
  window.__ar_layers = new Map([[0, turtleCanvas]]);
  window.__ar_getLayerCanvas = (z) => {
    if (window.__ar_layers.has(z)) return window.__ar_layers.get(z);
    const c = document.createElement("canvas");
    c.width = turtleCanvas.width;
    c.height = turtleCanvas.height;
    c.className = "ar-turtle-layer";
    Object.assign(c.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: String(z < 0 ? z : 20 + z),
      pointerEvents: "none",
    });
    canvasWrapper.appendChild(c);
    window.__ar_layers.set(z, c);
    return c;
  };

  // Keep wrapper 16:9, filling available space.
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const w = Math.min(width, (height * 16) / 9);
    canvasWrapper.style.width = `${w}px`;
    canvasWrapper.style.height = `${(w * 9) / 16}px`;
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
    const fsBtn = document.getElementById("fullscreenBtn");
    fsBtn.innerHTML = inFs ? ICONS.exitFullscreen : ICONS.fullscreen;
    fsBtn.title = inFs ? "Exit Fullscreen" : "Fullscreen";
    document.getElementById("fullscreenBtn").classList.toggle("active", inFs);
    // On exit, inline styles restore; update sprite for restored size.
    if (!inFs) updateSprite();
  });

  // ── Webcam ─────────────────────────────────────────────────────────────────
  initCamera();

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

  const isMediaPipeLog = (s) =>
    /^[IW]\d{4}|Graph successfully|TensorFlow Lite|gl_context|inference_feedback|gesture_recognizer_graph|face_landmarker_graph|landmark_projection|hand_gesture|Custom gesture/.test(
      s,
    );

  console.log = (...args) => {
    _log(...args);
    const msg = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
      .join(" ");
    if (!isMediaPipeLog(msg)) appendConsole(msg);
  };
  console.error = (...args) => {
    _error(...args);
    const msg = args
      .map((a) => (typeof a === "object" && a !== null ? JSON.stringify(a, null, 2) : String(a)))
      .join(" ");
    if (!isMediaPipeLog(msg)) appendConsole(`<span class="err">${msg}</span>`);
  };
  console.clear = () => {
    consoleEl.innerHTML = "";
    _clear();
  };

  // ── Execute / Stop Running / Reset ───────────────────────────────────────
  // States: idle → running ↔ paused → stopped → idle
  const executeBtn = document.getElementById("execute");
  const stopBtn = document.getElementById("stopBtn");
  const stepBtn = document.getElementById("stepBtn");
  const clearCanvasBtn = document.getElementById("clearCanvasBtn");
  let btnState = "idle";
  let idleWatcher = null;

  const ICONS = {
    play: `<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" style="display:block"><polygon points="3,1 13,8 3,15"/></svg>`,
    pause: `<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" style="display:block"><rect x="2" y="1" width="4" height="14" rx="1"/><rect x="10" y="1" width="4" height="14" rx="1"/></svg>`,
    stop: `<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" style="display:block"><rect x="2" y="2" width="12" height="12" rx="2"/></svg>`,
    reset: `<svg viewBox="0 0 16 16" width="22" height="22" style="display:block"><defs><marker id="reset-arr" markerWidth="4" markerHeight="3" refX="4" refY="1.5" orient="auto" markerUnits="strokeWidth"><polygon points="0,0 4,1.5 0,3" fill="currentColor"/></marker></defs><path d="M14 8A6 6 0 1 1 11 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" marker-end="url(#reset-arr)"/></svg>`,
    erase: `<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M1 13L5 4h7l-4 9H1z"/><line x1="4" y1="10" x2="9" y2="10"/><line x1="1" y1="13" x2="15" y2="13"/></svg>`,
    fullscreen: `<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="1,5 1,1 5,1"/><polyline points="11,1 15,1 15,5"/><polyline points="15,11 15,15 11,15"/><polyline points="5,15 1,15 1,11"/></svg>`,
    exitFullscreen: `<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="5,1 5,5 1,5"/><polyline points="11,1 11,5 15,5"/><polyline points="11,15 11,11 15,11"/><polyline points="5,15 5,11 1,11"/></svg>`,
  };

  // Patch window.setInterval/clearInterval so we can track active user intervals.
  // Uses _nativeSetInterval so our own idleWatcher is invisible to the tracker.
  const patchTimers = () => {
    window.__ar_intervals = new Map();
    window.__ar_timeouts = new Map();
    window.setInterval = (cb, delay, ...args) => {
      const id = _nativeSetInterval(cb, delay, ...args);
      window.__ar_intervals.set(id, { cb, delay, args });
      return id;
    };
    window.clearInterval = (id) => {
      window.__ar_intervals?.delete(id);
      _nativeClearInterval(id);
    };
    window.setTimeout = (cb, delay = 0, ...args) => {
      let id;
      const wrapped = (...a) => {
        window.__ar_timeouts?.delete(id);
        cb(...a);
      };
      id = _nativeSetTimeout(wrapped, delay, ...args);
      window.__ar_timeouts.set(id, { cb, delay, createdAt: Date.now(), args });
      return id;
    };
    window.clearTimeout = (id) => {
      window.__ar_timeouts?.delete(id);
      _nativeClearTimeout(id);
    };
  };

  const unpatchTimers = () => {
    window.setInterval = _nativeSetInterval;
    window.clearInterval = _nativeClearInterval;
    window.setTimeout = _nativeSetTimeout;
    window.clearTimeout = _nativeClearTimeout;
    window.__ar_intervals = new Map();
    window.__ar_timeouts = new Map();
  };

  const patchListeners = () => {
    window.__ar_listeners = [];
    EventTarget.prototype.addEventListener = function (type, handler, options) {
      window.__ar_listeners.push({ target: this, type, handler, options });
      return _nativeELAdd.call(this, type, handler, options);
    };
  };

  const unpatchListeners = () => {
    EventTarget.prototype.addEventListener = _nativeELAdd;
    window.__ar_listeners?.forEach(({ target, type, handler, options }) => {
      target?.removeEventListener(type, handler, options);
    });
    window.__ar_listeners = [];
  };

  const setIdle = () => {
    btnState = "idle";
    executeBtn.innerHTML = ICONS.play;
    executeBtn.title = "Execute Program";
    executeBtn.style.backgroundColor = "green";
    stopBtn.style.display = "none";
    stepBtn.style.display = "none";
    clearCanvasBtn.style.display = "none";
  };

  const setRunning = () => {
    btnState = "running";
    executeBtn.innerHTML = ICONS.pause;
    executeBtn.title = "Pause";
    executeBtn.style.backgroundColor = "#c07000";
    stopBtn.style.display = "flex";
    stepBtn.style.display = "none";
    clearCanvasBtn.style.display = "flex";
  };

  const setPaused = () => {
    btnState = "paused";
    executeBtn.innerHTML = ICONS.play;
    executeBtn.title = "Resume";
    executeBtn.style.backgroundColor = "green";
    stopBtn.style.display = "flex";
    stepBtn.style.display = "flex";
    clearCanvasBtn.style.display = "flex";
  };

  const setStopped = () => {
    if (idleWatcher) {
      _nativeClearInterval(idleWatcher);
      idleWatcher = null;
    }
    btnState = "stopped";
    executeBtn.innerHTML = ICONS.reset;
    executeBtn.title = "Reset";
    executeBtn.style.backgroundColor = "#b00";
    stopBtn.style.display = "none";
    stepBtn.style.display = "none";
    clearCanvasBtn.style.display = "none";
  };

  const stopRunning = () => {
    window.__ar_pausedIntervals = null;
    window.__ar_pausedTimeouts = null;
    unpatchTimers();
    unpatchListeners();
    stopVision();
    for (let i = 1; i < 999999; i++) _nativeClearInterval(i);
    idleWatcher = null;
    setStopped();
  };
  window.stop = stopRunning;
  window.stopRunning = stopRunning;

  const startIdleWatcher = () => {
    idleWatcher = _nativeSetInterval(() => {
      if (btnState !== "running") {
        _nativeClearInterval(idleWatcher);
        idleWatcher = null;
        return;
      }
      const turtles = window.__ar_turtles ?? [];
      const intervals = window.__ar_intervals ?? new Map();
      const listeners = window.__ar_listeners ?? [];
      if (
        turtles.length > 0 &&
        turtles.every((t) => t.isIdle) &&
        intervals.size === 0 &&
        listeners.length === 0
      )
        setStopped();
    }, 300);
  };

  const pauseRunning = () => {
    if (idleWatcher) {
      _nativeClearInterval(idleWatcher);
      idleWatcher = null;
    }
    window.__ar_turtles?.forEach((t) => t.pause());
    window.__ar_pausedIntervals = new Map(window.__ar_intervals);
    for (const id of (window.__ar_intervals ?? new Map()).keys()) _nativeClearInterval(id);
    window.__ar_intervals?.clear();
    window.__ar_pausedTimeouts = new Map(window.__ar_timeouts);
    for (const id of (window.__ar_timeouts ?? new Map()).keys()) _nativeClearTimeout(id);
    window.__ar_timeouts?.clear();
    setPaused();
  };
  window.pause = pauseRunning;

  const resumeRunning = () => {
    window.__ar_turtles?.forEach((t) => t.resume());
    for (const { cb, delay, args } of (window.__ar_pausedIntervals ?? new Map()).values()) {
      window.setInterval(cb, delay, ...args);
    }
    window.__ar_pausedIntervals = null;
    const now = Date.now();
    for (const { cb, delay, createdAt, args } of (
      window.__ar_pausedTimeouts ?? new Map()
    ).values()) {
      const remaining = Math.max(0, delay - (now - createdAt));
      window.setTimeout(cb, remaining, ...args);
    }
    window.__ar_pausedTimeouts = null;
    setRunning();
    startIdleWatcher();
  };
  window.resume = resumeRunning;

  const stepProgram = () => {
    if (btnState !== "paused") return;
    const turtles = window.__ar_turtles ?? [];

    // Drain one item from the first turtle that has queue items.
    let stepped = false;
    for (const t of turtles) {
      if (t.stepOnce()) { stepped = true; break; }
    }

    if (!stepped) {
      // Queues empty. If forever loops are active (paused, polling every 50ms),
      // briefly unpause so one iteration fires and refills the queue, then re-pause.
      const hasForever = turtles.some(t => !t.isIdle && t.queueEmpty);
      if (hasForever) {
        resumeRunning();
        _nativeSetTimeout(() => { if (btnState === "running") pauseRunning(); }, 60);
      } else {
        const intervals = window.__ar_intervals ?? new Map();
        const listeners = window.__ar_listeners ?? [];
        if (intervals.size === 0 && listeners.length === 0) setStopped();
      }
    }
  };
  window.step = stepProgram;

  const contextualError = (raw) => {
    const msg = friendlyError(raw);
    return currentMode === "blocks" ? `Block error — ${msg}` : `Error: ${msg}`;
  };
  window.__ar_friendlyError = contextualError;

  window.onerror = (message, _source, _lineno, _colno, error) => {
    if (btnState !== "running" && btnState !== "paused") return false;
    console.error(contextualError(error ?? message));
    stopRunning();
    return false;
  };

  window.onunhandledrejection = (e) => {
    if (btnState !== "running" && btnState !== "paused") return;
    console.error(contextualError(e.reason));
    stopRunning();
  };

  const reset = () => {
    window.__ar_pausedIntervals = null;
    window.__ar_pausedTimeouts = null;
    unpatchTimers();
    unpatchListeners();
    stopVision();
    window.__ar_turtles?.forEach((t) => t.stop());
    window.__ar_turtles = [];
    window.__ar_live = {};
    for (let i = 1; i < 999999; i++) _nativeClearInterval(i);
    idleWatcher = null;
    if (currentScript) {
      document.body.removeChild(currentScript);
      currentScript = null;
    }
    window.__ar_layer_objects?.forEach((layer) => layer.reset());
    window.__ar_layer_objects = new Map();
    for (const [z, c] of window.__ar_layers) {
      c.getContext("2d").clearRect(0, 0, c.width, c.height);
      if (z !== 0) c.remove();
    }
    window.__ar_layers = new Map([[0, turtleCanvas]]);
    setIdle();
  };

  const execute = () => {
    reset();
    consoleEl.innerHTML = "";
    patchTimers();
    patchListeners();

    const raw = editor.getValue();
    const { code: transformed } = transformForLivePatch(raw);
    let protected_code;
    try {
      protected_code = addInfiniteLoopProtection(transformed);
    } catch (_) {
      protected_code = transformed;
    }

    // .then() handles no-turtle, no-interval programs (pure console.log etc)
    const code =
      `(async function(){\n${protected_code}\n})()` +
      `.catch(e => console.error("Error: " + window.__ar_friendlyError(e)))` +
      `.then(() => window.__ar_iifeDone?.());`;

    window.__ar_iifeDone = () => {
      if (btnState !== "running") return;
      const turtles = window.__ar_turtles ?? [];
      const intervals = window.__ar_intervals ?? new Map();
      const listeners = window.__ar_listeners ?? [];
      if (turtles.length === 0 && intervals.size === 0 && listeners.length === 0) setStopped();
    };

    setRunning();

    const script = document.createElement("script");
    try {
      script.appendChild(document.createTextNode(code));
    } catch (e) {
      script.text = code;
    }
    document.body.appendChild(script);
    currentScript = script;

    startIdleWatcher();
  };

  // ── Mode switching (Text ↔ Blocks) ───────────────────────────────────────
  const modeSelect = document.getElementById("modeSelect");
  const editorEl = document.getElementById("editor");
  const blocklyArea = document.getElementById("blockly-area");
  const blocklyDiv = document.getElementById("blockly-div");
  const BLOCKS_STORAGE_KEY = "ar-turtle-blocks";
  const toolkitPanel = document.getElementById("toolkit-panel");

  let blocklyWorkspace = null;
  let currentMode = "text";
  // Last code that was synced INTO the workspace — used to detect external edits.
  let lastSyncedCode = null;

  function initBlockly() {
    if (blocklyWorkspace) return;
    // Temporarily restore native addEventListener so Blockly internals aren't tracked
    // as user-code listeners (they'd crash unpatchListeners on stop).
    const prevAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = _nativeELAdd;
    blocklyWorkspace = window.__ar_blocklyWorkspace = Blockly.inject(blocklyDiv, {
      toolbox: TOOLBOX,
      renderer: "zelos",
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
    EventTarget.prototype.addEventListener = prevAdd;
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
    if (currentMode === "blocks" && btnState !== "running" && btnState !== "paused") {
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
    if (currentMode === "blocks" && btnState !== "running" && btnState !== "paused") {
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

  clearCanvasBtn.addEventListener("click", () => {
    for (const c of window.__ar_layers.values()) {
      c.getContext("2d").clearRect(0, 0, c.width, c.height);
    }
  });

  executeBtn.addEventListener("click", () => {
    if (btnState === "idle") executeInMode();
    else if (btnState === "running") pauseRunning();
    else if (btnState === "paused") resumeRunning();
    else reset();
  });

  stopBtn.addEventListener("click", () => {
    if (btnState === "running" || btnState === "paused") stopRunning();
  });

  stepBtn.addEventListener("click", stepProgram);

  // Seed lastSyncedCode so switchToBlocks on refresh doesn't re-convert text → blocks.
  lastSyncedCode = editor.getValue();

  const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
  if (savedMode && savedMode !== "text") {
    modeSelect.value = savedMode;
    if (savedMode === "blocks") switchToBlocks();
    else if (savedMode === "drag") switchToDragToText();
  }

  modeSelect.addEventListener("change", () => {
    localStorage.setItem(MODE_STORAGE_KEY, modeSelect.value);
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
