import * as Blockly from "blockly";
import { javascriptGenerator, Order } from "blockly/javascript";
import { FieldColour } from "@blockly/field-colour";
import { FieldAngle } from "@blockly/field-angle";
import { FieldSlider } from "@blockly/field-slider";
import "blockly/blocks";

// ── Block definitions ─────────────────────────────────────────────────────

const MOVE_COLOR = 160;
const TURN_COLOR = 200;
const PEN_COLOR = 43;
const DRAW_COLOR = 260;
const CTRL_COLOR = 120;
const TURTLE_COLOR = 20;
const EVENT_COLOR = 340;

function turtleField() {
  return new Blockly.FieldVariable("turtle", null, ["Turtle"], "Turtle");
}

Blockly.Blocks["turtle_create"] = {
  init() {
    this.appendDummyInput()
      .appendField("create turtle")
      .appendField(turtleField(), "TURTLE")
      .appendField("at layer")
      .appendField(new Blockly.FieldNumber(0, null, null, 1), "ZLAYER");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURTLE_COLOR);
    this.setTooltip("Create a new turtle on the canvas at the given layer (negative = behind camera, 0 = default)");
  },
};

Blockly.Blocks["turtle_set_layer"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("set layer")
      .appendField(new Blockly.FieldNumber(0, null, null, 1), "ZLAYER");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURTLE_COLOR);
    this.setTooltip("Switch turtle drawing to this layer (negative = behind camera, 0 = default)");
  },
};

Blockly.Blocks["turtle_forward"] = {
  init() {
    this.appendValueInput("AMOUNT")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("forward");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Move forward by the given number of pixels");
  },
};

Blockly.Blocks["turtle_backward"] = {
  init() {
    this.appendValueInput("AMOUNT")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("backward");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Move backward by the given number of pixels");
  },
};

Blockly.Blocks["turtle_right"] = {
  init() {
    this.appendValueInput("DEGREES")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("right");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURN_COLOR);
    this.setTooltip("Turn right by the given degrees");
  },
};

Blockly.Blocks["turtle_left"] = {
  init() {
    this.appendValueInput("DEGREES")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("left");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURN_COLOR);
    this.setTooltip("Turn left by the given degrees");
  },
};

Blockly.Blocks["turtle_pen_up"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("pen up");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PEN_COLOR);
    this.setTooltip("Lift the pen — turtle moves without drawing");
  },
};

Blockly.Blocks["turtle_pen_down"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("pen down");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PEN_COLOR);
    this.setTooltip("Lower the pen — turtle draws lines while moving");
  },
};

Blockly.Blocks["turtle_color"] = {
  init() {
    this.appendValueInput("COLOR")
      .setCheck(null)
      .appendField(turtleField(), "TURTLE")
      .appendField("color");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PEN_COLOR);
    this.setTooltip("Set the pen color");
  },
};

Blockly.Blocks["turtle_thickness"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("thickness")
      .appendField(new FieldSlider(1, 1, 50, 1), "WIDTH");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PEN_COLOR);
    this.setTooltip("Set the pen stroke width in pixels");
  },
};

Blockly.Blocks["turtle_disc"] = {
  init() {
    this.appendValueInput("RADIUS")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("disc");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DRAW_COLOR);
    this.setTooltip("Draw a filled circle at the turtle's current position");
  },
};

Blockly.Blocks["turtle_circle"] = {
  init() {
    this.appendValueInput("RADIUS")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("circle");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DRAW_COLOR);
    this.setTooltip("Draw a circle outline at the turtle's current position");
  },
};

Blockly.Blocks["turtle_home"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("home");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Return to center and reset heading to 0°");
  },
};

Blockly.Blocks["turtle_clear"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("clear");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Fill background, go home, and put pen down");
  },
};

Blockly.Blocks["turtle_clean"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("clean");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Fill the background with color (keeps current position)");
  },
};

