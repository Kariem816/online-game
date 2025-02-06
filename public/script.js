const root = document.getElementById("root");

// CONSTANTS
const playerSpeed = 10;
const gameDuration = 60 * 1000; // 1 minute
// Game States
const GAME_PHASES = enumJS({}, [
    "WaitingForPlayers",
    "Playing",
    "GameOver",
])

// Teams
const TEAM_ID = enumJS({}, [
    "TeamA",
    "TeamB",
])

// Tile Types
const Tiles = enumJS({}, [
    "EmptyTile",
    "TeamATile",
    "TeamBTile",
    "WallTile",
]);

// Screens
const Screens = enumJS({}, [
    "Home",
    "Game",
])

// use for debugging
let one = false;

function appendMessage(from, message) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return false;

    const chatMessage = document.createElement("div");
    chatMessage.classList.add("chat-message");
    chatBox.appendChild(chatMessage);

    const sender = document.createElement("span");
    sender.textContent = from;
    sender.classList.add("chat-sender");
    chatMessage.appendChild(sender);

    const msg = document.createElement("span");
    msg.textContent = message;
    msg.classList.add("chat-text");
    chatMessage.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    return true;
}

function typeToString(type) {
    switch (type) {
        case "SYS_MSG_INFO": return "info";
        case "SYS_MSG_ERROR": return "error";
        case "SYS_MSG_SUCCESS": return "success";
        default: return "unknown";
    }
}

function appendSystemMessage(type, message) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return false;

    const chatMessage = document.createElement("div");
    const t = typeToString(type);
    chatMessage.classList.add("chat-message", t);
    chatBox.appendChild(chatMessage);

    const msg = document.createElement("span");
    msg.textContent = message;
    msg.classList.add("chat-text");
    chatMessage.appendChild(msg);

    chatBox.scrollTop = chatBox.scrollHeight;

    return true;
}

function joinRoom(ws, roomInput) {
    const room = roomInput.value;
    const buf = encodeMsg({
        type: "MSG_JOIN",
        data: { room },
    })
    if (buf.error) {
        alert(buf.error);
        return;
    }
    ws.send(buf);
}

function hostRoom(ws) {
    ws.send(
        encodeMsg({
            type: "MSG_HOST",
        })
    );
}

function leaveRoom(ws) {
    ws.send(
        encodeMsg({
            type: "MSG_LEAVE",
        })
    );
}

function chat(ws, chatInput) {
    const message = chatInput.value;
    if (!message) return;
    const buf = encodeMsg({
        type: "MSG_CHAT",
        data: { message },
    });

    if (buf.error) {
        appendSystemMessage("SYS_MSG_ERROR", buf.error);
        return;
    }

    ws.send(buf);
    chatInput.value = "";
}

class GameMap {
    constructor() {
        this.tiles = [];
        this.width = 0;
        this.height = 0;
    }

    static fromMapMessage(msg) {
        const map = new GameMap();
        map.width = msg.width;
        map.height = msg.height;
        map.tiles = msg.tiles;
        return map;
    }

    setTiles(tiles) {
        for (const { x, y, state } of tiles) {
            this.tiles[y * this.width + x] = state;
        }
    }

    getTileByIndex(i) {
        return this.tiles[i];
    }

    getAround(x, y) {
        const tile = this.tiles[y * this.width + x];
        const bottom = this.tiles[(y + 1) * this.width + x];
        const right = this.tiles[y * this.width + x + 1];
        const bottomRight = this.tiles[(y + 1) * this.width + x + 1];
        return { tile, bottom, right, bottomRight };
    }
}

class Game {
    isServerUpdated = false;
    constructor(ws, renderer, myData) {
        this.ws = ws;
        this.renderer = renderer;
        this.ctx = renderer.getContext("2d"); // shouldn't fail ?!

        this.mouse = { x: renderer.width / 2, y: renderer.height / 2 };

        this.state = {};
        this.map = new GameMap();
        this.myData = myData;

        // fuck js `this`
        this.mmcb = this.onMouseMove.bind(this);
        this.lpcb = this.onClickLockPointer.bind(this);
        this.cscb = this.onClickShoot.bind(this);
        this.setupControls();
    }

