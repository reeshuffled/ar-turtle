import { Turtle } from "./turtle.js";
import esprima from "esprima";
import { transformForLivePatch, friendlyError, addInfiniteLoopProtection } from "./live-patch.js";
import * as Blockly from "blockly";
import { javascriptGenerator, TOOLBOX } from "./blocks.js";
import { textToBlocks } from "./text-to-blocks.js";
import { vision, stopVision, preloadVision } from "./vision.js";

// Capture native timer/event functions before any user-code patching.
const _nativeSetInterval = window.setInterval.bind(window);
const _nativeClearInterval = window.clearInterval.bind(window);
const _nativeELAdd = EventTarget.prototype.addEventListener;

// Expose Turtle and vision on window so user code in the editor can call them.
window.Turtle = Turtle;
window.vision = vision;

// Pre-load models immediately — detection loop still starts lazily on first vision.* call.
preloadVision();

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
  { text: "arc", displayText: "arc(radius, degrees) — sweep arc; positive degrees = left, negative = right" },
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
  { text: "wait", displayText: "wait(seconds) — pause queue for N seconds before next command" },
  {
    text: "get",
    displayText:
      "get — getters: .x .y .heading .pu .pd .color .thickness .background .oob .top .left .right .bottom",
  },
  { text: "rand", displayText: "rand — randoms: .uni(lo,hi) .norm(mean,sd) .chance(odds)" },
  { text: "on", displayText: 'on(event, fn) — listen to: "move", "rotate", "pu", "pd"' },
  { text: "onEdge", displayText: "onEdge(fn) — call fn when turtle crosses canvas edge (fires once per crossing)" },
  { text: "onCollide", displayText: "onCollide(other, dist, fn) — call fn when this turtle is within dist px of other" },
  { text: "seek", displayText: "seek(obj, step?) — face and move step px toward {cx,cy} object; no-op if null" },
  { text: "goTo", displayText: "goTo(obj) — snap to {cx,cy} object center; no-op if null" },
];

