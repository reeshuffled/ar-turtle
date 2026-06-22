// Pure function — no DOM, no globals.
// Returns the action stepProgram should take given current turtle states.
export function computeStepAction(turtles) {
  for (const t of turtles) {
    const anti = t.stepOnce();
    if (anti !== false) return { kind: 'stepped', anti };
  }
  const hasForever = turtles.some(t => !t.isIdle && t.queueEmpty);
  return { kind: hasForever ? 'await-forever' : 'idle' };
}
