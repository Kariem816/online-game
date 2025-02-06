package types

import "online-game/types/omath"

type UserID int16

type Tile uint8
type GamePhase uint8

type TeamID uint8

type GameMap struct {
	Width  int32
	Height int32
	Tiles  []Tile
}

type GameState struct {
	GameMap GameMap
	TeamA   int
	TeamB   int
	ScoreA  int
	ScoreB  int
	Phase   GamePhase
}

type StateMessageState struct {
	TeamA  int32
	TeamB  int32
	ScoreA int32
	ScoreB int32
	Phase  GamePhase
}

type StateMessagePlayer struct {
	Team TeamID
	Pos  omath.Vector2
	Vel  omath.IVector2
	User StateMessageUser
}

type StateMessageUser struct {
	ID       UserID
	Username string
}

type CellResult struct {
	X     int32
	Y     int32
	State Tile
}
