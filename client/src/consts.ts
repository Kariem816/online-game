export const directions = ["left", "right", "up", "down"] as const;
export type Direction = (typeof directions)[number];

export enum Team {
	TeamA,
	TeamB,
};

export enum Tile {
	Empty,
	TeamA,
	TeamB,
	Wall,
};

export enum GamePhase {
	WaitingForPlayers,
	GettingReady,
	Playing,
	GameOver,
};

export enum TWeapon {
	WEAPON_GUN,
	WEAPON_BOMB,
};