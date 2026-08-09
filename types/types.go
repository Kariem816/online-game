package types

import (
	"online-game/types/omath"
)

type UserID int16

type Tile uint8
type GamePhase uint8

type TeamID uint8

type WeaponID uint8

type GameMap struct {
	Width  int32
	Height int32
	Tiles  []Tile
}

type NetworkTime struct {
	Sec   int32
	Milli int16
}

type GameState struct {
	GameMap GameMap
	ScoreA  int
	ScoreB  int
	Phase   GamePhase
}

type StateMessageState struct {
	ScoreA int32
	ScoreB int32
	Phase  GamePhase
}

type StateMessagePlayer struct {
	ID       UserID
	Team     TeamID
	Weapon   WeaponID
	Pos      omath.Vector2
	Vel      omath.IVector2
	Theta    float32
	Cooldown uint8
}

type RoomMessagePlayer struct {
	ID       UserID
	Team     TeamID
	Username string
}

type CellResult struct {
	X     int32
	Y     int32
	State Tile
}

type SettingsMessageWeapon struct {
	ID       WeaponID
	Cooldown uint32
	Range    float32
	Name     string
}

type GameSettings struct {
	GameLength    int32
	MovementSpeed float32
	Weapons       []SettingsMessageWeapon
}