Blockly.Blocks["colour_picker"] = {
  init() {
    this.appendDummyInput().appendField(new FieldColour("#ff0000"), "COLOUR");
    this.setOutput(true, "String");
    this.setColour(PEN_COLOR);
    this.setTooltip("Pick a color");
  },
};

javascriptGenerator.forBlock["colour_picker"] = (block) => {
  const c = block.getFieldValue("COLOUR") || "#ff0000";
  return [JSON.stringify(c), Order.ATOMIC];
};

Blockly.Blocks["color_random"] = {
  init() {
    this.appendDummyInput().appendField("random color");
    this.setOutput(true, "String");
    this.setColour(PEN_COLOR);
    this.setTooltip("A random color, different each time");
  },
};

Blockly.Blocks["console_log"] = {
  init() {
    this.appendValueInput("VALUE").appendField("console.log");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
    this.setTooltip("Print a value to the console");
  },
};

Blockly.Blocks["timer_set_interval"] = {
  init() {
    this.appendValueInput("DELAY").setCheck("Number").appendField("every");
    this.appendDummyInput().appendField("ms");
    this.appendStatementInput("DO").appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CTRL_COLOR);
    this.setTooltip("Run the contained blocks every N milliseconds");
  },
};

Blockly.Blocks["timer_set_timeout"] = {
  init() {
    this.appendValueInput("DELAY").setCheck("Number").appendField("after");
    this.appendDummyInput().appendField("ms");
    this.appendStatementInput("DO").appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CTRL_COLOR);
    this.setTooltip("Run the contained blocks once after N milliseconds");
  },
};

Blockly.Blocks["turtle_repeat"] = {
  init() {
    this.appendValueInput("COUNT")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("repeat");
    this.appendDummyInput().appendField("times");
    this.appendStatementInput("DO").appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CTRL_COLOR);
    this.setTooltip("Repeat the contained blocks N times (return false to break early)");
  },
};

Blockly.Blocks["turtle_wait"] = {
  init() {
    this.appendValueInput("SECONDS")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("wait");
    this.appendDummyInput().appendField("seconds");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CTRL_COLOR);
    this.setTooltip("Pause the turtle queue for N seconds before the next command");
  },
};

Blockly.Blocks["turtle_forever"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("forever");
    this.appendStatementInput("DO").appendField("do");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(CTRL_COLOR);
    this.setTooltip("Loop forever — return false from inside to stop");
  },
};

Blockly.Blocks["event_on_start"] = {
  init() {
    this.hat = "cap";
    this.appendDummyInput().appendField("when program starts");
    this.setNextStatement(true);
    this.setColour(EVENT_COLOR);
    this.setTooltip("Run attached blocks once when the program starts");
  },
};

Blockly.Blocks["event_on_key"] = {
  init() {
    this.hat = "cap";
    this.appendDummyInput()
      .appendField("when")
      .appendField(
        new Blockly.FieldDropdown([
          ["↑ up", "ArrowUp"],
          ["↓ down", "ArrowDown"],
          ["← left", "ArrowLeft"],
          ["→ right", "ArrowRight"],
          ["space", " "],
          ["W", "w"],
          ["A", "a"],
          ["S", "s"],
          ["D", "d"],
          ["0", "0"],
          ["1", "1"],
          ["2", "2"],
          ["3", "3"],
          ["4", "4"],
          ["5", "5"],
          ["6", "6"],
          ["7", "7"],
          ["8", "8"],
          ["9", "9"],
          ["any key", "__any__"],
        ]),
        "KEY"
      )
      .appendField("pressed");
    this.setNextStatement(true);
    this.setColour(EVENT_COLOR);
    this.setTooltip("Run attached blocks each time the selected key is pressed");
  },
};

Blockly.Blocks["event_on_edge"] = {
  init() {
    this.hat = "cap";
    this.appendDummyInput()
      .appendField("when")
      .appendField(turtleField(), "TURTLE")
      .appendField("hits edge");
    this.setNextStatement(true);
    this.setColour(EVENT_COLOR);
    this.setTooltip("Run attached blocks once each time the turtle crosses the canvas edge");
  },
};

