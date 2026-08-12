package types

type Tile uint8

const (
	TileEmpty Tile = iota
	TileTeamA Tile = iota
	TileTeamB Tile = iota
	TileWall  Tile = iota
)
