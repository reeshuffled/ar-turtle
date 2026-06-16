import { Turtle } from './turtle.js';

// Expose Turtle on window so user code in the editor can call `new Turtle(c)`.
window.Turtle = Turtle;

const TURTLE_COMPLETIONS = [
  { text: 'forward',   displayText: 'forward(amount) — move forward by amount pixels' },
  { text: 'backward',  displayText: 'backward(amount) — move backward by amount pixels' },
  { text: 'right',     displayText: 'right(deg) — turn right by degrees' },
  { text: 'left',      displayText: 'left(deg) — turn left by degrees' },
  { text: 'xy',        displayText: 'xy(x, y) — teleport to canvas coordinate' },
  { text: 'x',         displayText: 'x(x) — move to x, keep y' },
  { text: 'y',         displayText: 'y(y) — move to y, keep x' },
  { text: 'heading',   displayText: 'heading(deg) — set absolute heading in degrees' },
  { text: 'face',      displayText: 'face(x, y) — point toward canvas coordinate' },
  { text: 'butt',      displayText: 'butt(x, y) — point away from canvas coordinate' },
  { text: 'disc',      displayText: 'disc(radius) — draw filled circle at current position' },
  { text: 'circle',    displayText: 'circle(radius) — draw circle outline at current position' },
  { text: 'pu',        displayText: 'pu() — pen up: lift pen, stop drawing lines' },
  { text: 'pd',        displayText: 'pd() — pen down: draw lines while moving' },
  { text: 'color',     displayText: 'color(c) — set pen color (any CSS color string)' },
  { text: 'thickness', displayText: 'thickness(w) — set pen stroke width' },
  { text: 'clean',     displayText: 'clean(color?) — fill background; optional color arg' },
  { text: 'home',      displayText: 'home() — return to center and reset heading to 0°' },
  { text: 'clear',     displayText: 'clear() — clean + home + pen down' },
  { text: 'reset',     displayText: 'reset() — full reset: transparent bg, white pen, clear' },
  { text: 'stop',      displayText: 'stop() — cancel all pending queued commands' },
  { text: 'repeat',    displayText: 'repeat(n, fn) — call fn(i) n times; return false to break' },
  { text: 'forever',   displayText: 'forever(fn) — loop fn(i) until fn returns false' },
  { text: 'get',       displayText: 'get — getters: .x .y .heading .pu .pd .color .thickness .background .oob .top .left .right .bottom' },
  { text: 'rand',      displayText: 'rand — randoms: .uni(lo,hi) .norm(mean,sd) .chance(odds)' },
  { text: 'on',        displayText: 'on(event, fn) — listen to: "move", "rotate", "pu", "pd"' },
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
    token = { start: cur.ch, end: cur.ch, string: '', type: token.string === '.' ? 'property' : null, state: token.state };
  } else if (token.end > cur.ch) {
    token.end = cur.ch;
    token.string = token.string.slice(0, cur.ch - token.start);
  }

  if (token.type === 'property') {
    const dotToken = cm.getTokenAt(Pos(cur.line, token.start));
    if (dotToken.string === '.') {
      const objToken = cm.getTokenAt(Pos(cur.line, dotToken.start));
      if (getTurtleVarNames(cm).has(objToken.string)) {
        const prefix = token.string;
        return {
          list: TURTLE_COMPLETIONS.filter(c => c.text.startsWith(prefix)),
          from: Pos(cur.line, token.start),
          to: Pos(cur.line, token.end),
        };
      }
    }
  }

  return CodeMirror.hint.javascript(cm, options);
}

