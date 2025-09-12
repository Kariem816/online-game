import React, { Screen } from "./react"
import Game from "./game";
import * as msgs from "./msgs";
import { appendMessage, appendSystemMessage } from "./chat";
import { sleep } from "./utils";

export default class Application {
    myId: number | null = null;
    myUsername: string | null = null;

    settings: msgs.SettingsMessage | null = null;
    game: Game | null = null;

    lastTimestamp = 0;
    rendering = false;

    activeScreen = Screen.Home;

    ws: WebSocket;
    react: React;

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
            const msg = msgs.decode(event.data);
            if (msgs.isConnectedMessage(msg)) {
                this.myId = msg.data.id;
                this.myUsername = msg.data.username;
                this.react.updateUsername(this.myUsername);
            } else if (msgs.isSettingsMessage(msg)) {
                this.settings = msg.data;
            } else if (msgs.isHostedMessage(msg) || msgs.isJoinedMessage(msg)) {
                // TODO: what if we hosted or joined before we got settings or username
                const canvas = this.react.GameScreen();
                this.game = new Game(ws, canvas, {
                    id: this.myId!,
                    username: this.myUsername!,
                    settings: this.settings!,
                });
            } else if (msgs.isStateMessage(msg)) {
                if (this.react.active !== Screen.Game) {
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
            } else if (msgs.isMapMessage(msg)) {
                this.game?.onMapUpdate(msg.data);
            } else if (msgs.isLeftMessage(msg)) {
                this.react.HomeScreen();
                this.game = null;
                this.activeScreen = 0;
            } else if (msgs.isChattedMessage(msg)) {
                appendMessage(that.game!.getUsername(msg.data.from), msg.data.message);
            } else if (msgs.isErrorMessage(msg)) {
                if (!appendSystemMessage(msgs.SystemMessageType.SYS_MSG_ERROR, msg.data.message)) {
                    // TODO: find a better way to display error messages
                    alert(msg.data.message);
                }
            } else if (msgs.isSystemMessage(msg)) {
                if (!appendSystemMessage(msg.data.type, msg.data.message)) {
                    console.log(msg.data.type, msg.data.message);
                }
            } else if (msgs.isShotMessage(msg)) {
                this.game?.onShot(msg.data.cells);
            } else {
                console.error("Unknown message type:", msg.type);
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
            await new Promise<void>((res, rej) => {
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

    tick(ts: number) {
        if (!this.game) {
            console.error("Game not initialized");
            this.rendering = false;
            return;
        }

        const dt = (ts - this.lastTimestamp) / 1000;
        this.lastTimestamp = ts;

        this.game.update(dt);
        this.game.render();

        const that = this;
        requestAnimationFrame(that.tick.bind(that));
    }
}
