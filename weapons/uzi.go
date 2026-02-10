package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Uzi struct {
	BaseWeapon
	cooldownLeft time.Duration
}

var baseUzi = BaseWeapon{
	id:       WEAPON_SHOTGUN,
	cooldown: 150 * time.Millisecond,
	radius:   10,
}

func NewUzi() *Uzi {
	return &Uzi{
		BaseWeapon:   baseUzi,
		cooldownLeft: baseUzi.cooldown,
	}
}

func (u *Uzi) ID() types.WeaponID {
	return u.id
}

func (u *Uzi) Name() string {
	return "Uzi"
}

func (u *Uzi) Update() {
	if u.cooldownLeft > 0 {
		u.cooldownLeft -= consts.GameTick
	}
	if u.cooldownLeft < 0 {
		u.cooldownLeft = 0
	}
}

func (u *Uzi) Cooldown() time.Duration {
	return u.cooldown
}
func (u *Uzi) CooldownLeft() time.Duration {
	return u.cooldownLeft
}

func (u *Uzi) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	x := px + baseUzi.radius*math32.Cos(theta)
	y := py + baseUzi.radius*math32.Sin(theta)

	defer u.setCooldown()
	return []omath.IVector2{
		{X: int32(x), Y: int32(y)},
	}
}

func (u *Uzi) setCooldown() {
	u.cooldownLeft = u.cooldown
}

func (u *Uzi) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       u.ID(),
		Cooldown: uint32(u.Cooldown().Milliseconds()),
		Radius:   u.radius,
		Name:     u.Name(),
	}
}