    setupControls() {
        this.renderer.addEventListener("keydown", (e) => {
            if (e.repeat) return;
            switch (e.code) {
                case "KeyW":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "up",
                                    start: true,
                                },
                            })
                        );
                    }
                    break;
                case "KeyS":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "down",
                                    start: true,
                                },
                            })
                        );
                    }
                    break;
                case "KeyA":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "left",
                                    start: true,
                                },
                            })
                        );
                    }
                    break;
                case "KeyD":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "right",
                                    start: true,
                                },
                            })
                        );
                    }
                    break;
                case "KeyQ":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_START",
                            })
                        );
                    }
                    break;
                case "KeyT":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_TEAM",
                            })
                        );
                    }
                    break;
                case "KeyR":
                    {
                        one = true;
                    }
                    break;
            }
        });

        this.renderer.addEventListener("keyup", (e) => {
            if (e.repeat) return;
            switch (e.code) {
                case "KeyW":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "up",
                                    start: false,
                                },
                            })
                        );
                    }
                    break;
                case "KeyS":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "down",
                                    start: false,
                                },
                            })
                        );
                    }
                    break;
                case "KeyA":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "left",
                                    start: false,
                                },
                            })
                        );
                    }
                    break;
                case "KeyD":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_MOVE",
                                data: {
                                    direction: "right",
                                    start: false,
                                },
                            })
                        );
                    }
                    break;
            }
        });

        const canvas = this.renderer;
        canvas.addEventListener("click", this.lpcb);
        document.addEventListener("pointerlockchange", this.onLockChangeAlert.bind(this), false);
    }

    async onClickLockPointer() {
        await this.renderer.requestPointerLock();
    }

    onClickShoot() {
        this.ws.send(
            encodeMsg({
                type: "MSG_SHOOT",
            })
        );
    }

    onMouseMove(e) {
        this.mouse.x = clamp(this.mouse.x + e.movementX, 0, this.renderer.width);
        this.mouse.y = clamp(this.mouse.y + e.movementY, 0, this.renderer.height);

        if (this.state.started) {
            const { x, y } = this.canvasToGameCoords(this.mouse);

            this.ws.send(
                encodeMsg({
                    type: "MSG_MOUSE",
                    data: { x, y },
                })
            );
        }
    }

    onLockChangeAlert() {
        if (document.pointerLockElement === this.renderer) {
            this.renderer.addEventListener("mousemove", this.mmcb, false);
            this.renderer.removeEventListener("click", this.lpcb);
            this.renderer.addEventListener("click", this.cscb);
            if (this.state.started) {
                const myPlayer = this.getMyPlayer();
                this.mouse = this.gameCoordsToCanvas({ x: myPlayer.x, y: myPlayer.y });
            } else {
                this.mouse = { x: this.renderer.width / 2, y: this.renderer.height / 2 };
            }
        } else {
            this.renderer.removeEventListener("mousemove", this.mmcb, false);
            this.renderer.addEventListener("click", this.lpcb);
            this.renderer.removeEventListener("click", this.cscb);
        }
    }

    onStateUpdate(state) {
        this.state = state;
        this.isServerUpdated = true;
    }

    onMapUpdate(map) {
        this.map = GameMap.fromMapMessage(map);
    }

    onShot(cells) {
        this.map.setTiles(cells);
    }

    canvasToGameCoords({ x, y }) {
        const { width, height } = this.renderer;
        const wOffset = width * 0.1;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;

        const gx = (Math.max(wOffset, x) - wOffset) * this.map.width / wRest;
        const gy = (Math.max(hOffset, y) - hOffset) * this.map.height / hRest;

        return { x: gx, y: gy };
    }

    gameCoordsToCanvas({ x, y }) {
        const { width, height } = this.renderer;
        const wOffset = width * 0.1;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;

        const gx = (x * wRest / this.map.width) + wOffset;
        const gy = (y * hRest / this.map.height) + hOffset;

        return { x: gx, y: gy };
    }

    getMyPlayer() {
        return this.state.players.find((p) => p.id === this.id);
    }

    update(dt) {
        if (this.state.started && !this.isServerUpdated) {
            if (one) {
                console.log(gameState);
                one = false;
            }
            for (const player of this.state.players) {
                let newX = player.x + player.vx * dt * playerSpeed;
                let newY = player.y + player.vy * dt * playerSpeed;

                const { tile, bottom, right, bottomRight } = this.map.getAround(Math.floor(newX), Math.floor(newY));
                const cornerX = newX - Math.floor(newX) > 0;
                const cornerY = newY - Math.floor(newY) > 0;

                if (player.vx > 0) {
                    if (right === Tiles.WallTile || (cornerY && bottomRight === Tiles.WallTile)) {
                        newX = Math.floor(newX);
                    }
                }

                if (player.vx < 0) {
                    if (tile === Tiles.WallTile || (cornerY && bottom === Tiles.WallTile)) {
                        newX = Math.ceil(newX);
                    }
                }

                if (player.vy > 0) {
                    if (bottom === Tiles.WallTile || (cornerX && bottomRight === Tiles.WallTile)) {
                        newY = Math.floor(newY);
                    }
                }

                if (player.vy < 0) {
                    if (tile === Tiles.WallTile || (cornerX && right === Tiles.WallTile)) {
                        newY = Math.ceil(newY);
                    }
                }

                player.x = newX;
                player.y = newY;
            }
        } else {
            this.isServerUpdated = false;
        }
    }

    render() {
        const { width, height } = this.renderer;
        const wOffset = width * 0.1;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;
        const teamAColor = "#" + this.state.state.teamA.toString(16).padStart(6, "0");
        const teamBColor = "#" + this.state.state.teamB.toString(16).padStart(6, "0");

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Bars
        this.ctx.fillStyle = "#353535";
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(`Room: ${this.state.room}`, wOffset / 2, hOffset / 2, wOffset - 16);

        // Top bar
        if (this.state.started) {
            const started = new Date(this.state.startedAt);
            const now = new Date();
            const left = gameDuration - (now - started);
            this.ctx.fillStyle = "#f0f0f0";
            if (left <= 0) {
                this.ctx.fillText("Time is up", wOffset + wRest / 2, hOffset / 2);
            } else {
                const minutes = Math.floor(left / 1000 / 60).toString().padStart(2, "0");
                const seconds = (Math.floor(left / 1000) % 60).toString().padStart(2, "0");
                this.ctx.fillText(`${minutes}:${seconds}`, wOffset + wRest / 2, hOffset / 2);
            }
        } else {
            this.ctx.fillStyle = "#f0f0f0";
            this.ctx.fillText("01:00", width / 2, hOffset / 2);
        }

        // Sidebar
        const sidebarCenter = hOffset + hRest / 2;
        // score
        const score = this.state.state.phase === GAME_PHASES.WaitingForPlayers ? "-" : `${this.state.state.scoreA} - ${this.state.state.scoreB}`;
        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.fillText(score, wOffset / 2, sidebarCenter, wOffset - 20);

        // Teams
        const teamA = this.state.players.filter((p) => p.team === TEAM_ID.TeamA);
        const teamB = this.state.players.filter((p) => p.team === TEAM_ID.TeamB);
        const squareSize = wOffset - 20;

        // team A
        this.ctx.fillStyle = teamAColor;
        this.ctx.fillRect(10, sidebarCenter - 30 - squareSize, squareSize, squareSize);
        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.fillText(`Team A (${teamA.length})`, wOffset / 2, sidebarCenter - 55 - squareSize, wOffset - 20);

        // team B
        this.ctx.fillStyle = teamBColor;
        this.ctx.fillRect(10, sidebarCenter + 30, squareSize, squareSize);
        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.fillText(`Team B (${teamB.length})`, wOffset / 2, sidebarCenter + 55 + squareSize, wOffset - 20);

        // Map
        this.ctx.fillStyle = "#FFD35A";
        this.ctx.fillRect(wOffset, hOffset, wRest, hRest);

        // Render map
        if (this.state.state.phase === GAME_PHASES.Playing) {
            const { width: mapWidth, height: mapHeight } = this.map;
            const cellWidth = Math.floor(wRest / mapWidth);
            const mapWidthOffset = wOffset / cellWidth;
            const cellHeight = Math.floor(hRest / mapHeight);
            const mapHeightOffset = hOffset / cellHeight;

            for (let i = 0; i < mapWidth * mapHeight; i++) {
                const x = (i % mapWidth) + mapWidthOffset;
                const y = Math.floor(i / mapWidth) + mapHeightOffset;

                switch (this.map.getTileByIndex(i)) {
                    case Tiles.EmptyTile: {
                        // Empty
                    } break;
                    case Tiles.TeamATile: {
                        this.ctx.fillStyle = teamAColor;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                    case Tiles.TeamBTile: {
                        this.ctx.fillStyle = teamBColor;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                    case Tiles.WallTile: {
                        this.ctx.fillStyle = "#FFA823";
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                }
            }

            // Render players
            for (const player of this.state.players) {
                const x = player.x + mapWidthOffset;
                const y = player.y + mapHeightOffset;
                const color = player.team === 0 ? teamAColor : teamBColor;

                if (player.user.id === this.myData.id) {
                    this.ctx.fillStyle = this.myData.id === this.state.host ? "#fcbe03" : "#ffffff";
                    this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect((x + 0.1) * cellWidth, (y + 0.1) * cellHeight, 0.8 * cellWidth, 0.8 * cellHeight);
                } else if (player.user.id === this.state.host) {
                    this.ctx.fillStyle = "#fcbe03";
                    this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect((x + 0.1) * cellWidth, (y + 0.1) * cellHeight, 0.8 * cellWidth, 0.8 * cellHeight);
                } else {
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                }

                // render player weapon
                DrawWeapon[player.weapon](
                    this.ctx,
                    color,
                    cellWidth,
                    cellHeight,
                    { x: x + 0.5, y: y + 0.5 },
                    player.theta,
                );
            }
        } else {
            this.ctx.fillStyle = "#353535";
            this.ctx.font = "60px Arial";
            switch (this.state.state.phase) {
                case GAME_PHASES.WaitingForPlayers: {
                    this.ctx.fillText("Waiting for players", width / 2, hOffset + hRest / 2);
                } break;
                case GAME_PHASES.GameOver: {
                    const winner = this.state.state.scoreA > this.state.state.scoreB ? "Team A Wins"
                        : this.state.state.scoreA === this.state.state.scoreB ? "It's a Tie" : "Team B Wins";
                    this.ctx.fillText(`Game Over! ${winner}`, width / 2, hOffset + hRest / 2);
                } break;
            }
        }

        this.crosshair();
    }

    crosshair() {
        const radius = 10;

        this.ctx.fillStyle = "#353535";
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(this.mouse.x - radius, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + radius, this.mouse.y);
        this.ctx.moveTo(this.mouse.x, this.mouse.y - radius);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + radius);
        this.ctx.stroke();

        this.ctx.strokeStyle = "#f0f0f0";
        this.ctx.beginPath();
        this.ctx.arc(this.mouse.x, this.mouse.y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    getUsername(id) {
        for (const player of this.state.players) {
            if (player.user.id === id) {
                return player.user.username;
            }
        }
        return "Unknown";
    }
}

class React {
    active = Screens.Home;

    constructor(ws) {
        this.ws = ws;
        this.username = "Unknown";

        this.HomeScreen();
    }

    #rerender() {
        if (this.active === Screens.Home) {
            this.HomeScreen();
        } else if (this.active === Screens.Game) {
            this.GameScreen();
        }
    }

    updateWs(ws) {
        this.ws = ws;
        this.#rerender();
    }

    updateUsername(username) {
        this.username = username;
        this.#rerender();
    }

    HomeScreen() {
        this.active = Screens.Home;

        const center = document.createElement("div");
        center.classList.add("center", "full-height");

        const container = document.createElement("div");
        center.appendChild(container);

        const h1 = document.createElement("h1");
        h1.textContent = "Online Game";
        container.appendChild(h1);

        const roomBox = document.createElement("div");
        roomBox.className = "row";
        container.appendChild(roomBox);

        const span = document.createElement("span");
        span.textContent = "Room ID:";
        roomBox.appendChild(span);

        const roomInput = document.createElement("input");
        roomInput.type = "text";
        roomBox.appendChild(roomInput);

        const joinBtn = document.createElement("button");
        joinBtn.classList.add("btn");
        joinBtn.textContent = "Join Room";
        roomBox.appendChild(joinBtn);

        const hostBtn = document.createElement("button");
        hostBtn.classList.add("btn", "secondary");
        hostBtn.textContent = "Host Room";
        roomBox.appendChild(hostBtn);

        root.replaceChildren(center);

        roomInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                joinRoom(this.ws, roomInput);
            }
        })

        joinBtn.addEventListener("click", () => {
            joinRoom(this.ws, roomInput);
        });

        hostBtn.addEventListener("click", () => {
            hostRoom(this.ws);
        });
    }

    GameScreen() {
        this.active = Screens.Game;

        const container = document.createElement("div");
        container.classList.add("game-container", "full-height");

        const canvasContainer = document.createElement("div");
        canvasContainer.classList.add("canvas-container", "center");
        container.appendChild(canvasContainer);

        const canvas = document.createElement("canvas");
        canvas.id = "canvas";
        canvas.width = 1600;
        canvas.height = 900;
        canvas.tabIndex = 1;
        canvasContainer.appendChild(canvas);

        const chatDiv = document.createElement("div");
        chatDiv.classList.add("chat");
        container.appendChild(chatDiv);

        const titleRow = document.createElement("div");
        titleRow.classList.add("row", "between");
        chatDiv.appendChild(titleRow);

        const chatTitle = document.createElement("h2");
        chatTitle.classList.add("chat-title");
        chatTitle.textContent = "Chat";
        titleRow.appendChild(chatTitle);

        const leaveBtn = document.createElement("button");
        leaveBtn.classList.add("btn", "danger");
        leaveBtn.textContent = "Leave Room";
        titleRow.appendChild(leaveBtn);

        const chatBoxContainer = document.createElement("div");
        chatBoxContainer.classList.add("chat-box-container");
        chatDiv.appendChild(chatBoxContainer);

        const chatBox = document.createElement("div");
        chatBox.id = "chatBox";
        chatBox.classList.add("chat-box");
        chatBoxContainer.appendChild(chatBox);

        const chatSend = document.createElement("div");
        chatSend.classList.add("chat-send");
        chatDiv.appendChild(chatSend);

        const chatInput = document.createElement("input");
        chatInput.type = "text";
        chatSend.appendChild(chatInput);

        const chatBtn = document.createElement("button");
        chatBtn.type = "button";
        chatBtn.classList.add("btn");
        chatBtn.textContent = "Send";
        chatSend.appendChild(chatBtn);

        root.replaceChildren(container);

        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                chat(this.ws, chatInput);
            }
        });

        chatBtn.addEventListener("click", () => {
            chat(this.ws, chatInput);
        });

        leaveBtn.addEventListener("click", () => {
            leaveRoom(this.ws);
        });

        appendSystemMessage("SYS_MSG_INFO", "Welcome to the game");
        appendSystemMessage("SYS_MSG_SUCCESS", "Your username is " + this.username);
        appendSystemMessage("SYS_MSG_INFO", "Use WASD to move");
        appendSystemMessage("SYS_MSG_INFO", "Click to shoot");
        appendSystemMessage("SYS_MSG_INFO", "Use T to change team");
        appendSystemMessage("SYS_MSG_INFO", "Use Q to start the game");
        appendSystemMessage("SYS_MSG_SUCCESS", "Have fun!");

        // TODO: there should be a better way to do this
        return canvas;
    }
}