Blockly.Blocks["event_on_gesture"] = {
  init() {
    this.hat = "cap";
    this.appendDummyInput()
      .appendField("when gesture")
      .appendField(
        new Blockly.FieldDropdown([
          ["👍 thumbs up", "Thumb_Up"],
          ["👎 thumbs down", "Thumb_Down"],
          ["✋ open palm", "Open_Palm"],
          ["✊ fist", "Closed_Fist"],
          ["☝️ pointing up", "Pointing_Up"],
          ["✌️ peace sign", "Victory"],
          ["🤟 I love you", "ILoveYou"],
        ]),
        "GESTURE"
      )
      .appendField("detected");
    this.setNextStatement(true);
    this.setColour(EVENT_COLOR);
    this.setTooltip("Run attached blocks when the selected hand gesture is detected");
  },
};

Blockly.Blocks["event_on_expression"] = {
  init() {
    this.hat = "cap";
    this.appendDummyInput()
      .appendField("when expression")
      .appendField(
        new Blockly.FieldDropdown([
          ["😊 smile", "smile"],
          ["😮 surprise", "surprise"],
          ["☹️ frown", "frown"],
          ["😮 mouth open", "mouth_open"],
        ]),
        "EXPRESSION"
      )
      .appendField("detected");
    this.setNextStatement(true);
    this.setColour(EVENT_COLOR);
    this.setTooltip("Run attached blocks when the selected facial expression is detected");
  },
};

Blockly.Blocks["event_on_collide"] = {
  init() {
    this.hat = "cap";
    this.appendDummyInput()
      .appendField("when")
      .appendField(turtleField(), "TURTLE")
      .appendField("collides with")
      .appendField(turtleField(), "OTHER");
    this.appendValueInput("DIST").setCheck("Number").appendField("within");
    this.appendDummyInput().appendField("px");
    this.setNextStatement(true);
    this.setColour(EVENT_COLOR);
    this.setTooltip("Run attached blocks when two turtles come within the given distance of each other");
  },
};

Blockly.Blocks["turtle_xy"] = {
  init() {
    this.appendValueInput("X")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("go to x");
    this.appendValueInput("Y").setCheck("Number").appendField("y");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Teleport to canvas coordinate (x, y)");
  },
};

Blockly.Blocks["turtle_heading"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("heading")
      .appendField(new FieldAngle(0), "DEGREES");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURN_COLOR);
    this.setTooltip("Set absolute heading in degrees");
  },
};

Blockly.Blocks["turtle_face"] = {
  init() {
    this.appendValueInput("X")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("face x");
    this.appendValueInput("Y").setCheck("Number").appendField("y");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURN_COLOR);
    this.setTooltip("Point turtle toward canvas coordinate (x, y)");
  },
};

Blockly.Blocks["turtle_arc"] = {
  init() {
    this.appendValueInput("RADIUS")
      .setCheck("Number")
      .appendField(turtleField(), "TURTLE")
      .appendField("arc radius");
    this.appendValueInput("DEGREES").setCheck("Number").appendField("degrees");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(DRAW_COLOR);
    this.setTooltip("Sweep an arc: positive degrees = left, negative = right");
  },
};

Blockly.Blocks["turtle_seek"] = {
  init() {
    this.appendValueInput("OBJ")
      .appendField(turtleField(), "TURTLE")
      .appendField("seek");
    this.appendValueInput("STEP").setCheck("Number").appendField("step");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Face and move step px toward a vision object; no-op if null");
  },
};

Blockly.Blocks["turtle_goto"] = {
  init() {
    this.appendValueInput("OBJ")
      .appendField(turtleField(), "TURTLE")
      .appendField("go to");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(MOVE_COLOR);
    this.setTooltip("Snap to a vision object center; no-op if null");
  },
};

Blockly.Blocks["turtle_reset"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("reset");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURTLE_COLOR);
    this.setTooltip("Full reset: transparent background, white pen, clear");
  },
};