window.onload = () => {
  $('.panel-left').resizable({
    handleSelector: '.splitter',
    resizeHeight: false,
  });

  const STORAGE_KEY = 'ar-turtle-code';
  const savedCode = localStorage.getItem(STORAGE_KEY);
  const initialCode = savedCode ?? document.getElementById('code_text').innerHTML.trim();

  const editor = CodeMirror(document.getElementById('editor'), {
    mode: 'javascript',
    lineNumbers: true,
    value: initialCode,
    extraKeys: { 'Ctrl-Space': 'autocomplete' },
    hintOptions: { hint: turtleHint, completeSingle: false },
  });

  let saveTimer;
  editor.on('change', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => localStorage.setItem(STORAGE_KEY, editor.getValue()), 500);
  });

  editor.on('inputRead', (cm, change) => {
    if (change.text[0] === '.') {
      CodeMirror.commands.autocomplete(cm, turtleHint, { completeSingle: false });
    }
  });
  editor.setOption('lint', true);

  let currentScript = null;
  let currentStream = null;

  const turtleCanvas = document.getElementById('turtle');
  const canvasWrapper = document.getElementById('canvasWrapper');

  // Keep wrapper square and within panel bounds.
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const size = Math.min(width, height);
    canvasWrapper.style.width  = `${size}px`;
    canvasWrapper.style.height = `${size}px`;
  }).observe(document.querySelector('.panel-right'));

  // ── Fullscreen ────────────────────────────────────────────────────────────────
  document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.getElementById('fsContainer').requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const inFs = !!document.fullscreenElement;
    document.getElementById('fullscreenBtn').textContent = inFs ? 'Exit Fullscreen' : 'Fullscreen';
    document.getElementById('fullscreenBtn').classList.toggle('active', inFs);
    // On exit, inline styles restore; update sprite for restored size.
    if (!inFs) updateSprite();
  });

  // ── Webcam ─────────────────────────────────────────────────────────────────
  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;

  const cameraCanvas = document.getElementById('camera');
  const cameraCtx = cameraCanvas.getContext('2d');
  let rafId = null;

  const drawFrame = () => {
    rafId = requestAnimationFrame(drawFrame);
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      cameraCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
    }
  };

  let cameraOn = false;

  const startCamera = (deviceId) => {
    currentStream?.getTracks().forEach(t => t.stop());
    currentStream = null;
    const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true };
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        currentStream = stream;
        video.srcObject = stream;
        document.getElementById('cameraToggle').style.display = '';
        if (cameraOn && !rafId) drawFrame();
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(populateCameras)
      .catch((err) => console.warn('Camera unavailable:', err.message));
  };

  document.getElementById('cameraToggle').addEventListener('click', () => {
    cameraOn = !cameraOn;
    const toggle = document.getElementById('cameraToggle');
    toggle.textContent = cameraOn ? 'Turn Camera Off' : 'Turn Camera On';
    toggle.classList.toggle('active', cameraOn);
    if (cameraOn) {
      if (!rafId) drawFrame();
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
      cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);
    }
  });

  const populateCameras = (devices) => {
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const select = document.getElementById('cameraSelect');
    const current = select.value;
    select.innerHTML = '';
    videoDevices.forEach((device, i) => {
      const opt = document.createElement('option');
      opt.value = device.deviceId;
      opt.text = device.label || `Camera ${i + 1}`;
      if (opt.value === current) opt.selected = true;
      select.appendChild(opt);
    });
    document.getElementById('cameraWrapper').style.display =
      videoDevices.length > 1 ? '' : 'none';
  };

  document.getElementById('cameraSelect').addEventListener('change', function () {
    startCamera(this.value);
  });

  if (navigator.mediaDevices?.getUserMedia) {
    startCamera(null);
  }

  // ── Execute / Reset ───────────────────────────────────────────────────────
  const executeBtn = document.getElementById('execute');
  let running = false;

  const reset = () => {
    running = false;
    window.__ar_turtles?.forEach(t => t.stop());
    window.__ar_turtles = [];
    if (currentScript) {
      document.body.removeChild(currentScript);
      currentScript = null;
    }
    turtleCanvas.getContext('2d').clearRect(0, 0, turtleCanvas.width, turtleCanvas.height);
    executeBtn.textContent = 'Execute Program';
    executeBtn.style.backgroundColor = 'green';
  };

  const execute = () => {
    reset();
    // Wrap in IIFE so const/let don't pollute global scope on re-execution.
    const code = `(function(){\n${editor.getValue()}\n})();`;
    const script = document.createElement('script');
    try {
      script.appendChild(document.createTextNode(code));
    } catch (e) {
      script.text = code;
    }
    document.body.appendChild(script);
    currentScript = script;
    running = true;
    executeBtn.textContent = 'Reset';
    executeBtn.style.backgroundColor = '#b00';
  };

  executeBtn.addEventListener('click', () => {
    if (running) reset(); else execute();
  });
};
