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

function turtleField() {
  return new Blockly.FieldVariable("turtle", null, ["Turtle"], "Turtle");
}

Blockly.Blocks["turtle_create"] = {
  init() {
    this.appendDummyInput()
      .appendField("create turtle")
      .appendField(turtleField(), "TURTLE");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURTLE_COLOR);
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
  },
};

Blockly.Blocks["turtle_right"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("right")
      .appendField(new FieldAngle(90), "DEGREES");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURN_COLOR);
  },
};

Blockly.Blocks["turtle_left"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("left")
      .appendField(new FieldAngle(90), "DEGREES");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(TURN_COLOR);
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
  },
};

Blockly.Blocks["turtle_color"] = {
  init() {
    this.appendDummyInput()
      .appendField(turtleField(), "TURTLE")
      .appendField("color")
      .appendField(new FieldColour("#ff0000"), "COLOR");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(PEN_COLOR);
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
  },
};

Blockly.Blocks["console_log"] = {
  init() {
    this.appendValueInput("VALUE").appendField("console.log");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(60);
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
  },
};

// ── JavaScript code generators ────────────────────────────────────────────

function turtleName(block, gen) {
  return gen.getVariableName(block.getFieldValue("TURTLE"));
}

javascriptGenerator.forBlock["turtle_create"] = (block, gen) => {
  const name = gen.getVariableName(block.getFieldValue("TURTLE"));
  return `const ${name} = new Turtle();\n`;
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
  const deg = block.getFieldValue("DEGREES") ?? 90;
  return `${turtleName(block, gen)}.right(${deg});\n`;
};

javascriptGenerator.forBlock["turtle_left"] = (block, gen) => {
  const deg = block.getFieldValue("DEGREES") ?? 90;
  return `${turtleName(block, gen)}.left(${deg});\n`;
};

javascriptGenerator.forBlock["turtle_pen_up"] = (block, gen) => `${turtleName(block, gen)}.pu();\n`;
javascriptGenerator.forBlock["turtle_pen_down"] = (block, gen) => `${turtleName(block, gen)}.pd();\n`;
javascriptGenerator.forBlock["turtle_home"] = (block, gen) => `${turtleName(block, gen)}.home();\n`;
javascriptGenerator.forBlock["turtle_clear"] = (block, gen) => `${turtleName(block, gen)}.clear();\n`;
javascriptGenerator.forBlock["turtle_clean"] = (block, gen) => `${turtleName(block, gen)}.clean();\n`;

javascriptGenerator.forBlock["turtle_color"] = (block, gen) => {
  const c = block.getFieldValue("COLOR") || "#000000";
  return `${turtleName(block, gen)}.color('${c}');\n`;
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

javascriptGenerator.forBlock["console_log"] = (block, gen) => {
  const val = gen.valueToCode(block, "VALUE", Order.NONE) || '""';
  return `console.log(${val});\n`;
};

// ── Toolbox definition ────────────────────────────────────────────────────

export const TOOLBOX = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Turtle",
      colour: String(TURTLE_COLOR),
      contents: [
        { kind: "block", type: "turtle_create" },
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
        { kind: "block", type: "turtle_right" },
        { kind: "block", type: "turtle_left" },
      ],
    },
    {
      kind: "category",
      name: "Pen",
      colour: String(PEN_COLOR),
      contents: [
        { kind: "block", type: "turtle_pen_up" },
        { kind: "block", type: "turtle_pen_down" },
        { kind: "block", type: "turtle_color" },
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
