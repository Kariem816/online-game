const Mouse = enumJS([
    "Left",
    "Middle",
    "Right"
]);

class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.mounted = false;
        this.boundingRect = this.canvas.getBoundingClientRect();
        this.startX = 0;
        this.startY = 0;

        // keyboard
        this.keysDown = new Set();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        this._rawKeysPressed = new Set();
        this._rawKeysReleased = new Set();

        // mouse
        this.mouseDown = new Set();
        this.mousePressed = new Set();
        this.mouseReleased = new Set();
        this._rawMousePressed = new Set();
        this._rawMouseReleased = new Set();

        // Mouse Position
        this.mouseX = canvas.width / 2;
        this.mouseY = canvas.height / 2;
        this.deltaX = 0;
        this.deltaY = 0;
        this.frameDeltaX = 0;
        this.frameDeltaY = 0;
        this.startX = 0;
        this.startY = 0;
        this.mouseSensitivity = 1;

        // Wheel
        this.wheelDelta = 0;
        this.frameWheelDelta = 0;
        this.scrollSensitivity = 1;

        this.handlers = {
            keydown: this._keyDownHandler.bind(this),
            keyup: this._keyUpHandler.bind(this),
            mousedown: this._mouseDownHandler.bind(this),
            mouseup: this._mouseUpHandler.bind(this),
            mousemove: this._mouseMoveHandler.bind(this),
            wheel: this._wheelHandler.bind(this),
            blur: this._blurHandler.bind(this),
        }

        window.addEventListener("resize", this._resizeHandler.bind(this));
    }

    _keyDownHandler(e) {
        const code = e.code;
        if (!this.keysDown.has(code)) this._rawKeysPressed.add(code);
        this.keysDown.add(code);
    }

    _keyUpHandler(e) {
        const code = e.code;
        this.keysDown.delete(code);
        this._rawKeysReleased.add(code);
    }

    _mouseDownHandler(e) {
        const b = e.button;
        if (!this.mouseDown.has(b)) this._rawMousePressed.add(b);
        this.mouseDown.add(b);
    }

    _mouseUpHandler(e) {
        const b = e.button;
        this.mouseDown.delete(b);
        this._rawMouseReleased.add(b);
    }

    _mouseMoveHandler(e) {
        this.frameDeltaX += e.movementX * this.mouseSensitivity;
        this.frameDeltaY += e.movementY * this.mouseSensitivity;
    }

    _wheelHandler(e) {
        this.frameWheelDelta += e.deltaY * this.scrollSensitivity;
    }

    _resizeHandler() {
        this.boundingRect = this.canvas.getBoundingClientRect();
    }

    _blurHandler() {
        this.keysDown.clear();
        this.mouseDown.clear();
        this._rawKeysPressed.clear();
        this._rawKeysReleased.clear();
        this._rawMousePressed.clear();
        this._rawMouseReleased.clear();
    }

    update() {
        if (!this.mounted) return;

        // snapshot keyboard
        this.keysPressed = new Set(this._rawKeysPressed);
        this.keysReleased = new Set(this._rawKeysReleased);
        this._rawKeysPressed.clear();
        this._rawKeysReleased.clear();

        // snapshot mouse
        this.mousePressed = new Set(this._rawMousePressed);
        this.mouseReleased = new Set(this._rawMouseReleased);
        this._rawMousePressed.clear();
        this._rawMouseReleased.clear();

        // update mouse position
        const newX = this.mouseX + this.frameDeltaX;
        const newY = this.mouseY + this.frameDeltaY;

        this.mouseX = Math.max(0, Math.min(this.canvas.width, newX));
        this.mouseY = Math.max(0, Math.min(this.canvas.height, newY));
        this.deltaX = this.mouseX - this.startX;
        this.deltaY = this.mouseY - this.startY;
        this.frameDeltaX = 0;
        this.frameDeltaY = 0;

        // update wheel
        this.wheelDelta = this.frameWheelDelta;
        this.frameWheelDelta = 0;
    }

    setStartPosition(x, y) {
        this.startX = x * this.canvas.width / this.boundingRect.width;
        this.startY = y * this.canvas.height / this.boundingRect.height;
    }

    // keyboard
    isKeyDown(code) { return this.keysDown.has(code); }
    isKeyPressed(code) { return this.keysPressed.has(code); }
    isKeyReleased(code) { return this.keysReleased.has(code); }

    // mouse
    isMouseDown(button) { return this.mouseDown.has(button); }
    isMousePressed(button) { return this.mousePressed.has(button); }
    isMouseReleased(button) { return this.mouseReleased.has(button); }
    getMousePosition() { return { x: this.mouseX, y: this.mouseY }; }
    getMouseDelta() { return { x: this.deltaX, y: this.deltaY }; }

    // wheel
    getWheelDelta() { return this.wheelDelta; }

    // pointer lock listeners
    addListeners() {
        if (this.mounted) return;
        for (const [event, handler] of Object.entries(this.handlers)) {
            this.canvas.addEventListener(event, handler);
        }

        this.mouseX = this.startX;
        this.mouseY = this.startY;

        this.mounted = true;
    }

    removeListeners() {
        if (!this.mounted) return;
        for (const [event, handler] of Object.entries(this.handlers)) {
            this.canvas.removeEventListener(event, handler);
        }
        this.mounted = false;
    }
}