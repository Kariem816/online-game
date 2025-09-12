import { encode, Messages, SystemMessageType } from "./msgs";
import { appendSystemMessage } from "./chat";

const root = document.getElementById("app")!;
export enum Screen {
    "Home",
    "Game",
}

function hostRoom(ws: WebSocket) {
    ws.send(
        encode({
            type: Messages.MSG_HOST,
            data: {},
        })
    );
}

function joinRoom(ws: WebSocket, roomInput: HTMLInputElement) {
    const room = roomInput.value;
    try {
        const buf = encode({
            type: Messages.MSG_JOIN,
            data: { room },
        })
        ws.send(buf);
    } catch (e: any) {
        alert(e.message);
        return;
    }
}

function leaveRoom(ws: WebSocket) {
    ws.send(
        encode({
            type: Messages.MSG_LEAVE,
            data: {},
        })
    );
}

function chat(ws: WebSocket, chatInput: HTMLInputElement) {
    const message = chatInput.value;
    if (!message) return;
    try {
        const buf = encode({
            type: Messages.MSG_CHAT,
            data: { message },
        });
        ws.send(buf);
        chatInput.value = "";
    } catch (e: any) {
        appendSystemMessage(SystemMessageType.SYS_MSG_ERROR, e.message);
        return;
    }
}

export default class React {
    active = Screen.Home;
    ws: WebSocket;
    username: string;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.username = "Unknown";

        this.HomeScreen();
    }

    #rerender() {
        if (this.active === Screen.Home) {
            this.HomeScreen();
        } else if (this.active === Screen.Game) {
            this.GameScreen();
        }
    }

    updateWs(ws: WebSocket) {
        this.ws = ws;
        this.#rerender();
    }

    updateUsername(username: string) {
        this.username = username;
        this.#rerender();
    }

    HomeScreen() {
        this.active = Screen.Home;

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
        this.active = Screen.Game;

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

        appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Welcome to the game");
        appendSystemMessage(SystemMessageType.SYS_MSG_SUCCESS, "Your username is " + this.username);
        appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Use WASD to move");
        appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Click to shoot");
        appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Use T to change team");
        appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Use Q to start the game");
        appendSystemMessage(SystemMessageType.SYS_MSG_SUCCESS, "Have fun!");

        // TODO: there should be a better way to do this
        return canvas;
    }
}