// ── Drag-to-text toolkit data ─────────────────────────────────────────────
const TOOLKIT_CATEGORIES = [
  {
    name: "Turtle",
    commands: [
      { label: "create turtle", code: "const turtle = new Turtle();", hint: "Create a new turtle on the canvas" },
    ],
  },
  {
    name: "Move",
    commands: [
      { label: "forward", code: "turtle.forward(50);", hint: "Move forward by 50 pixels" },
      { label: "backward", code: "turtle.backward(50);", hint: "Move backward by 50 pixels" },
      { label: "go to x, y", code: "turtle.xy(0, 0);", hint: "Teleport to canvas coordinate (0, 0)" },
      { label: "home", code: "turtle.home();", hint: "Return to center and reset heading to 0°" },
      { label: "clear", code: "turtle.clear();", hint: "Fill background, go home, and put pen down" },
      { label: "clean", code: "turtle.clean();", hint: "Fill background with color (keeps position)" },
    ],
  },
  {
    name: "Turn",
    commands: [
      { label: "right 90°", code: "turtle.right(90);", hint: "Turn right by 90 degrees" },
      { label: "left 90°", code: "turtle.left(90);", hint: "Turn left by 90 degrees" },
      { label: "heading", code: "turtle.heading(0);", hint: "Set absolute heading in degrees (0 = up)" },
      { label: "face x, y", code: "turtle.face(0, 0);", hint: "Point toward canvas coordinate (0, 0)" },
    ],
  },
  {
    name: "Pen",
    commands: [
      { label: "random color", code: "`hsl(${Math.floor(Math.random()*360)},${50+Math.floor(Math.random()*50)}%,${40+Math.floor(Math.random()*30)}%)`", hint: "A random saturated color as an HSL string" },
      { label: "pen up", code: "turtle.pu();", hint: "Lift pen — move without drawing" },
      { label: "pen down", code: "turtle.pd();", hint: "Lower pen — draw lines while moving" },
      { label: "color", code: "turtle.color('red');", hint: "Set pen color (any CSS color string)" },
      { label: "thickness", code: "turtle.thickness(2);", hint: "Set pen stroke width in pixels" },
    ],
  },
  {
    name: "Draw",
    commands: [
      { label: "disc", code: "turtle.disc(20);", hint: "Draw a filled circle at current position" },
      { label: "circle", code: "turtle.circle(20);", hint: "Draw a circle outline at current position" },
      { label: "arc", code: "turtle.arc(50, 90);", hint: "Sweep an arc: arc(radius, degrees) — positive degrees = left, negative = right" },
    ],
  },
  {
    name: "Control",
    commands: [
      { label: "repeat", code: "turtle.repeat(4, () => {\n  \n});", hint: "Run commands N times: repeat(count, fn)" },
      { label: "forever", code: "turtle.forever(() => {\n  \n});", hint: "Loop forever — return false from fn to stop" },
      { label: "wait", code: "turtle.wait(1);", hint: "Pause the turtle queue for N seconds" },
      { label: "set interval", code: "setInterval(() => {\n  \n}, 100);", hint: "Run code every N milliseconds" },
      { label: "set timeout", code: "setTimeout(() => {\n  \n}, 1000);", hint: "Run code once after N milliseconds" },
    ],
  },
  {
    name: "Vision",
    commands: [
      { label: "seek object", code: "turtle.seek(vision.nearest('person'));", hint: "Move turtle toward nearest detected person (runs detection automatically)" },
      { label: "goTo object", code: "turtle.goTo(vision.nearest('person'));", hint: "Snap turtle to nearest detected person" },
      { label: "nearest object", code: "vision.nearest('person')", hint: "Highest-confidence detected object of label — {label, cx, cy, confidence} or null" },
      { label: "all objects", code: "vision.objects()", hint: "All detected objects — [{label, cx, cy, confidence}]" },
      { label: "gesture", code: "vision.gesture()", hint: "Current hand gesture — 'Thumb_Up', 'Open_Palm', 'Closed_Fist', 'Pointing_Up', 'Victory', 'ILoveYou', or null" },
      { label: "expression", code: "vision.expression()", hint: "Current face expression — 'smile', 'surprise', 'frown', 'mouth_open', 'neutral', or null" },
      { label: "hands", code: "vision.hands()", hint: "All detected hands — [{gesture, cx, cy, confidence, landmarks}]" },
      { label: "face", code: "vision.face()", hint: "Detected face — {expression, cx, cy, landmarks} or null" },
    ],
  },
  {
    name: "Events",
    commands: [
      { label: "on move", code: "turtle.on('move', () => {\n  \n});", hint: "Fire when turtle moves (events: 'move', 'rotate', 'pu', 'pd')" },
      { label: "on edge", code: "turtle.onEdge(() => {\n  \n});", hint: "Fire once each time turtle crosses the canvas edge" },
      { label: "on collide", code: "turtle.onCollide(other, 20, () => {\n  \n});", hint: "Fire when this turtle comes within dist px of another turtle" },
      { label: "on key", code: "window.__ar_canvasEl.addEventListener('keydown', (e) => {\n  \n});", hint: "Fire when a key is pressed — check e.key for which key" },
    ],
  },
];

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
  const MODE_STORAGE_KEY = "ar-turtle-mode";
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
          ? code.slice(call.arguments[0].range[0], call.arguments[call.arguments.length - 1].range[1])
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
        new Function("turtles", `
          if (window.__ar_live) window.__ar_live.${method} = ${argsStr};
          turtles.forEach(t => t.${method}(${argsStr}));
        `)(turtles);
      } catch (_) { /* malformed args — skip */ }
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
  const hideTooltip = () => { toolTipEl.style.display = "none"; };

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
  let currentStream = null;

  const turtleCanvas = document.getElementById("turtle");
  const canvasWrapper = document.getElementById("canvasWrapper");
  canvasWrapper.tabIndex = 0;
  window.__ar_canvasEl = canvasWrapper;

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
  window.__ar_video = video;

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

  const isMediaPipeLog = (s) =>
    /^[IW]\d{4}|Graph successfully|TensorFlow Lite|gl_context|inference_feedback|gesture_recognizer_graph|face_landmarker_graph|landmark_projection|hand_gesture|Custom gesture/.test(s);

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
  // States: 'idle' → 'running' → 'stopped' → 'idle'
  const executeBtn = document.getElementById("execute");
  const clearCanvasBtn = document.getElementById("clearCanvasBtn");
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
      target.removeEventListener(type, handler, options);
    });
    window.__ar_listeners = [];
  };

  const setIdle = () => {
    btnState = "idle";
    executeBtn.textContent = "Execute Program";
    executeBtn.style.backgroundColor = "green";
    clearCanvasBtn.style.display = "none";
  };

  const setStopped = () => {
    if (idleWatcher) {
      _nativeClearInterval(idleWatcher);
      idleWatcher = null;
    }
    btnState = "stopped";
    executeBtn.textContent = "Reset";
    executeBtn.style.backgroundColor = "#b00";
    clearCanvasBtn.style.display = "none";
  };

  const stopRunning = () => {
    unpatchTimers();
    unpatchListeners();
    stopVision();
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
    turtleCanvas.getContext("2d").clearRect(0, 0, turtleCanvas.width, turtleCanvas.height);
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
      const intervals = window.__ar_intervals ?? new Set();
      const listeners = window.__ar_listeners ?? [];
      if (turtles.length === 0 && intervals.size === 0 && listeners.length === 0) setStopped();
    };

    btnState = "running";
    executeBtn.textContent = "Stop Running";
    executeBtn.style.backgroundColor = "#c07000";
    clearCanvasBtn.style.display = "";

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
      const listeners = window.__ar_listeners ?? [];
      if (turtles.length > 0 && turtles.every((t) => t.isIdle) && intervals.size === 0 && listeners.length === 0)
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

  clearCanvasBtn.addEventListener("click", () => {
    turtleCanvas.getContext("2d").clearRect(0, 0, turtleCanvas.width, turtleCanvas.height);
  });

  // Single execute button listener (mode-aware)
  executeBtn.addEventListener("click", () => {
    if (btnState === "idle") executeInMode();
    else if (btnState === "running") stopRunning();
    else reset();
  });

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
