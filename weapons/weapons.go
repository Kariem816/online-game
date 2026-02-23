package weapons

import (
	"time"

	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Weapon interface {
	ID() types.WeaponID
	Name() string
	Update() []omath.IVector2
	Cooldown() time.Duration
	CooldownLeft() time.Duration
	IsHeld() bool
	Hold()
	Release()
	Aim(pos omath.Vector2, r float32, theta float32)

	ToSettingsMessage() types.SettingsMessageWeapon
}

type BaseWeapon struct {
	id        types.WeaponID
	cooldown  time.Duration
	radius    float32
	held      bool
	hitCenter omath.IVector2
}

func (w *BaseWeapon) ID() types.WeaponID {
	return w.id
}

func (w *BaseWeapon) CooldownLeft() time.Duration {
	return w.cooldown
}

func (w *BaseWeapon) IsHeld() bool {
	return w.held
}

func (w *BaseWeapon) Hold() {
	w.held = true
}

func (w *BaseWeapon) Release() {
	w.held = false
}

func (w *BaseWeapon) Aim(pos omath.Vector2, r float32, theta float32) {
	w.hitCenter = omath.IVector2{
		X: int32(pos.X + 0.5 + w.radius*math32.Cos(theta)),
		Y: int32(pos.Y + 0.5 + w.radius*math32.Sin(theta)),
	}
}

const (
	WEAPON_GUN            types.WeaponID = iota
	WEAPON_ROCKETLAUNCHER                = iota
	WEAPON_SHOTGUN                       = iota
	WEAPON_UZI                           = iota
	WEAPON_BOMB                          = iota
	WEAPON_COUNT                         = iota
)

func List() []types.SettingsMessageWeapon {
	weapons := []Weapon{
		NewBomb(),
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