Blockly.Blocks["turtle_rand_uni"] = {
  init() {
    this.appendValueInput("LO").setCheck("Number").appendField("random");
    this.appendValueInput("HI").setCheck("Number").appendField("to");
    this.setInputsInline(true);
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("Random number between lo and hi");
  },
};

Blockly.Blocks["vision_nearest"] = {
  init() {
    this.appendDummyInput()
      .appendField("nearest")
      .appendField(new Blockly.FieldTextInput("person"), "LABEL");
    this.setOutput(true, null);
    this.setColour(185);
    this.setTooltip("Highest-confidence detected object of this label — {label, cx, cy, confidence} or null");
  },
};

Blockly.Blocks["vision_any"] = {
  init() {
    this.appendDummyInput()
      .appendField("any")
      .appendField(new Blockly.FieldTextInput("person"), "LABEL")
      .appendField("detected");
    this.setOutput(true, "Boolean");
    this.setColour(185);
    this.setTooltip("True if any object of this label is currently detected");
  },
};

Blockly.Blocks["vision_count"] = {
  init() {
    this.appendDummyInput()
      .appendField("count of")
      .appendField(new Blockly.FieldTextInput("person"), "LABEL");
    this.setOutput(true, "Number");
    this.setColour(185);
    this.setTooltip("Number of objects of this label currently detected");
  },
};

Blockly.Blocks["turtle_get_x"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("x");
    this.setOutput(true, "Number");
    this.setColour(MOVE_COLOR);
    this.setTooltip("Current x position of the turtle");
  },
};

Blockly.Blocks["turtle_get_y"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("y");
    this.setOutput(true, "Number");
    this.setColour(MOVE_COLOR);
    this.setTooltip("Current y position of the turtle");
  },
};

// ── JavaScript code generators ────────────────────────────────────────────

function turtleName(block, gen) {
  return gen.getVariableName(block.getFieldValue("TURTLE"));
}

javascriptGenerator.forBlock["turtle_create"] = (block, gen) => {
  const name = gen.getVariableName(block.getFieldValue("TURTLE"));
  const z = Number(block.getFieldValue("ZLAYER") ?? 0);
  return z === 0 ? `const ${name} = new Turtle();\n` : `const ${name} = new Turtle(${z});\n`;
};

javascriptGenerator.forBlock["turtle_set_layer"] = (block, gen) => {
  const z = Number(block.getFieldValue("ZLAYER") ?? 0);
  return `${turtleName(block, gen)}.z(${z});\n`;
};

javascriptGenerator.forBlock["turtle_forward"] = (block, gen) => {
  const amt = gen.valueToCode(block, "AMOUNT", Order.NONE) || "0";
  return `${turtleName(block, gen)}.forward(${amt});\n`;
};

javascriptGenerator.forBlock["turtle_backward"] = (block, gen) => {
  const amt = gen.valueToCode(block, "AMOUNT", Order.NONE) || "0";
  return `${turtleName(block, gen)}.backward(${amt});\n`;
};

javascriptGenerator.forBlock["turtle_right"] = (block, gen) => {
  const deg = gen.valueToCode(block, "DEGREES", Order.NONE) || "90";
  return `${turtleName(block, gen)}.right(${deg});\n`;
};

javascriptGenerator.forBlock["turtle_left"] = (block, gen) => {
  const deg = gen.valueToCode(block, "DEGREES", Order.NONE) || "90";
  return `${turtleName(block, gen)}.left(${deg});\n`;
};

javascriptGenerator.forBlock["turtle_pen_up"] = (block, gen) => `${turtleName(block, gen)}.pu();\n`;
javascriptGenerator.forBlock["turtle_pen_down"] = (block, gen) => `${turtleName(block, gen)}.pd();\n`;
javascriptGenerator.forBlock["turtle_home"] = (block, gen) => `${turtleName(block, gen)}.home();\n`;
javascriptGenerator.forBlock["turtle_clear"] = (block, gen) => `${turtleName(block, gen)}.clear();\n`;
javascriptGenerator.forBlock["turtle_clean"] = (block, gen) => `${turtleName(block, gen)}.clean();\n`;