class Application {
    /** @type {number?} */
    myId;
    /** @type {string?} */
    myUsername;

    /** @type {Game?} */
    game;

    lastTimestamp = 0;
    rendering = false;

    constructor() {
        this.ws = new WebSocket("/ws");
        this.ws.binaryType = "arraybuffer";
        this.react = new React(this.ws);

        this.setupWSListeners();
    }

    setupWSListeners() {
        const ws = this.ws;
        const that = this;

        ws.addEventListener("open", () => {
            console.log("Connected");
        });
        ws.addEventListener("message", (event) => {
            const msg = decodeMsg(event.data);
            switch (msg.type) {
                case "MSG_CNCT":
                    {
                        this.myId = msg.data.id;
                        this.myUsername = msg.data.username;
                        this.react.updateUsername(this.myUsername);
                    }
                    break;
                case "MSG_HOSTED":
                case "MSG_JOINED":
                    {
                        const canvas = this.react.GameScreen();
                        this.game = new Game(ws, canvas, {
                            id: this.myId,
                            username: this.myUsername,
                        });
                    }
                    break;
                case "MSG_STATE":
                    {
                        if (this.react.active !== Screens.Game) {
                            console.error("should be unreachable");
                        }
                        if (!this.game) {
                            console.error("should be unreachable");
                            return;
                        }

                        this.game.onStateUpdate(msg.data);
                        if (!this.rendering) {
                            this.rendering = true;
                            requestAnimationFrame((timestamp) => {
                                this.lastTimestamp = timestamp;
                                this.tick(timestamp);
                            });
                        }
                    }
                    break;
                case "MSG_MAP":
                    {
                        this.game?.onMapUpdate(msg.data);
                    }
                    break;
                case "MSG_LEFT":
                    {
                        this.react.HomeScreen();
                        this.game = null;
                        this.activeScreen = 0;
                    }
                    break;
                case "MSG_CHATTED":
                    {
                        appendMessage(that.game.getUsername(msg.data.from), msg.data.message);
                    }
                    break;
                case "MSG_ERROR":
                    {
                        if (!appendSystemMessage("SYS_MSG_ERROR", msg.data.message)) {
                            // TODO: find a better way to display error messages
                            alert(msg.data.message);
                        }
                    }
                    break;
                case "MSG_SYSTEM":
                    {
                        if (!appendSystemMessage(msg.data.type, msg.data.message)) {
                            console.log(msg.data.type, msg.data.msg);
                        }
                    }
                    break;
                case "MSG_SHOT":
                    {
                        this.game?.onShot(msg.data.cells);
                    }
                    break;
                default: {
                    console.error("Unknown message type:", msg.type);
                }
            }
        });
        ws.addEventListener("close", () => {
            console.log("Disconnected");
            this.react.HomeScreen();
            this.activeScreen = 0;
            this.game = null;
            this.myId = null;
            this.myUsername = null;
            this.reconnect();
        });
    }

    async reconnect() {
        console.log("Reconnecting...");

        for (let i = 0; i < 10; i++) {
            await sleep(1000 * i);
            const ws = await this.actualReconnect();
            if (ws) {
                console.log("Reconnected");
                this.ws = ws;
                this.setupWSListeners();
                this.react.updateWs(ws);
                return;
            }
        }
        console.log("Failed to reconnect");
    }

    async actualReconnect() {
        const ws = new WebSocket("/ws");
        ws.binaryType = "arraybuffer";
        try {
            await new Promise((res, rej) => {
                function onError() {
                    rej();
                }
                function onOpen() {
                    ws.removeEventListener("error", onError);
                    ws.removeEventListener("open", onOpen); // this maybe a bad idea
                    res();
                }


                ws.addEventListener("error", onError);
                ws.addEventListener("open", onOpen);
            });
            return ws;
        } catch {
            return null;
        }
    }

    tick(ts) {
        if (!this.game) { console.error("Game not initialized"); this.rendering = false; return; }
        const dt = (ts - this.lastTimestamp) / 1000;
        this.lastTimestamp = ts;

        this.game.update(dt);
        this.game.render();

        const that = this;
        requestAnimationFrame(that.tick.bind(that));
    }
}

new Application();
