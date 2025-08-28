package weapons

import (
	"time"

	"online-game/types/omath"
)

type Weapon interface {
	ID() WeaponID
	Name() string
	Update()
	// GetIsCooldown() bool
	Cooldown() time.Duration
	CooldownLeft() time.Duration
	// GetIsHoldable() bool
	// Props() map[string]interface{}
	Shoot(pos omath.Vector2, r float32, thata float32) []omath.IVector2
	// PhantomShoot(pos, loc omath.Vector2) ([]types.CellResult, error) // doesn't fire cooldown
}

type BaseWeapon struct {
	id       WeaponID
	cooldown time.Duration
	// holdable    bool
	// activated   bool
	// activatedAt time.Time
}

type WeaponID uint8

const (
	WEAPON_GUN   WeaponID = iota
	WEAPON_BOMB           = iota
	WEAPON_COUNT          = iota
)
