package weapons

import (
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Gun struct {
	BaseWeapon
	id WeaponID
}

func NewGun() *Gun {
	return &Gun{
		id:         WEAPON_GUN,
		BaseWeapon: BaseWeapon{},
	}
}

func (g *Gun) ID() WeaponID {
	return g.id
}

func (g *Gun) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	x := px + math32.Cos(theta)
	y := py + math32.Sin(theta)
	return []omath.IVector2{{X: int32(x), Y: int32(y)}}
}
