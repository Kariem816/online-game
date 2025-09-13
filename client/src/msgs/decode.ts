import { Messages, SystemMessageType } from "./types";

import type {
	ChattedMessage,
	WelcomeMessage,
	DecodeMessageReturn,
	ErrorMessage,
	GenericServerMessage,
	HostedMessage,
	JoinedMessage,
	MapMessage,
	ShotMessage,
	StateMessage,
	SystemMessage,
	TypedChattedMessage,
	TypedWelcomeMessage,
	TypedErrorMessage,
	TypedHostedMessage,
	TypedJoinedMessage,
	TypedLeftMessage,
	TypedMapMessage,
	TypedShotMessage,
	TypedStateMessage,
	TypedSystemMessage,
	SettingsMessageWeapon,
} from "./types";

class StatedDataView {
	constructor(private view: DataView<ArrayBuffer>, private offset = 0) { }

	getUint8() {
		const uint8 = this.view.getUint8(this.offset);
		this.offset += 1;
		return uint8;
	}

	getBoolean() {
		const boolean = this.view.getUint8(this.offset) !== 1;
		this.offset += 1;
		return boolean;
	}

	getInt16() {
		const int16 = this.view.getInt16(this.offset, true);
		this.offset += 2;
		return int16;
	}

	getInt32() {
		const int32 = this.view.getInt32(this.offset, true);
		this.offset += 4;
		return int32;
	}

	getUint32() {
		const int32 = this.view.getUint32(this.offset, true);
		this.offset += 4;
		return int32;
	}

	getFloat32() {
		const float64 = this.view.getFloat32(this.offset, true);
		this.offset += 4;
		return float64;
	}

	getString(length: number) {
		const bytes = this.view.buffer.slice(
			this.offset + this.view.byteOffset,
			this.offset + this.view.byteOffset + length
		);
		const string = new TextDecoder("utf-8").decode(bytes);
		this.offset += length;
		return string;
	}

	getUint8Array(length: number) {
		return new Uint8Array(
			this.view.buffer,
			this.offset + this.view.byteOffset,
			length
		);
	}
}

function decodeMsgData(
	view: StatedDataView,
	msgType: Messages
): DecodeMessageReturn {
	switch (msgType) {
		case Messages.MSG_WLCM: {
			const id = view.getInt16();
			const username = view.getString(view.getUint8());
			const gameLength = view.getInt32();
			const playerSpeed = view.getFloat32();
			const weaponsLen = view.getUint8();
			const weapons = new Array<SettingsMessageWeapon>(weaponsLen);
			for (let i = 0; i < weaponsLen; i++) {
				weapons[i] = {
					id: view.getUint8(),
					cooldown: view.getUint32(),
					name: view.getString(view.getUint8()),
				};
			}
			return {
				id,
				username,
				settings: {
					gameLength,
					playerSpeed,
					weapons,
				}
			} as WelcomeMessage;
		}
		case Messages.MSG_HOSTED: {
			const room = view.getString(4);
			return { room } as HostedMessage;
		}
		case Messages.MSG_JOINED: {
			const room = view.getString(4);
			return { room } as JoinedMessage;
		}
		case Messages.MSG_LEFT:
			return;
		case Messages.MSG_SHOT: {
			const length = view.getUint8();
			const cells = new Array(length);
			for (let i = 0; i < length; i++) {
				const cell = {
					x: view.getInt32(),
					y: view.getInt32(),
					state: view.getUint8(),
				};
				cells[i] = cell;
			}
			return { cells } as ShotMessage;
		}
		case Messages.MSG_CHATTED: {
			const from = view.getInt16();
			const message = view.getString(view.getUint8());
			return { from, message } as ChattedMessage;
		}
		case Messages.MSG_MAP: {
			const width = view.getInt32();
			const height = view.getInt32();
			const tiles = Array.from(view.getUint8Array(width * height));
			return { width, height, tiles } as MapMessage;
		}
		case Messages.MSG_STATE: {
			const host = view.getInt16();
			const room = view.getString(4);

			const unixSec = view.getInt32();
			const unixMilli = view.getInt16();
			const unix = unixSec * 1000 + unixMilli;
			let startedAt: Date | null = null;
			if (unix > 0) {
				startedAt = new Date(unix);
			}

			const state: StateMessage["state"] = {
				teamA: view.getInt32(),
				teamB: view.getInt32(),
				scoreA: view.getInt32(),
				scoreB: view.getInt32(),
				phase: view.getUint8(),
			};

			const playersLen = view.getUint8();
			const players = new Array<StateMessage["players"][number]>(
				playersLen
			);
			for (let i = 0; i < playersLen; i++) {
				players[i] = {
					user: {
						id: view.getInt16(),
						username: "",
					},
					team: view.getUint8(),
					weapon: view.getUint8(),
					x: view.getFloat32(),
					y: view.getFloat32(),
					vx: view.getInt32(),
					vy: view.getInt32(),
					theta: view.getFloat32(),
					cooldown: view.getUint8(),
				};
				players[i].user.username = view.getString(view.getUint8());
			}

			return {
				host,
				room,
				startedAt,
				state,
				players,
			} as StateMessage;
		}
		case Messages.MSG_SYSTEM: {
			const sysTypeIdx = view.getUint8();
			if (sysTypeIdx >= SystemMessageType.length) {
				throw new Error("Unknown System Message " + sysTypeIdx);
			}

			const message = view.getString(view.getUint8());

			return {
				type: sysTypeIdx,
				message,
			} as SystemMessage;
		}
		case Messages.MSG_ERROR:
			const message = view.getString(view.getUint8());
			return { message } as ErrorMessage;

		case Messages.MSG_HOST:
		case Messages.MSG_JOIN:
		case Messages.MSG_LEAVE:
		case Messages.MSG_START:
		case Messages.MSG_TEAM:
		case Messages.MSG_MOVE:
		case Messages.MSG_SHOOT:
		case Messages.MSG_CHAT:
		case Messages.MSG_MOUSE:
		default:
			throw new Error("Not Recivable " + Messages[msgType]);
	}
}

