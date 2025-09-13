import type { Direction, Team, Tile, TWeapon } from "../consts";

export enum Messages {
	MSG_WLCM,
	MSG_HOST,
	MSG_HOSTED,
	MSG_JOIN,
	MSG_JOINED,
	MSG_LEAVE,
	MSG_LEFT,
	MSG_START,
	MSG_STARTED,
	MSG_TEAM,
	MSG_TEAMED,
	MSG_WEAPON,
	MSG_MOVE,
	MSG_MOVED,
	MSG_SHOOT,
	MSG_SHOT,
	MSG_CHAT,
	MSG_CHATTED,
	MSG_MAP,
	MSG_STATE,
	MSG_MOUSE,
	MSG_SYSTEM,
	MSG_ERROR,
	length,
}
export enum SystemMessageType {
	SYS_MSG_INFO,
	SYS_MSG_ERROR,
	SYS_MSG_SUCCESS,
	length,
}

export type GameSettings = {
	gameLength: number;
	playerSpeed: number;
	weapons: SettingsMessageWeapon[];
};

export type WelcomeMessage = {
	id: number;
	username: string;
	settings: GameSettings;
};

export type HostMessage = undefined;
export type HostedMessage = {
	room: string;
};

export type JoinMessage = {
	room: string;
};
export type JoinedMessage = {
	room: string;
};

export type LeaveMessage = undefined;
export type LeftMessage = undefined;

export type StartMessage = undefined;
export type StartedMessage = undefined;

export type TeamMessage = undefined;

export type WeaponMessage = {
	weapon: TWeapon;
}

export type MoveMessage = {
	direction: Direction;
	start: boolean;
};
export type MovedMessage = undefined;

export type ShootMessage = undefined;

export type CellResult = {
	x: number;
	y: number;
	state: Tile;
};

export type ShotMessage = {
	cells: CellResult[];
};

export type ChatMessage = {
	message: string;
};
export type ChattedMessage = {
	message: string;
	from: number;
};

export type MapMessage = {
	width: number;
	height: number;
	tiles: Tile[];
};

export type StateMessage = {
	host: number;
	room: string;
	startedAt?: Date;
	state: {
		teamA: number;
		teamB: number;
		scoreA: number;
		scoreB: number;
		phase: number;
	};
	players: {
		user: {
			id: number;
			username: string;
		};
		team: Team;
		weapon: TWeapon;
		x: number;
		y: number;
		vx: number;
		vy: number;
		theta: number;
		cooldown: number;
	}[];
};

export type MouseMessage = {
	x: number;
	y: number;
};

export type SettingsMessageWeapon = {
	id: number;
	cooldown: number;
	name: string;
};

export type SystemMessage = {
	type: SystemMessageType;
	message: string;
};
export type ErrorMessage = {
	message: string;
};

export type DecodeMessageReturn =
	| WelcomeMessage
	| HostedMessage
	| JoinedMessage
	| LeftMessage
	| ShotMessage
	| ChattedMessage
	| MapMessage
	| StateMessage
	| SystemMessage
	| ErrorMessage;

export type TypedWelcomeMessage = {
	data: WelcomeMessage;
	type: Messages.MSG_WLCM;
};
export type TypedHostMessage = {
	data: HostMessage;
	type: Messages.MSG_HOST;
};
export type TypedHostedMessage = {
	data: HostedMessage;
	type: Messages.MSG_HOSTED;
};
export type TypedJoinMessage = {
	data: JoinMessage;
	type: Messages.MSG_JOIN;
};
export type TypedJoinedMessage = {
	data: JoinedMessage;
	type: Messages.MSG_JOINED;
};
export type TypedLeaveMessage = {
	data: LeaveMessage;
	type: Messages.MSG_LEAVE;
};
export type TypedLeftMessage = {
	data: LeftMessage;
	type: Messages.MSG_LEFT;
};
export type TypedStartMessage = {
	data: StartMessage;
	type: Messages.MSG_START;
};
export type TypedStartedMessage = {
	data: StartedMessage;
	type: Messages.MSG_STARTED;
};
export type TypedTeamMessage = {
	data: TeamMessage;
	type: Messages.MSG_TEAM;
};
export type TypedWeaponMessage = {
	data: WeaponMessage;
	type: Messages.MSG_WEAPON;
};
export type TypedMoveMessage = {
	data: MoveMessage;
	type: Messages.MSG_MOVE;
};
export type TypedMovedMessage = {
	data: MovedMessage;
	type: Messages.MSG_MOVED;
};
export type TypedShootMessage = {
	data: ShootMessage;
	type: Messages.MSG_SHOOT;
};
export type TypedShotMessage = {
	data: ShotMessage;
	type: Messages.MSG_SHOT;
};
export type TypedChatMessage = {
	data: ChatMessage;
	type: Messages.MSG_CHAT;
};
export type TypedChattedMessage = {
	data: ChattedMessage;
	type: Messages.MSG_CHATTED;
};
export type TypedMapMessage = {
	data: MapMessage;
	type: Messages.MSG_MAP;
};
export type TypedStateMessage = {
	data: StateMessage;
	type: Messages.MSG_STATE;
};
export type TypedMouseMessage = {
	data: MouseMessage;
	type: Messages.MSG_MOUSE;
};
export type TypedSystemMessage = {
	data: SystemMessage;
	type: Messages.MSG_SYSTEM;
};
export type TypedErrorMessage = {
	data: ErrorMessage;
	type: Messages.MSG_ERROR;
};

export type GenericServerMessage =
	| TypedWelcomeMessage
	| TypedHostMessage
	| TypedHostedMessage
	| TypedJoinMessage
	| TypedJoinedMessage
	| TypedLeaveMessage
	| TypedLeftMessage
	| TypedStartMessage
	| TypedStartedMessage
	| TypedTeamMessage
	| TypedWeaponMessage
	| TypedMoveMessage
	| TypedMovedMessage
	| TypedShootMessage
	| TypedShotMessage
	| TypedChatMessage
	| TypedChattedMessage
	| TypedMapMessage
	| TypedStateMessage
	| TypedMouseMessage
	| TypedSystemMessage
	| TypedErrorMessage;
