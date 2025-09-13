import * as msgs from "../msgs";
import * as events from "./events";
import { sleep } from "../utils";

type NetworkEventMap = {
    connect: void;
    disconnect: void;
    reconnect: void;
    welcome: msgs.WelcomeMessage;
    settings: msgs.SettingsMessage;
    hosted: msgs.HostedMessage;
    joined: msgs.JoinedMessage;
    state: msgs.StateMessage;
    map: msgs.MapMessage;
    left: void;
    chatted: msgs.ChattedMessage;
    error: msgs.ErrorMessage;
    system: msgs.SystemMessage;
    shot: msgs.ShotMessage;
};

export default class Network extends EventTarget {
    private ws: WebSocket
    constructor() {
        super();
        this.ws = new WebSocket("/ws");
        this.ws.binaryType = "arraybuffer";
        this.setupWSListeners();
    }

    setupWSListeners() {
        this.ws.addEventListener("open", () => {
            this.dispatchEvent(new events.ConnectEvent());
        });

        this.ws.addEventListener("message", (event) => {
            const msg = msgs.decode(event.data);
            if (msgs.isWelcomeMessage(msg)) {
                this.dispatchEvent(new events.WelcomeEvent(msg.data));
            } else if (msgs.isSettingsMessage(msg)) {
                this.dispatchEvent(new events.SettingsEvent(msg.data));
            } else if (msgs.isHostedMessage(msg)) {
                this.dispatchEvent(new events.HostedEvent(msg.data));
            } else if (msgs.isJoinedMessage(msg)) {
                this.dispatchEvent(new events.JoinedEvent(msg.data));
            } else if (msgs.isStateMessage(msg)) {
                this.dispatchEvent(new events.StateEvent(msg.data));
            } else if (msgs.isMapMessage(msg)) {
                this.dispatchEvent(new events.MapEvent(msg.data));
            } else if (msgs.isLeftMessage(msg)) {
                this.dispatchEvent(new events.LeftEvent());
            } else if (msgs.isChattedMessage(msg)) {
                this.dispatchEvent(new events.ChattedEvent(msg.data));
            } else if (msgs.isErrorMessage(msg)) {
                this.dispatchEvent(new events.ErrorEvent(msg.data));
            } else if (msgs.isSystemMessage(msg)) {
                this.dispatchEvent(new events.SystemEvent(msg.data));
            } else if (msgs.isShotMessage(msg)) {
                this.dispatchEvent(new events.ShotEvent(msg.data));
            } else {
                console.warn("Unknown message", msg);
            }
        });
        this.ws.addEventListener("close", () => {
            this.dispatchEvent(new events.DisconnectEvent());
            this.reconnect();
        });
    }

    on<K extends keyof NetworkEventMap>(type: K, listener: (eventData: NetworkEventMap[K]) => void): () => void {
        const handler = (e: Event) => {
            listener((e as CustomEvent<NetworkEventMap[K]>).detail);
        };

        this.addEventListener(type, handler);

        return () => {
            this.removeEventListener(type, handler);
        };
    }

    send<T extends msgs.GenericServerMessage["type"]>(
        t: T,
        ...args: Extract<msgs.GenericServerMessage, { type: T }>["data"] extends never
            ? []
            : [Extract<msgs.GenericServerMessage, { type: T }>["data"]]
    ) {
        const data = (args[0] ?? undefined) as Extract<
            msgs.GenericServerMessage,
            { type: T }
        >["data"];

        this.ws.send(msgs.encode({ type: t, data } as Extract<msgs.GenericServerMessage, { type: T }>));
    }

    private async reconnect() {
        console.log("Reconnecting...");

        for (let i = 0; i < 10; i++) {
            await sleep(1000 * i);
            const ws = await this.actualReconnect();
            if (ws) {
                this.ws = ws;
                this.setupWSListeners();
                this.dispatchEvent(new events.ReconnectEvent());
                return;
            }
        }
        console.log("Failed to reconnect");
    }

    private async actualReconnect() {
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
}