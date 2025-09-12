import React from "./react.js"
import Game from "./game.js";
import { decodeMsg } from "./msgs.js";
import { appendMessage, appendSystemMessage } from "./chat.js";
import { Screens } from "./react.js";
import { sleep } from "./utils.js";

export default class Application {
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
