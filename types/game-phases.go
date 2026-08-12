package types

type GamePhase uint8

const (
	PhaseAwaitingPlayers GamePhase = iota
	PhaseGetReady        GamePhase = iota
	PhasePlaying         GamePhase = iota
	PhaseGameOver        GamePhase = iota
)
