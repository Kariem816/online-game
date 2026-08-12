package types

import (
	"encoding/binary"
)

type Projectile interface {
	Update(*GameMap) []TileResult
	IsAlive() bool
	Team() TeamID
	Serialize(order binary.ByteOrder) ([]byte, error)
}
