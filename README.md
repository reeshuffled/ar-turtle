# ar-turtle

A learner-friendly IDE to draw graphics on top of a camera layer.

This is a web app that displays Turtle programming on top of a live webcam feed for an Augmented Reality experience!

## Features

* Draw on top of and react to things in your camera with a [Turtle API](https://github.com/greim/jtg)
  * Layer compositing with multiple turtles and z-indexing
    * Powerful canvas layer editing API for power users
  * React to hand gestures, facial expressions, or objects detected with a [MediaPipe](https://github.com/google-ai-edge/mediapipe) API
* Learner-friendly IDE (powered by [CodeMirror](https://codemirror.net/5/))
  * Syntax highlighting
  * API hints
* Multiple coding modalities for learners
  * Block Coding with [Blockly](https://github.com/RaspberryPiFoundation/blockly)
  * Drag-to-Text Coding inspired by [Codesters](https://www.codesters.com/?lang=en)
  * With guardrails
    * Infinite loop detection/breaking (with [Esprima](https://kushagra.dev/blog/web-maker-infinite-loop-prevention/))
    * Friendly error messages
* State Control
  * Pause/Resume Program Execution
  * Live State Patching
    * Change Turtle pen properties (color, stroke width, etc) as the program is running! Great for livecoding

## Roadmap

* Tutorials/projects/levels modal or guided walk through for learner self-guided progression