javascriptGenerator.forBlock["turtle_color"] = (block, gen) => {
  const c = gen.valueToCode(block, "COLOR", Order.NONE) || "'#000000'";
  return `${turtleName(block, gen)}.color(${c});\n`;
};

javascriptGenerator.forBlock["turtle_thickness"] = (block, gen) => {
  const w = block.getFieldValue("WIDTH") ?? 1;
  return `${turtleName(block, gen)}.thickness(${w});\n`;
};

javascriptGenerator.forBlock["turtle_disc"] = (block, gen) => {
  const r = gen.valueToCode(block, "RADIUS", Order.NONE) || "10";
  return `${turtleName(block, gen)}.disc(${r});\n`;
};

javascriptGenerator.forBlock["turtle_circle"] = (block, gen) => {
  const r = gen.valueToCode(block, "RADIUS", Order.NONE) || "10";
  return `${turtleName(block, gen)}.circle(${r});\n`;
};

javascriptGenerator.forBlock["turtle_repeat"] = (block, gen) => {
  const count = gen.valueToCode(block, "COUNT", Order.NONE) || "0";
  const branch = gen.statementToCode(block, "DO");
  return `${turtleName(block, gen)}.repeat(${count}, () => {\n${branch}});\n`;
};

javascriptGenerator.forBlock["turtle_forever"] = (block, gen) => {
  const branch = gen.statementToCode(block, "DO");
  return `${turtleName(block, gen)}.forever(() => {\n${branch}});\n`;
};

javascriptGenerator.forBlock["turtle_wait"] = (block, gen) => {
  const secs = gen.valueToCode(block, "SECONDS", Order.NONE) || "1";
  return `${turtleName(block, gen)}.wait(${secs});\n`;
};

javascriptGenerator.forBlock["timer_set_interval"] = (block, gen) => {
  const delay = gen.valueToCode(block, "DELAY", Order.NONE) || "1000";
  const branch = gen.statementToCode(block, "DO");
  return `setInterval(() => {\n${branch}}, ${delay});\n`;
};

javascriptGenerator.forBlock["timer_set_timeout"] = (block, gen) => {
  const delay = gen.valueToCode(block, "DELAY", Order.NONE) || "1000";
  const branch = gen.statementToCode(block, "DO");
  return `setTimeout(() => {\n${branch}}, ${delay});\n`;
};

javascriptGenerator.forBlock["color_random"] = () =>
  [`Color.random()`, Order.ATOMIC];

javascriptGenerator.forBlock["console_log"] = (block, gen) => {
  const val = gen.valueToCode(block, "VALUE", Order.NONE) || '""';
  return `console.log(${val});\n`;
};

// Event hat blocks use next-connections (blocks chain below). We manually walk
// the chain in each generator, then override scrub_ to prevent double-generation.
const _scrub = javascriptGenerator.scrub_.bind(javascriptGenerator);
javascriptGenerator.scrub_ = function (block, code, opt_thisOnly) {
  if (block.type.startsWith("event_")) return code;
  return _scrub(block, code, opt_thisOnly);
};

const genNextChain = (gen, block) => {
  const next = block.nextConnection?.targetBlock();
  return next ? gen.blockToCode(next) : "";
};

javascriptGenerator.forBlock["event_on_start"] = (block, gen) => {
  return genNextChain(gen, block);
};

javascriptGenerator.forBlock["event_on_key"] = (block, gen) => {
  const key = block.getFieldValue("KEY");
  const inner = genNextChain(gen, block);
  const k = key === "__any__" ? "any" : key;
  return `onKey(${JSON.stringify(k)}, function(__e) {\n${inner}});\n`;
};

javascriptGenerator.forBlock["event_on_gesture"] = (block, gen) => {
  const gesture = block.getFieldValue("GESTURE");
  const inner = genNextChain(gen, block);
  return `vision.onGesture(${JSON.stringify(gesture)}, function() {\n${inner}});\n`;
};

