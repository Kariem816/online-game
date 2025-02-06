package weapons

import (
	"online-game/types"
	"online-game/types/omath"
)

type Weapon interface {
	ID() WeaponID
	// Name() string
	// Update(dt float64)
	// GetIsCooldown() bool
	// GetColldownLeft() time.Duration
	// GetIsHoldable() bool
	// Props() map[string]interface{}
	Shoot(pos, loc omath.Vector2, gameMap types.GameMap) ([]types.CellResult, error)
	// PhantomShoot(pos, loc omath.Vector2) ([]types.CellResult, error) // doesn't fire cooldown
}

type BaseWeapon struct {
	// cooldown    time.Duration // TODO: figure if it will be defined in terms of ticks or abs time
	// holdable    bool
	// activated   bool
	// activatedAt time.Time
}

type WeaponID uint8

const (
	WEAPON_GUN WeaponID = iota
)
