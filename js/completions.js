export const TURTLE_COMPLETIONS = [
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
  {
    text: "arc",
    displayText: "arc(radius, degrees) — sweep arc; positive degrees = left, negative = right",
  },
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
  {
    text: "onEdge",
    displayText: "onEdge(fn) — call fn when turtle crosses canvas edge (fires once per crossing)",
  },
  {
    text: "onCollide",
    displayText: "onCollide(other, dist, fn) — call fn when this turtle is within dist px of other",
  },
  {
    text: "z",
    displayText: "z(layer) — switch turtle drawing to this layer (negative = behind camera)",
  },
  {
    text: "getCanvas",
    displayText: "getCanvas() — returns the HTMLCanvasElement for this turtle's current layer",
  },
  {
    text: "getLayer",
    displayText: "getLayer() — returns Layer for this turtle's current z; same z → same object",
  },
  {
    text: "seek",
    displayText: "seek(obj, step?) — face and move step px toward {cx,cy} object; no-op if null",
  },
  { text: "goTo", displayText: "goTo(obj) — snap to {cx,cy} object center; no-op if null" },
];

export const TOOLKIT_CATEGORIES = [
  {
    name: "Turtle",
    commands: [
      {
        label: "create turtle",
        code: "const turtle = new Turtle();",
        hint: "Create a new turtle at layer 0 (default)",
      },
      {
        label: "create turtle at layer",
        code: "const turtle = new Turtle(1);",
        hint: "Create a turtle on a specific layer (negative = behind camera, 0 = default)",
      },
      {
        label: "set layer",
        code: "turtle.z(1);",
        hint: "Switch turtle drawing to this layer at runtime",
      },
      {
        label: "reset",
        code: "turtle.reset();",
        hint: "Full reset: transparent background, white pen, clear canvas and go home",
      },
    ],
  },
  {
    name: "Move",
    commands: [
      { label: "forward", code: "turtle.forward(50);", hint: "Move forward by 50 pixels" },
      { label: "backward", code: "turtle.backward(50);", hint: "Move backward by 50 pixels" },
      {
        label: "go to x, y",
        code: "turtle.xy(0, 0);",
        hint: "Teleport to canvas coordinate (0, 0)",
      },
      { label: "move to x", code: "turtle.x(0);", hint: "Move to x, keep current y" },
      { label: "move to y", code: "turtle.y(0);", hint: "Move to y, keep current x" },
      { label: "home", code: "turtle.home();", hint: "Return to center and reset heading to 0°" },
      {
        label: "clear",
        code: "turtle.clear();",
        hint: "Fill background, go home, and put pen down",
      },
      {
        label: "clean",
        code: "turtle.clean();",
        hint: "Fill background with color (keeps position)",
      },
      { label: "get x", code: "turtle.get.x()", hint: "Current x position of the turtle" },
      { label: "get y", code: "turtle.get.y()", hint: "Current y position of the turtle" },
      {
        label: "out of bounds?",
        code: "turtle.get.oob()",
        hint: "True if turtle is outside the canvas bounds",
      },
      {
        label: "canvas width",
        code: "turtle.getCanvas().width",
        hint: "Width of this turtle's canvas layer in pixels",
      },
      {
        label: "canvas height",
        code: "turtle.getCanvas().height",
        hint: "Height of this turtle's canvas layer in pixels",
      },
    ],
  },
  {
    name: "Turn",
    commands: [
      { label: "right 90°", code: "turtle.right(90);", hint: "Turn right by 90 degrees" },
      { label: "left 90°", code: "turtle.left(90);", hint: "Turn left by 90 degrees" },
      {
        label: "heading",
        code: "turtle.heading(0);",
        hint: "Set absolute heading in degrees (0 = up)",
      },
      {
        label: "face x, y",
        code: "turtle.face(0, 0);",
        hint: "Point toward canvas coordinate (0, 0)",
      },
      {
        label: "butt x, y",
        code: "turtle.butt(0, 0);",
        hint: "Point away from canvas coordinate (0, 0)",
      },
      { label: "get heading", code: "turtle.get.heading()", hint: "Current heading in degrees" },
    ],
  },
  {
    name: "Pen",
    commands: [
      { label: "random color", code: "Color.random()", hint: "A random vivid color" },
      { label: "pen up", code: "turtle.pu();", hint: "Lift pen — move without drawing" },
      { label: "pen down", code: "turtle.pd();", hint: "Lower pen — draw lines while moving" },
      {
        label: "color",
        code: "turtle.color('red');",
        hint: "Set pen color (any CSS color string)",
      },
      { label: "thickness", code: "turtle.thickness(2);", hint: "Set pen stroke width in pixels" },
    ],
  },
  {
    name: "Draw",
    commands: [
      { label: "disc", code: "turtle.disc(20);", hint: "Draw a filled circle at current position" },
      {
        label: "circle",
        code: "turtle.circle(20);",
        hint: "Draw a circle outline at current position",
      },
      {
        label: "arc",
        code: "turtle.arc(50, 90);",
        hint: "Sweep an arc: arc(radius, degrees) — positive degrees = left, negative = right",
      },
    ],
  },
  {
    name: "Control",
    commands: [
      {
        label: "repeat",
        code: "turtle.repeat(4, () => {\n  \n});",
        hint: "Run commands N times: repeat(count, fn)",
      },
      {
        label: "forever",
        code: "turtle.forever(() => {\n  \n});",
        hint: "Loop forever — return false from fn to stop",
      },
      { label: "wait", code: "turtle.wait(1);", hint: "Pause the turtle queue for N seconds" },
      {
        label: "stop queue",
        code: "turtle.stop();",
        hint: "Cancel all pending queued commands for this turtle",
      },
      {
        label: "set interval",
        code: "setInterval(() => {\n  \n}, 100);",
        hint: "Run code every N milliseconds",
      },
      {
        label: "set timeout",
        code: "setTimeout(() => {\n  \n}, 1000);",
        hint: "Run code once after N milliseconds",
      },
      { label: "pause", code: "pause();", hint: "Pause program execution" },
      { label: "resume", code: "resume();", hint: "Resume paused program execution" },
      { label: "stop", code: "stop();", hint: "Stop program execution" },
      { label: "random number", code: "randUni(0, 100)", hint: "Random number between lo and hi" },
      {
        label: "random uniform",
        code: "turtle.rand.uni(0, 100)",
        hint: "Random number between lo and hi (on the turtle object)",
      },
      {
        label: "random normal",
        code: "turtle.rand.norm(50, 10)",
        hint: "Random number with normal distribution: rand.norm(mean, stdDev)",
      },
      {
        label: "random chance",
        code: "turtle.rand.chance(0.5)",
        hint: "True with given probability (0–1): rand.chance(0.5) = 50% chance",
      },
    ],
  },
  {
    name: "Vision",
    commands: [
      {
        label: "seek object",
        code: "turtle.seek(vision.nearest('person'));",
        hint: "Move turtle toward nearest detected person (runs detection automatically)",
      },
      {
        label: "goTo object",
        code: "turtle.goTo(vision.nearest('person'));",
        hint: "Snap turtle to nearest detected person",
      },
      {
        label: "nearest object",
        code: "vision.nearest('person')",
        hint: "Highest-confidence detected object of label — {label, cx, cy, confidence} or null",
      },
      {
        label: "all objects",
        code: "vision.objects()",
        hint: "All detected objects — [{label, cx, cy, confidence}]",
      },
      {
        label: "all of label",
        code: "vision.all('person')",
        hint: "All detected objects matching label — [{label, cx, cy, confidence}]",
      },
      {
        label: "any detected?",
        code: "vision.any('person')",
        hint: "True if any object of this label is currently detected",
      },
      {
        label: "count objects",
        code: "vision.count('person')",
        hint: "Number of objects of this label currently detected",
      },
      {
        label: "gesture",
        code: "vision.gesture()",
        hint: "Current hand gesture — 'Thumb_Up', 'Open_Palm', 'Closed_Fist', 'Pointing_Up', 'Victory', 'ILoveYou', or null",
      },
      {
        label: "expression",
        code: "vision.expression()",
        hint: "Current face expression — 'smile', 'surprise', 'frown', 'mouth_open', 'neutral', or null",
      },
      {
        label: "hands",
        code: "vision.hands()",
        hint: "All detected hands — [{gesture, cx, cy, confidence, landmarks}]",
      },
      {
        label: "face",
        code: "vision.face()",
        hint: "Detected face — {expression, cx, cy, landmarks} or null",
      },
    ],
  },
  {
    name: "Layer",
    commands: [
      {
        label: "get layer",
        code: "const layer = turtle.getLayer();",
        hint: "Get the Layer for this turtle's current z; same z → same object",
      },
      { label: "blur", code: "turtle.getLayer().blur(5);", hint: "Gaussian blur the layer (px)" },
      {
        label: "hue shift",
        code: "turtle.getLayer().hue(90);",
        hint: "Shift hue by degrees (0–360)",
      },
      {
        label: "brightness",
        code: "turtle.getLayer().brightness(1.5);",
        hint: "Adjust brightness (1 = normal, 2 = double)",
      },
      {
        label: "saturate",
        code: "turtle.getLayer().saturate(2);",
        hint: "Adjust saturation (1 = normal, 0 = grayscale)",
      },
      {
        label: "invert",
        code: "turtle.getLayer().invert(1);",
        hint: "Invert colors (0–1, 1 = full invert)",
      },
      {
        label: "opacity",
        code: "turtle.getLayer().opacity(0.5);",
        hint: "Layer opacity (0 = invisible, 1 = full)",
      },
      {
        label: "rotate",
        code: "turtle.getLayer().rotate(45);",
        hint: "Rotate entire layer in degrees",
      },
      {
        label: "rotateX",
        code: "turtle.getLayer().rotateX(30);",
        hint: "Tilt layer on X axis (perspective 600px auto-applied)",
      },
      {
        label: "rotateY",
        code: "turtle.getLayer().rotateY(30);",
        hint: "Tilt layer on Y axis (perspective 600px auto-applied)",
      },
      {
        label: "scale",
        code: "turtle.getLayer().scale(1.5);",
        hint: "Scale layer (1 = normal, 2 = double)",
      },
      {
        label: "perspective",
        code: "turtle.getLayer().perspective(300);",
        hint: "Perspective distance for rotateX/Y (px) — smaller = more dramatic",
      },
      {
        label: "clip",
        code: "turtle.getLayer().clip('circle(50%)');",
        hint: "Clip layer to CSS clip-path shape (circle, polygon, ellipse, etc.)",
      },
      {
        label: "raw filter",
        code: "turtle.getLayer().filter('blur(5px) hue-rotate(90deg)');",
        hint: "CSS filter string — overrides named filter methods",
      },
      {
        label: "reset effects",
        code: "turtle.getLayer().reset();",
        hint: "Remove all CSS effects from the layer",
      },
      {
        label: "layer canvas",
        code: "turtle.getLayer().canvas",
        hint: "Raw HTMLCanvasElement for the layer",
      },
    ],
  },
  {
    name: "Events",
    commands: [
      {
        label: "on move",
        code: "turtle.on('move', () => {\n  \n});",
        hint: "Fire when turtle moves (events: 'move', 'rotate', 'pu', 'pd')",
      },
      {
        label: "on edge",
        code: "turtle.onEdge(() => {\n  \n});",
        hint: "Fire once each time turtle crosses the canvas edge",
      },
      {
        label: "on collide",
        code: "turtle.onCollide(other, 20, () => {\n  \n});",
        hint: "Fire when this turtle comes within dist px of another turtle",
      },
      {
        label: "on key",
        code: 'onKey("ArrowUp", (e) => {\n  \n});',
        hint: "Fire when a key is pressed — pass 'any' to match all keys",
      },
      {
        label: "on gesture",
        code: 'vision.onGesture("Thumb_Up", () => {\n  \n});',
        hint: "Fire once when a gesture is first detected — gestures: Thumb_Up, Thumb_Down, Open_Palm, Closed_Fist, Pointing_Up, Victory, ILoveYou",
      },
      {
        label: "on expression",
        code: 'vision.onExpression("smile", () => {\n  \n});',
        hint: "Fire once when a face expression is first detected — expressions: smile, surprise, frown, mouth_open",
      },
    ],
  },
];

export function getTurtleVarNames(cm) {
  const names = new Set();
  const re = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+Turtle\s*\(/g;
  let m;
  while ((m = re.exec(cm.getValue())) !== null) names.add(m[1]);
  return names;
}

export function turtleHint(cm, options) {
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
