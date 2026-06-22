export class UndoStack {
  #stack = [];
  #bytes = 0;
  #maxBytes;

  constructor(maxBytes) {
    this.#maxBytes = maxBytes;
  }

  push(anti) {
    this.#stack.push(anti);
    this.#bytes += anti.bytes ?? 0;
    while (this.#bytes > this.#maxBytes && this.#stack.length > 1) {
      this.#bytes -= this.#stack.shift().bytes ?? 0;
    }
  }

  pop() {
    if (this.#stack.length === 0) return null;
    const anti = this.#stack.pop();
    this.#bytes = Math.max(0, this.#bytes - (anti.bytes ?? 0));
    return anti;
  }

  clear() {
    this.#stack = [];
    this.#bytes = 0;
  }

  get length() { return this.#stack.length; }
  get bytes() { return this.#bytes; }
}
