import React, { Screen } from "./react"
import Game from "./game";
import { appendMessage, appendSystemMessage } from "./chat";
import Network from "./network";
import { SystemMessageType, type SettingsMessage } from "./msgs";

export default class Application {
    myId: number | null = null;
    myUsername: string | null = null;

    settings: SettingsMessage | null = null;
    game: Game | null = null;

    lastTimestamp = 0;
    rendering = false;

    activeScreen = Screen.Home;

    network: Network;
    react: React;

    constructor() {
        this.network = new Network();
        this.react = new React(this.network);

        this.setupNetworkListeners();
    }

    setupNetworkListeners() {
        const network = this.network;
        const that = this;

        network.on("connect", () => {
            console.log("Connected");
        });

        network.on("welcome", (msg) => {
            that.myId = msg.id;
            that.myUsername = msg.username;
            that.react.updateUsername(that.myUsername);
        });
        network.on("settings", (msg) => {
            that.settings = msg;
        });
        network.on("hosted", () => {
            const canvas = that.react.GameScreen();
            that.game = new Game(network, canvas, {
                id: that.myId!,
                username: that.myUsername!,
                settings: that.settings!,
            });
        });
        network.on("joined", () => {
            const canvas = that.react.GameScreen();
            that.game = new Game(network, canvas, {
                id: that.myId!,
                username: that.myUsername!,
                settings: that.settings!,
            });
        });
        network.on("state", (msg) => {
            if (that.react.active !== Screen.Game) {
                console.error("should be unreachable");
            }
            if (!that.game) {
                console.error("should be unreachable");
                return;
            }

            that.game.onStateUpdate(msg);
            if (!that.rendering) {
                that.rendering = true;
                requestAnimationFrame((timestamp) => {
                    that.lastTimestamp = timestamp;
                    that.tick(timestamp);
                });
            }
        });
        network.on("map", (msg) => {
            that.game?.onMapUpdate(msg);
        });
        network.on("left", () => {
            that.react.HomeScreen();
            that.game = null;
            that.activeScreen = 0;
        });
        network.on("chatted", (msg) => {
            appendMessage(that.game!.getUsername(msg.from), msg.message);
        });
        network.on("error", (msg) => {
            if (!appendSystemMessage(SystemMessageType.SYS_MSG_ERROR, msg.message)) {
                // TODO: find a better way to display error messages
                alert(msg.message);
            }
        });
        network.on("system", (msg) => {
            if (!appendSystemMessage(msg.type, msg.message)) {
                console.log(msg.type, msg.message);
            }
        });
        network.on("shot", (msg) => {
            this.game?.onShot(msg.cells);
        });
        network.on("disconnect", () => {
            this.react.HomeScreen();
            this.activeScreen = 0;
            this.game = null;
            this.myId = null;
            this.myUsername = null;
        });
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