javascriptGenerator.forBlock["event_on_expression"] = (block, gen) => {
  const expr = block.getFieldValue("EXPRESSION");
  const inner = genNextChain(gen, block);
  return `vision.onExpression(${JSON.stringify(expr)}, function() {\n${inner}});\n`;
};

javascriptGenerator.forBlock["event_on_edge"] = (block, gen) => {
  const inner = genNextChain(gen, block);
  return `${turtleName(block, gen)}.onEdge(function() {\n${inner}});\n`;
};

javascriptGenerator.forBlock["event_on_collide"] = (block, gen) => {
  const t1 = gen.getVariableName(block.getFieldValue("TURTLE"));
  const t2 = gen.getVariableName(block.getFieldValue("OTHER"));
  const dist = gen.valueToCode(block, "DIST", Order.NONE) || "20";
  const inner = genNextChain(gen, block);
  return `${t1}.onCollide(${t2}, ${dist}, function() {\n${inner}});\n`;
};

javascriptGenerator.forBlock["turtle_xy"] = (block, gen) => {
  const x = gen.valueToCode(block, "X", Order.NONE) || "0";
  const y = gen.valueToCode(block, "Y", Order.NONE) || "0";
  return `${turtleName(block, gen)}.xy(${x}, ${y});\n`;
};

javascriptGenerator.forBlock["turtle_heading"] = (block, gen) => {
  const deg = block.getFieldValue("DEGREES");
  return `${turtleName(block, gen)}.heading(${deg});\n`;
};

javascriptGenerator.forBlock["turtle_face"] = (block, gen) => {
  const x = gen.valueToCode(block, "X", Order.NONE) || "0";
  const y = gen.valueToCode(block, "Y", Order.NONE) || "0";
  return `${turtleName(block, gen)}.face(${x}, ${y});\n`;
};

javascriptGenerator.forBlock["turtle_arc"] = (block, gen) => {
  const r = gen.valueToCode(block, "RADIUS", Order.NONE) || "0";
  const d = gen.valueToCode(block, "DEGREES", Order.NONE) || "0";
  return `${turtleName(block, gen)}.arc(${r}, ${d});\n`;
};

javascriptGenerator.forBlock["turtle_seek"] = (block, gen) => {
  const obj = gen.valueToCode(block, "OBJ", Order.NONE) || "null";
  const step = gen.valueToCode(block, "STEP", Order.NONE) || "10";
  return `${turtleName(block, gen)}.seek(${obj}, ${step});\n`;
};

javascriptGenerator.forBlock["turtle_goto"] = (block, gen) => {
  const obj = gen.valueToCode(block, "OBJ", Order.NONE) || "null";
  return `${turtleName(block, gen)}.goTo(${obj});\n`;
};

javascriptGenerator.forBlock["turtle_reset"] = (block, gen) => {
  return `${turtleName(block, gen)}.reset();\n`;
};