export function decode(msg: ArrayBuffer): GenericServerMessage {
	const msgType = new Uint8Array(msg, 0)[0];
	if (msgType >= Messages.length) {
		throw new Error("Unknown Message " + msgType);
	}

	const view = new StatedDataView(new DataView(msg, 1));

	switch (msgType) {
		case Messages.MSG_WLCM:
		case Messages.MSG_HOSTED:
		case Messages.MSG_JOINED:
		case Messages.MSG_LEFT:
		case Messages.MSG_SHOT:
		case Messages.MSG_CHATTED:
		case Messages.MSG_MAP:
		case Messages.MSG_STATE:
		case Messages.MSG_SYSTEM:
		case Messages.MSG_ERROR:
			return {
				type: msgType,
				data: decodeMsgData(view, msgType),
			} as GenericServerMessage;

		case Messages.MSG_HOST:
		case Messages.MSG_JOIN:
		case Messages.MSG_LEAVE:
		case Messages.MSG_START:
		case Messages.MSG_TEAM:
		case Messages.MSG_MOVE:
		case Messages.MSG_SHOOT:
		case Messages.MSG_CHAT:
		case Messages.MSG_MOUSE:
		default:
			throw new Error("Not Recivable " + Messages[msgType]);
	}
}

export function isWelcomeMessage(
	message: GenericServerMessage
): message is TypedWelcomeMessage {
	return message.type === Messages.MSG_WLCM;
}

export function isHostedMessage(
	message: GenericServerMessage
): message is TypedHostedMessage {
	return message.type === Messages.MSG_HOSTED;
}

export function isJoinedMessage(
	message: GenericServerMessage
): message is TypedJoinedMessage {
	return message.type === Messages.MSG_JOINED;
}

export function isLeftMessage(
	message: GenericServerMessage
): message is TypedLeftMessage {
	return message.type === Messages.MSG_LEFT;
}

export function isShotMessage(
	message: GenericServerMessage
): message is TypedShotMessage {
	return message.type === Messages.MSG_SHOT;
}

export function isChattedMessage(
	message: GenericServerMessage
): message is TypedChattedMessage {
	return message.type === Messages.MSG_CHATTED;
}

export function isMapMessage(
	message: GenericServerMessage
): message is TypedMapMessage {
	return message.type === Messages.MSG_MAP;
}

export function isStateMessage(
	message: GenericServerMessage
): message is TypedStateMessage {
	return message.type === Messages.MSG_STATE;
}

export function isSystemMessage(
	message: GenericServerMessage
): message is TypedSystemMessage {
	return message.type === Messages.MSG_SYSTEM;
}

export function isErrorMessage(
	message: GenericServerMessage
): message is TypedErrorMessage {
	return message.type === Messages.MSG_ERROR;
}
