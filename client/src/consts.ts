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

export const theme = {
	colors: {
		teamA: "#00FFFF",
		teamB: "#FF4500",
		background: "#28282B",
		backgroundHighlight: "#222222",
		success: "#39FF14",
		warning: "#FFD700",
		error: "#FF6347",
		foreground: "#F0F8FF",
		tileA: "#00BFFF",
		tileB: "#FF6347",
		tileWall: "#36454F",
	}
};