javascriptGenerator.forBlock["turtle_rand_uni"] = (block, gen) => {
  const lo = gen.valueToCode(block, "LO", Order.NONE) || "0";
  const hi = gen.valueToCode(block, "HI", Order.NONE) || "100";
  return [`randUni(${lo}, ${hi})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock["vision_nearest"] = (block) => {
  const label = block.getFieldValue("LABEL");
  return [`vision.nearest(${JSON.stringify(label)})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock["vision_any"] = (block) => {
  const label = block.getFieldValue("LABEL");
  return [`vision.any(${JSON.stringify(label)})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock["vision_count"] = (block) => {
  const label = block.getFieldValue("LABEL");
  return [`vision.count(${JSON.stringify(label)})`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock["turtle_get_x"] = (block, gen) => {
  return [`${turtleName(block, gen)}.get.x()`, Order.FUNCTION_CALL];
};

javascriptGenerator.forBlock["turtle_get_y"] = (block, gen) => {
  return [`${turtleName(block, gen)}.get.y()`, Order.FUNCTION_CALL];
};

// ── Toolbox definition ────────────────────────────────────────────────────

export const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Events",
      colour: String(EVENT_COLOR),
      contents: [
        { kind: "block", type: "event_on_start" },
        { kind: "block", type: "event_on_key" },
        { kind: "block", type: "event_on_edge" },
        {
          kind: "block",
          type: "event_on_collide",
          inputs: { DIST: { shadow: { type: "math_number", fields: { NUM: 20 } } } },
        },
        { kind: "block", type: "event_on_gesture" },
        { kind: "block", type: "event_on_expression" },
      ],
    },
    {
      kind: "category",
      name: "Turtle",
      colour: String(TURTLE_COLOR),
      contents: [
        { kind: "block", type: "turtle_create" },
        { kind: "block", type: "turtle_set_layer" },
        { kind: "block", type: "turtle_reset" },
      ],
    },
    {
      kind: "category",
      name: "Move",
      colour: String(MOVE_COLOR),
      contents: [
        {
          kind: "block",
          type: "turtle_forward",
          inputs: { AMOUNT: { shadow: { type: "math_number", fields: { NUM: 50 } } } },
        },
        {
          kind: "block",
          type: "turtle_backward",
          inputs: { AMOUNT: { shadow: { type: "math_number", fields: { NUM: 50 } } } },
        },
        { kind: "block", type: "turtle_xy", inputs: { X: { shadow: { type: "math_number", fields: { NUM: 0 } } }, Y: { shadow: { type: "math_number", fields: { NUM: 0 } } } } },
        { kind: "block", type: "turtle_get_x" },
        { kind: "block", type: "turtle_get_y" },
        { kind: "block", type: "turtle_home" },
        { kind: "block", type: "turtle_clear" },
        { kind: "block", type: "turtle_clean" },
      ],
    },
    {
      kind: "category",
      name: "Turn",
      colour: String(TURN_COLOR),
      contents: [
        { kind: "block", type: "turtle_right", inputs: { DEGREES: { shadow: { type: "math_number", fields: { NUM: 90 } } } } },
        { kind: "block", type: "turtle_left", inputs: { DEGREES: { shadow: { type: "math_number", fields: { NUM: 90 } } } } },
        { kind: "block", type: "turtle_heading" },
        { kind: "block", type: "turtle_face", inputs: { X: { shadow: { type: "math_number", fields: { NUM: 0 } } }, Y: { shadow: { type: "math_number", fields: { NUM: 0 } } } } },
      ],
    },
    {
      kind: "category",
      name: "Pen",
      colour: String(PEN_COLOR),
      contents: [
        { kind: "block", type: "turtle_pen_up" },
        { kind: "block", type: "turtle_pen_down" },
        {
          kind: "block",
          type: "turtle_color",
          inputs: { COLOR: { shadow: { type: "colour_picker", fields: { COLOUR: "#ff0000" } } } },
        },
        { kind: "block", type: "color_random" },
        { kind: "block", type: "turtle_thickness" },
      ],
    },
    {
      kind: "category",
      name: "Draw",
      colour: String(DRAW_COLOR),
      contents: [
        {
          kind: "block",
          type: "turtle_disc",
          inputs: { RADIUS: { shadow: { type: "math_number", fields: { NUM: 20 } } } },
        },
        {
          kind: "block",
          type: "turtle_circle",
          inputs: { RADIUS: { shadow: { type: "math_number", fields: { NUM: 20 } } } },
        },
        { kind: "block", type: "turtle_arc", inputs: { RADIUS: { shadow: { type: "math_number", fields: { NUM: 50 } } }, DEGREES: { shadow: { type: "math_number", fields: { NUM: 90 } } } } },
      ],
    },
    {
      kind: "category",
      name: "Control",
      colour: String(CTRL_COLOR),
      contents: [
        {
          kind: "block",
          type: "turtle_repeat",
          inputs: { COUNT: { shadow: { type: "math_number", fields: { NUM: 4 } } } },
        },
        { kind: "block", type: "turtle_forever" },
        {
          kind: "block",
          type: "turtle_wait",
          inputs: { SECONDS: { shadow: { type: "math_number", fields: { NUM: 1 } } } },
        },
        {
          kind: "block",
          type: "timer_set_interval",
          inputs: { DELAY: { shadow: { type: "math_number", fields: { NUM: 100 } } } },
        },
        {
          kind: "block",
          type: "timer_set_timeout",
          inputs: { DELAY: { shadow: { type: "math_number", fields: { NUM: 1000 } } } },
        },
        {
          kind: "block",
          type: "console_log",
          inputs: { VALUE: { shadow: { type: "text", fields: { TEXT: "hello" } } } },
        },
      ],
    },
    {
      kind: "category",
      name: "Vision",
      colour: "185",
      contents: [
        { kind: "block", type: "vision_nearest", fields: { LABEL: "person" } },
        { kind: "block", type: "vision_any", fields: { LABEL: "person" } },
        { kind: "block", type: "vision_count", fields: { LABEL: "person" } },
        {
          kind: "block",
          type: "turtle_seek",
          inputs: {
            OBJ: { shadow: { type: "vision_nearest", fields: { LABEL: "person" } } },
            STEP: { shadow: { type: "math_number", fields: { NUM: 10 } } },
          },
        },
        {
          kind: "block",
          type: "turtle_goto",
          inputs: { OBJ: { shadow: { type: "vision_nearest", fields: { LABEL: "person" } } } },
        },
      ],
    },
    {
      kind: "category",
      name: "Lists",
      colour: "260",
      contents: [
        { kind: "block", type: "lists_create_with" },
        {
          kind: "block",
          type: "lists_getIndex",
          fields: { MODE: "GET", WHERE: "FROM_START" },
        },
        {
          kind: "block",
          type: "lists_getIndex",
          fields: { MODE: "GET", WHERE: "RANDOM" },
        },
        { kind: "block", type: "lists_setIndex" },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_isEmpty" },
        { kind: "block", type: "lists_indexOf" },
        { kind: "block", type: "lists_repeat" },
        { kind: "block", type: "lists_reverse" },
        { kind: "block", type: "lists_sort" },
      ],
    },
    {
      kind: "category",
      name: "Logic",
      colour: "210",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "controls_ifelse" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_ternary" },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      colour: "120",
      contents: [
        { kind: "block", type: "controls_whileUntil" },
        {
          kind: "block",
          type: "controls_for",
          fields: { VAR: "i" },
          inputs: {
            FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } },
            TO: { shadow: { type: "math_number", fields: { NUM: 10 } } },
            BY: { shadow: { type: "math_number", fields: { NUM: 1 } } },
          },
        },
        { kind: "block", type: "controls_forEach" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: "230",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_trig" },
        { kind: "block", type: "math_constant" },
        { kind: "block", type: "math_round" },
        { kind: "block", type: "math_modulo" },
        { kind: "block", type: "math_constrain" },
        { kind: "block", type: "math_random_int" },
        { kind: "block", type: "math_random_float" },
        { kind: "block", type: "turtle_rand_uni", inputs: { LO: { shadow: { type: "math_number", fields: { NUM: 0 } } }, HI: { shadow: { type: "math_number", fields: { NUM: 100 } } } } },
      ],
    },
    {
      kind: "category",
      name: "Text",
      colour: "160",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "text_isEmpty" },
        { kind: "block", type: "text_indexOf" },
        { kind: "block", type: "text_charAt" },
        { kind: "block", type: "text_getSubstring" },
        { kind: "block", type: "text_changeCase" },
        { kind: "block", type: "text_trim" },
      ],
    },
    { kind: "sep" },
    {
      kind: "category",
      name: "Variables",
      colour: "330",
      custom: "VARIABLE",
    },
    {
      kind: "category",
      name: "Functions",
      colour: "290",
      custom: "PROCEDURE",
    },
  ],
};

export { javascriptGenerator };
