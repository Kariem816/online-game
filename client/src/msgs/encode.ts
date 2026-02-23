import { Messages } from "./types";

import type {
	GenericClientMessage,
} from "./types";

export function encode(msg: GenericClientMessage): Uint8Array {
	if (msg.type >= Messages.length) {
		throw new Error("Unknown message type" + msg.type);
	}

	switch (msg.type) {
		case Messages.MSG_HOST:
		case Messages.MSG_LEAVE:
		case Messages.MSG_START:
		case Messages.MSG_TEAM:
		case Messages.MSG_MOUSEPRESS:
		case Messages.MSG_MOUSERELEASE: {
			const buf = new Uint8Array(1);
			buf[0] = msg.type;
			return buf;
		}
		case Messages.MSG_MOUSEMOVE: {
			const data = msg.data;
			const { x, y } = data;

			const buf = new ArrayBuffer(9);
			const view = new DataView(buf);
			view.setUint8(0, msg.type);
			view.setInt32(1, x, true);
			view.setInt32(5, y, true);

			return new Uint8Array(buf);
		}
		case Messages.MSG_JOIN: {
			const data = msg.data;
			const buf = new Uint8Array(5);
			buf[0] = msg.type;
			const { room } = data;
			if (room.length > 4) {
				console.warn("Room name too long. Truncating...");
			} else if (room.length < 4) {
				console.warn("Room name too short. Padding...");
				room.padEnd(4, " ");
			}
			const roomBuf = new TextEncoder().encode(room.slice(0, 4));
			buf.set(roomBuf, 1);
			return buf;
		}
		case Messages.MSG_WEAPON: {
			const { weapon } = msg.data;
			const buf = new Uint8Array(2);
			buf[0] = msg.type;
			buf[1] = weapon;
			return buf;
		}
		case Messages.MSG_MOVE: {
			const data = msg.data;
			const { direction, start } = data;
			const buf = new Uint8Array(2);
			buf[0] = msg.type;
			let flags = 0;
			switch (direction) {
				case "up":
					flags |= 1 << 0;
					break;
				case "down":
					flags |= 1 << 1;
					break;
				case "left":
					flags |= 1 << 2;
					break;
				case "right":
					flags |= 1 << 3;
					break;
			}
			if (start) {
				flags |= 1 << 4;
			}
			buf[1] = flags;
			return buf;
		}
		case Messages.MSG_CHAT: {
			const data = msg.data;
			const sz = data.message.length;
			if (sz > 255) {
				console.warn("Message too long. Truncating...");
			}
			const buf = new Uint8Array((sz > 255 ? 255 : sz) + 1 + 1); // for type and size
			buf[0] = msg.type;
			buf[1] = sz;
			const msgBuf = new TextEncoder().encode(data.message);
			buf.set(msgBuf, 2);
			return buf;
		}
		default:
			throw new Error("Unreachable code :: GenericClientMessage");
	}
}
