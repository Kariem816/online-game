package types

type TeamID uint8

const (
	TeamA TeamID = iota
	TeamB TeamID = iota
)

func (t TeamID) ToTile() Tile {
	switch t {
	case TeamA:
		return TileTeamA
	case TeamB:
		return TileTeamB
	default:
		return TileEmpty
	}
}
