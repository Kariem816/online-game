import { makeEnum } from "./utils.js";
import { encodeMsg } from "./msgs.js";
import { appendSystemMessage } from "./chat.js";

const root = document.getElementById("root");
export const Screens = makeEnum([
    "Home",
    "Game",
]);

function hostRoom(ws) {
    ws.send(
        encodeMsg({
            type: "MSG_HOST",
        })
    );
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

export default class React {
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