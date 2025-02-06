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
const EmptyTile = 0;
const TeamATile = 1;
const TeamBTile = 2;
const WallTile = 3;

// use for debugging
let one = false;

function HomeScreen(root, handlers) {
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
            handlers.joinRoom(roomInput);
        }
    })

    joinBtn.addEventListener("click", () => {
        handlers.joinRoom(roomInput);
    });

    hostBtn.addEventListener("click", () => {
        handlers.hostRoom();
    });
}

function GameScreen(root, handlers) {
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

    const chat = document.createElement("div");
    chat.classList.add("chat");
    container.appendChild(chat);

    const titleRow = document.createElement("div");
    titleRow.classList.add("row", "between");
    chat.appendChild(titleRow);

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
    chat.appendChild(chatBoxContainer);

    const chatBox = document.createElement("div");
    chatBox.id = "chatBox";
    chatBox.classList.add("chat-box");
    chatBoxContainer.appendChild(chatBox);

    const chatSend = document.createElement("div");
    chatSend.classList.add("chat-send");
    chat.appendChild(chatSend);

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
            handlers.chat(chatInput);
        }
    });

    chatBtn.addEventListener("click", () => {
        handlers.chat(chatInput);
    });

    leaveBtn.addEventListener("click", () => {
        handlers.leaveRoom();
    });

    appendSystemMessage("SYS_MSG_INFO", "Welcome to the game");
    appendSystemMessage("SYS_MSG_SUCCESS", "Your username is " + handlers.username());
    appendSystemMessage("SYS_MSG_INFO", "Use arrow keys to move");
    appendSystemMessage("SYS_MSG_INFO", "Use Z to shoot");
    appendSystemMessage("SYS_MSG_INFO", "Use T to change team");
    appendSystemMessage("SYS_MSG_INFO", "Use Q to start the game");
    appendSystemMessage("SYS_MSG_SUCCESS", "Have fun!");

    // TODO: there should be a better way to do this
    return canvas;
}

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
        this.state = {};
        this.map = new GameMap();
        this.myData = myData;

        this.setupControls();
    }

    setupControls() {
        this.renderer.addEventListener("keydown", (e) => {
            if (e.repeat) return;
            switch (e.code) {
                case "ArrowUp":
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
                case "ArrowDown":
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
                case "ArrowLeft":
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
                case "ArrowRight":
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
                case "KeyZ":
                    {
                        this.ws.send(
                            encodeMsg({
                                type: "MSG_SHOOT",
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
                case "ArrowUp":
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
                case "ArrowDown":
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
                case "ArrowLeft":
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
                case "ArrowRight":
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
                    if (right === WallTile || (cornerY && bottomRight === WallTile)) {
                        newX = Math.floor(newX);
                    }
                }

                if (player.vx < 0) {
                    if (tile === WallTile || (cornerY && bottom === WallTile)) {
                        newX = Math.ceil(newX);
                    }
                }

                if (player.vy > 0) {
                    if (bottom === WallTile || (cornerX && bottomRight === WallTile)) {
                        newY = Math.floor(newY);
                    }
                }

                if (player.vy < 0) {
                    if (tile === WallTile || (cornerX && right === WallTile)) {
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
                    case EmptyTile: {
                        // Empty
                    } break;
                    case TeamATile: {
                        this.ctx.fillStyle = teamAColor;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                    case TeamBTile: {
                        this.ctx.fillStyle = teamBColor;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                    case WallTile: {
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

class Application {
    /** @type {number?} */
    myId;
    /** @type {string?} */
    myUsername;

    /** @type {Game?} */
    game;

    activeScreen = 0; // 0: Home, 1: Game
    lastTimestamp = 0;
    rendering = false;

    constructor() {
        this.ws = new WebSocket("/ws");
        this.ws.binaryType = "arraybuffer";

        HomeScreen(root, {
            joinRoom: (input) => joinRoom(this.ws, input),
            hostRoom: () => hostRoom(this.ws),
        });
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
                    }
                    break;
                case "MSG_HOSTED":
                case "MSG_JOINED":
                    {
                        const canvas = GameScreen(root, {
                            leaveRoom: () => leaveRoom(ws),
                            chat: (input) => chat(ws, input),
                            username: () => this.myUsername,
                        });
                        this.activeScreen = 1;
                        this.game = new Game(ws, canvas, {
                            id: this.myId,
                            username: this.myUsername,
                        });
                    }
                    break;
                case "MSG_STATE":
                    {
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

                        if (this.activeScreen !== 1) {
                            console.error("should be unreachable");
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
                        HomeScreen(root, {
                            joinRoom,
                            hostRoom,
                        });
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
            HomeScreen(
                root,
                {
                    joinRoom: (input) => {},
                    hostRoom: () => {},
                }
            );
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
                HomeScreen(root, {
                    joinRoom: (input) => joinRoom(this.ws, input),
                    hostRoom: () => hostRoom(this.ws),
                });
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

(() => {
    new Application();
})();


