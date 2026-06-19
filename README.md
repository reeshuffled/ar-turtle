# ar-turtle

A learner-friendly IDE to draw graphics on top of a camera layer.

This is a web app that displays Turtle programming on top of a live webcam feed for an Augmented Reality experience!

## Features

* Draw on top of and react to things in your camera with a [Turtle API](https://github.com/greim/jtg) and [MediaPipe](https://github.com/google-ai-edge/mediapipe)
* Learner-friendly IDE (powered by [CodeMirror](https://codemirror.net/5/))
  * Syntax highlighting
  * API hints
* Block Coding Modality (with [Blockly](https://github.com/RaspberryPiFoundation/blockly))
* Drag-to-Text Coding Modality (inspired by [Codesters](https://www.codesters.com/?lang=en))
* Live State Patching
  * Change Turtle pen properties (color, stroke width, etc) as the program is running! Great for livecoding
* Guardrails for New Learners
  * Infinite loop detection/breaking (with [Esprima](https://kushagra.dev/blog/web-maker-infinite-loop-prevention/))
  * Friendly error messages

## Roadmap

* Tutorials/projects/levels modal or guided walk through for learner self-guided progression
