package weapons

import (
	"errors"
	"online-game/types"
	"online-game/types/omath"
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

func (g *Gun) Shoot(pos, loc omath.Vector2, gameMap types.GameMap) ([]types.CellResult, error) {
	return []types.CellResult{}, errors.New("not implemented")
}
