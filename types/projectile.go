package types

import (
	"encoding/binary"
	"online-game/types/omath"
)

type Projectile interface {
	Update() []omath.IVector2
	IsAlive() bool
	Team() TeamID
	Serialize(order binary.ByteOrder) ([]byte, error)
}
