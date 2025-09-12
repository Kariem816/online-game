const root = document.getElementById("root");

// Game States
const GamePhases = enumJS([
    "WaitingForPlayers",
    "GettingReady",
    "Playing",
    "GameOver",
])

// Teams
const Teams = enumJS([
    "TeamA",
    "TeamB",
])

// Tile Types
const Tiles = enumJS([
    "EmptyTile",
    "TeamATile",
    "TeamBTile",
    "WallTile",
]);

// Screens
const Screens = enumJS([
    "Home",
    "Game",
])

function appendMessage(from, message) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return false;

    const chatMessage = document.createElement("p");
    chatMessage.classList.add("chat-message");
    chatBox.appendChild(chatMessage);

    const sender = document.createElement("span");
    sender.textContent = from;
    sender.classList.add("chat-sender");
    chatMessage.appendChild(sender);

    const space = document.createTextNode(" ");
    chatMessage.appendChild(space);

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
    constructor(ws, renderer, extras) {
        this.ws = ws;
        this.renderer = renderer;
        this.ctx = renderer.getContext("2d"); // shouldn't fail ?!

        this.debugFrame = false;

        this.input = new Input(renderer);

        this.game = {};
        this.map = new GameMap();

        const { settings, ...myData } = extras;
        this.settings = settings;
        this.myData = myData;

        renderer.addEventListener("click", this.onClickLockPointer.bind(this));
        document.addEventListener("pointerlockchange", this.onLockChangeAlert.bind(this), false);
    }

    async onClickLockPointer(e) {
        if (document.pointerLockElement === this.renderer) return;
        await this.renderer.requestPointerLock();
        this.input.setStartPosition(e.offsetX, e.offsetY);
    }

    gameStarted() {
        return this.game.state.phase === GamePhases.GettingReady || this.game.state.phase === GamePhases.Playing;
    }

    onLockChangeAlert() {
        if (document.pointerLockElement === this.renderer) {
            this.input.addListeners();
        } else {
            this.input.removeListeners();
        }
    }

    onStateUpdate(state) {
        this.game = state;
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
        return this.game.players.find((p) => p.user.id === this.myData.id);
    }

    update(dt) {
        // Logging
        if (this.debugFrame) {
            console.log({ state: this.game, serverUpdated: this.isServerUpdated });
            this.debugFrame = false;
        }

        // Players State
        if (this.game.state.phase === GamePhases.Playing && !this.isServerUpdated) {
            for (const player of this.game.players) {
                let newX = player.x + player.vx * dt * this.settings.movementSpeed;
                let newY = player.y + player.vy * dt * this.settings.movementSpeed;

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

                if (player.cooldown > 0) {
                    // TODO: consider making player cooldown not a percentage
                    const playerWeapon = this.settings.weapons.find((w) => w.id === player.weapon);
                    const cooldownTime = player.cooldown * playerWeapon.cooldown / 100 - dt * 1000;
                    player.cooldown = Math.max(0, cooldownTime) / playerWeapon.cooldown * 100;
                }
            }
        } else {
            this.isServerUpdated = false;
        }

        // Input
        this.input.update();

        if (this.game.state.phase === GamePhases.Playing) {
            // Movement
            if (this.input.isKeyPressed("KeyW")) {
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
            if (this.input.isKeyReleased("KeyW")) {
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

            if (this.input.isKeyPressed("KeyS")) {
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
            if (this.input.isKeyReleased("KeyS")) {
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

            if (this.input.isKeyPressed("KeyA")) {
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
            if (this.input.isKeyReleased("KeyA")) {
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

            if (this.input.isKeyPressed("KeyD")) {
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
            if (this.input.isKeyReleased("KeyD")) {
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

            // Weapons
            if (this.input.isKeyReleased("Digit1")) {
                this.ws.send(
                    encodeMsg({
                        type: "MSG_WEAPON",
                        data: {
                            weapon: Weapons.WEAPON_GUN,
                        },
                    })
                );
            }
            if (this.input.isKeyReleased("Digit2")) {
                this.ws.send(
                    encodeMsg({
                        type: "MSG_WEAPON",
                        data: {
                            weapon: Weapons.WEAPON_BOMB,
                        },
                    })
                );
            }

            // Shooting
            if (this.input.isMouseDown(Mouse.Left)) {
                const myPlayer = this.getMyPlayer();
                if (myPlayer.cooldown <= 0) {
                    this.ws.send(
                        encodeMsg({
                            type: "MSG_SHOOT",
                        })
                    );
                }
            }
        }

        if (this.game.state.phase === GamePhases.GettingReady || this.game.state.phase === GamePhases.Playing) {
            // Aiming
            const gameCoords = this.canvasToGameCoords(this.input.getMousePosition());

            this.ws.send(
                encodeMsg({
                    type: "MSG_MOUSE",
                    data: gameCoords,
                })
            );
        }

        if (this.game.state.phase === GamePhases.WaitingForPlayers || this.game.state.phase === GamePhases.GameOver) {
            // Menu
            if (this.input.isKeyReleased("KeyQ")) {
                this.ws.send(
                    encodeMsg({
                        type: "MSG_START",
                    })
                );
            }
            if (this.input.isKeyReleased("KeyT")) {
                this.ws.send(
                    encodeMsg({
                        type: "MSG_TEAM",
                    })
                );
            }
        }

        // Debug
        if (this.input.isKeyReleased("KeyR")) {
            this.debugFrame = true;
        }
    }

    render() {
        const { width, height } = this.renderer;
        const wOffset = width * 0.1;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;
        const teamAColor = "#" + this.game.state.teamA.toString(16).padStart(6, "0");
        const teamBColor = "#" + this.game.state.teamB.toString(16).padStart(6, "0");

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Bars
        this.ctx.fillStyle = "#353535";
        this.ctx.fillRect(0, 0, width, height);

        // Top Left Corner
        if (Collision.pointRect(this.input.getMousePosition(), { x: 0, y: 0, w: wOffset, h: hOffset })) {
            this.ctx.fillStyle = "#555555"
            this.ctx.fillRect(0, 0, wOffset, hOffset);
            if (this.input.isMouseReleased(Mouse.Left)) {
                copyText(this.game.room);
                appendSystemMessage("SYS_MSG_INFO", "Copied room code to clipboard");
            }
        }
        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(`Room: ${this.game.room}`, wOffset / 2, hOffset / 2, wOffset - 16);

        // Top bar
        let timeLeft;
        if (this.game.state.phase === GamePhases.Playing || this.game.state.phase === GamePhases.GettingReady) {
            const start = this.game.startedAt;
            const now = new Date();
            timeLeft = this.settings.gameLength - (now - start);
            this.ctx.fillStyle = "#f0f0f0";
            if (timeLeft <= 0) {
                this.ctx.fillText("Time is up", wOffset + wRest / 2, hOffset / 2);
            } else {
                const minutes = Math.floor(timeLeft / 1000 / 60).toString().padStart(2, "0");
                const seconds = (Math.floor(timeLeft / 1000) % 60).toString().padStart(2, "0");
                this.ctx.fillText(`${minutes}:${seconds}`, wOffset + wRest / 2, hOffset / 2);
            }
        } else {
            this.ctx.fillStyle = "#f0f0f0";
            this.ctx.fillText("01:00", width / 2, hOffset / 2);
        }

        // Sidebar
        const sidebarCenter = hOffset + hRest / 2;
        // score
        const score = this.game.state.phase === GamePhases.WaitingForPlayers ? "-" : `${this.game.state.scoreA} - ${this.game.state.scoreB}`;
        this.ctx.fillStyle = "#f0f0f0";
        this.ctx.fillText(score, wOffset / 2, sidebarCenter, wOffset - 20);

        // Teams
        const teamA = this.game.players.filter((p) => p.team === Teams.TeamA);
        const teamB = this.game.players.filter((p) => p.team === Teams.TeamB);
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
        if (this.gameStarted()) {
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
            for (const player of this.game.players) {
                const x = player.x + mapWidthOffset;
                const y = player.y + mapHeightOffset;
                const color = player.team === 0 ? teamAColor : teamBColor;

                const ringColor = player.user.id === this.game.host ?
                    "#fcbe03" : "#ffffff";
                const withRing = player.user.id === this.game.host || player.user.id === this.myData.id;

                // ring
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                if (withRing) {
                    this.ctx.strokeStyle = ringColor;
                    this.ctx.lineWidth = 0.2 * cellWidth; // TODO: this will cause issues if cellWidth !== cellHeight
                    this.ctx.beginPath();
                    this.ctx.moveTo((x + 0.1) * cellWidth, (y + 0.1) * cellHeight);
                    this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.1) * cellHeight);
                    this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                    this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                    this.ctx.closePath();
                    this.ctx.stroke();
                }

                // cooldown
                if (player.cooldown > 0) {
                    this.ctx.strokeStyle = "tomato";
                    this.ctx.lineWidth = 0.2 * cellWidth; // TODO: this will cause issues if cellWidth !== cellHeight
                    this.ctx.beginPath();

                    let progress = 0;
                    if (player.cooldown <= 100 && player.cooldown > 75) {
                        progress = 0.8 * (player.cooldown - 75) / 25; // 0.8 because the the full line has a length of 0.8
                        this.ctx.moveTo((x + 0.9 - progress) * cellWidth, (y + 0.1) * cellHeight);
                        this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.1) * cellHeight);
                        this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }
                    if (player.cooldown <= 75 && player.cooldown > 50) {
                        progress = 0.8 * (player.cooldown - 50) / 25;
                        this.ctx.moveTo((x + 0.9) * cellWidth, (y + 0.9 - progress) * cellHeight);
                        this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }
                    if (player.cooldown <= 50 && player.cooldown > 25) {
                        progress = 0.8 * (player.cooldown - 25) / 25;
                        this.ctx.moveTo((x + 0.1 + progress) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }
                    if (player.cooldown <= 25) {
                        progress = 0.8 * player.cooldown / 25;
                        this.ctx.moveTo((x + 0.1) * cellWidth, (y + 0.1 + progress) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }

                    this.ctx.stroke();
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

            if (this.game.state.phase === GamePhases.GettingReady) {
                const me = this.getMyPlayer();
                const x = me.x + mapWidthOffset;
                const y = me.y + mapHeightOffset;
                this.ctx.fillStyle = "#f0f0f0";
                this.ctx.textAlign = "center";
                const secs = Math.ceil((timeLeft - this.settings.gameLength) / 1000);
                this.ctx.fillText("Get ready! " + secs, (x + 0.5) * cellWidth, (y - 0.5) * cellHeight);
            }
        } else {
            this.ctx.fillStyle = "#353535";
            this.ctx.font = "60px Arial";
            switch (this.game.state.phase) {
                case GamePhases.WaitingForPlayers: {
                    this.ctx.fillText("Waiting for players", width / 2, hOffset + hRest / 2);
                } break;
                case GamePhases.GameOver: {
                    const winner = this.game.state.scoreA > this.game.state.scoreB ? "Team A Wins"
                        : this.game.state.scoreA === this.game.state.scoreB ? "It's a Tie" : "Team B Wins";
                    this.ctx.fillText(`Game Over! ${winner}`, width / 2, hOffset + hRest / 2);
                } break;
            }
        }

        this.crosshair();
    }

    crosshair() {
        const radius = 10;
        const { x, y } = this.input.getMousePosition();

        this.ctx.fillStyle = "#353535";
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(x - radius, y);
        this.ctx.lineTo(x + radius, y);
        this.ctx.moveTo(x, y - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.stroke();

        this.ctx.strokeStyle = "#f0f0f0";
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    getUsername(id) {
        for (const player of this.game.players) {
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

    /** @type {Object{length: number, speed: number, weapons: Object{id: number, cooldown: number, name: string}[]}} */
    settings;

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
                case "MSG_CNCT": {
                    this.myId = msg.data.id;
                    this.myUsername = msg.data.username;
                    this.react.updateUsername(this.myUsername);
                } break;
                case "MSG_SETTINGS": {
                    this.settings = msg.data;
                } break;
                case "MSG_HOSTED":
                case "MSG_JOINED": {
                    const canvas = this.react.GameScreen();
                    this.game = new Game(ws, canvas, {
                        id: this.myId,
                        username: this.myUsername,
                        settings: this.settings,
                    });
                } break;
                case "MSG_STATE": {
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
                } break;
                case "MSG_MAP": {
                    this.game?.onMapUpdate(msg.data);
                } break;
                case "MSG_LEFT": {
                    this.react.HomeScreen();
                    this.game = null;
                    this.activeScreen = 0;
                } break;
                case "MSG_CHATTED": {
                    appendMessage(that.game.getUsername(msg.data.from), msg.data.message);
                } break;
                case "MSG_ERROR": {
                    if (!appendSystemMessage("SYS_MSG_ERROR", msg.data.message)) {
                        // TODO: find a better way to display error messages
                        alert(msg.data.message);
                    }
                } break;
                case "MSG_SYSTEM": {
                    if (!appendSystemMessage(msg.data.type, msg.data.message)) {
                        console.log(msg.data.type, msg.data.msg);
                    }
                } break;
                case "MSG_SHOT": {
                    this.game?.onShot(msg.data.cells);
                } break;
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
