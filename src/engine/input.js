// Entrada unificada: teclado/mouse (desktop) e toque (celular).
// main.js lê os campos e chama endFrame() ao fim de cada quadro.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this.move = { x: 0, z: 0 };   // -1..1 (x: direita, z: frente)
    this.run = false;
    this.lookX = 0; this.lookY = 0; // delta acumulado do quadro
    this.attackHeld = false;
    this.jumpPressed = false;      // borda (limpo em endFrame)
    this.placePressed = false;
    this.drinkPressed = false;
    this.enabled = false;

    this.keys = new Set();
    this._joyTouch = null;
    this._lookTouch = null;

    if (this.isTouch) {
      document.body.classList.add('touch');
      this._setupTouch();
    }
    this._setupDesktop();
  }

  enable() { this.enabled = true; }
  disable() {
    this.enabled = false;
    this.keys.clear();
    this.move.x = 0; this.move.z = 0;
    this.attackHeld = false; this.run = false;
    this.jumpPressed = false; this.placePressed = false; this.drinkPressed = false;
    this.lookX = 0; this.lookY = 0;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  requestPointerLock() {
    if (!this.isTouch && document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock?.();
    }
  }

  _setupDesktop() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Space') { e.preventDefault(); if (!this.keys.has('Space')) this.jumpPressed = true; }
      if (e.code === 'KeyF' && !this.keys.has('KeyF')) this.drinkPressed = true;
      this.keys.add(e.code);
      this._updateKeyMove();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this._updateKeyMove();
    });
    window.addEventListener('blur', () => { this.keys.clear(); this._updateKeyMove(); this.attackHeld = false; });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.isTouch) return;
      this.requestPointerLock();
      if (e.button === 0) this.attackHeld = true;
      if (e.button === 2) this.placePressed = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.attackHeld = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== this.canvas) return;
      this.lookX += e.movementX * 0.0024;
      this.lookY += e.movementY * 0.0024;
    });
  }

  _updateKeyMove() {
    if (this.isTouch && this._joyTouch !== null) return;
    const k = this.keys;
    this.move.x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.move.z = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    this.run = k.has('ShiftLeft') || k.has('ShiftRight');
  }

  _setupTouch() {
    const joyZone = document.getElementById('joy-zone');
    const lookZone = document.getElementById('look-zone');
    const joyBase = document.getElementById('joy-base');
    const joyStick = document.getElementById('joy-stick');
    const R = 55; // raio do joystick em px

    let joyOrigin = { x: 0, y: 0 };

    const setStick = (dx, dy) => {
      joyStick.style.left = `${50 + (dx / R) * 45}%`;
      joyStick.style.top = `${50 + (dy / R) * 45}%`;
    };

    joyZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      const t = e.changedTouches[0];
      this._joyTouch = t.identifier;
      joyOrigin = { x: t.clientX, y: t.clientY };
      joyBase.style.display = 'block';
      joyBase.style.left = `${t.clientX}px`;
      joyBase.style.top = `${t.clientY}px`;
      setStick(0, 0);
    }, { passive: false });

    joyZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this._joyTouch) continue;
        let dx = t.clientX - joyOrigin.x, dy = t.clientY - joyOrigin.y;
        const len = Math.hypot(dx, dy);
        if (len > R) { dx = dx / len * R; dy = dy / len * R; }
        setStick(dx, dy);
        this.move.x = dx / R;
        this.move.z = -dy / R;
        this.run = len >= R * 0.92; // empurrar até a borda = correr
      }
    }, { passive: false });

    const joyEnd = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this._joyTouch) continue;
        this._joyTouch = null;
        this.move.x = 0; this.move.z = 0; this.run = false;
        joyBase.style.display = 'none';
      }
    };
    joyZone.addEventListener('touchend', joyEnd, { passive: false });
    joyZone.addEventListener('touchcancel', joyEnd, { passive: false });

    let lookLast = { x: 0, y: 0 };
    lookZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.enabled) return;
      const t = e.changedTouches[0];
      if (this._lookTouch !== null) return;
      this._lookTouch = t.identifier;
      lookLast = { x: t.clientX, y: t.clientY };
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this._lookTouch) continue;
        this.lookX += (t.clientX - lookLast.x) * 0.0056;
        this.lookY += (t.clientY - lookLast.y) * 0.0056;
        lookLast = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });

    const lookEnd = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches)
        if (t.identifier === this._lookTouch) this._lookTouch = null;
    };
    lookZone.addEventListener('touchend', lookEnd, { passive: false });
    lookZone.addEventListener('touchcancel', lookEnd, { passive: false });

    // botões
    const bind = (id, down, up) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!this.enabled) return;
        el.classList.add('held');
        down();
      }, { passive: false });
      const end = (e) => { e.preventDefault(); el.classList.remove('held'); if (up) up(); };
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('touchcancel', end, { passive: false });
    };
    bind('btn-attack', () => { this.attackHeld = true; }, () => { this.attackHeld = false; });
    bind('btn-jump', () => { this.jumpPressed = true; });
    bind('btn-place', () => { this.placePressed = true; });
    bind('btn-drink', () => { this.drinkPressed = true; });
  }

  consumeLook() {
    const r = { x: this.lookX, y: this.lookY };
    this.lookX = 0; this.lookY = 0;
    return r;
  }

  endFrame() {
    this.jumpPressed = false;
    this.placePressed = false;
    this.drinkPressed = false;
  }
}
