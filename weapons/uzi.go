package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type Uzi struct {
	BaseWeapon
}

const UziCooldown = 200 * time.Millisecond

var baseUzi = BaseWeapon{
	id:       WEAPON_UZI,
	cooldown: UziCooldown,
	radius:   10,
}

func NewUzi() *Uzi {
	return &Uzi{
		BaseWeapon: baseUzi,
	}
}

func (u *Uzi) Name() string {
	return "Uzi"
}

func (u *Uzi) Update() []omath.IVector2 {
	if u.cooldown > 0 {
		u.cooldown -= consts.GameTick
	}
	if u.cooldown < 0 {
		u.cooldown = 0
	}

	if u.held && u.cooldown == 0 {
		return u.shoot()
	}
	return []omath.IVector2{}
}

func (u *Uzi) Cooldown() time.Duration {
	return UziCooldown
}

func (u *Uzi) shoot() []omath.IVector2 {
	defer u.setCooldown()
	return []omath.IVector2{
		u.hitCenter,
	}
}

func (u *Uzi) setCooldown() {
	u.cooldown = UziCooldown
}

func (u *Uzi) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       u.ID(),
		Cooldown: uint32(u.Cooldown().Milliseconds()),
		Radius:   u.radius,
		Name:     u.Name(),
	}
}
