import { SystemMessageType } from "./msgs";

export function appendChatMessage(from: string, message: string) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return false;

    const chatMessage = document.createElement("p");
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

export function typeToString(type: SystemMessageType) {
    switch (type) {
        case SystemMessageType.SYS_MSG_INFO: return "info";
        case SystemMessageType.SYS_MSG_ERROR: return "error";
        case SystemMessageType.SYS_MSG_SUCCESS: return "success";
        default: return "unknown";
    }
}

export function appendSystemMessage(type: SystemMessageType, message: string) {
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