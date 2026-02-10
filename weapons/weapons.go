package weapons

import (
	"time"

	"online-game/types"
	"online-game/types/omath"
)

type Weapon interface {
	ID() types.WeaponID
	Name() string
	Update()
	// GetIsCooldown() bool
	Cooldown() time.Duration
	CooldownLeft() time.Duration
	// GetIsHoldable() bool
	// Props() map[string]interface{}
	Shoot(pos omath.Vector2, r float32, thata float32) []omath.IVector2
	// PhantomShoot(pos, loc omath.Vector2) ([]types.CellResult, error) // doesn't fire cooldown

	ToSettingsMessage() types.SettingsMessageWeapon
}

type BaseWeapon struct {
	id       types.WeaponID
	cooldown time.Duration
	radius   float32
	// holdable    bool
	// activated   bool
	// activatedAt time.Time
}

const (
	WEAPON_GUN            types.WeaponID = iota
	WEAPON_ROCKETLAUNCHER                = iota
	WEAPON_SHOTGUN                       = iota
	WEAPON_UZI                           = iota
	WEAPON_COUNT                         = iota
)

func List() []types.SettingsMessageWeapon {
	weapons := []Weapon{
		NewGun(),
		NewRocketLauncher(),
		NewShotgun(),
		NewUzi(),
	}
	ws := make([]types.SettingsMessageWeapon, len(weapons))
	for i, weapon := range weapons {
		ws[i] = weapon.ToSettingsMessage()
	}
	return ws
}
