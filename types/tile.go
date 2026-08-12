package types

type Tile uint8

const (
	TileEmpty Tile = iota
	TileTeamA Tile = iota
	TileTeamB Tile = iota
	TileWall  Tile = iota
)

func (t Tile) IsTeamTile() bool {
	return t == TileTeamA || t == TileTeamB
}

func (t Tile) ToTeam() TeamID {
	switch t {
	case TileTeamA:
		return TeamA
	case TileTeamB:
		return TeamB
	default:
		return 3 // random bs go
	}
}
