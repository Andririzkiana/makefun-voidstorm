// Keyboard and mouse state for the game. The game polls this object once
// per step: held keys and the pointer drive the ship, while a pressed-set
// captures one-shot actions (pause, bomb, confirm) exactly once per press.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 640, y: 560, down: false, active: false, lastMove: -10 };
    this.time = 0;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    canvas.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      this.mouse.active = true;
      this.mouse.lastMove = this.time;
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.mouse.down = true;
      this.mouse.active = true;
      this.pressed.add('MouseDown');
    });
    window.addEventListener('pointerup', () => {
      this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  held(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  anyConfirm() {
    return this.wasPressed('Enter') || this.wasPressed('Space') || this.wasPressed('MouseDown');
  }

  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.held('ArrowLeft') || this.held('KeyA')) x -= 1;
    if (this.held('ArrowRight') || this.held('KeyD')) x += 1;
    if (this.held('ArrowUp') || this.held('KeyW')) y -= 1;
    if (this.held('ArrowDown') || this.held('KeyS')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = Math.SQRT1_2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  firing() {
    return this.held('Space') || this.mouse.down;
  }

  mouseSteering(now) {
    return this.mouse.active && now - this.mouse.lastMove < 4;
  }

  endStep() {
    this.pressed.clear();
  }
}
