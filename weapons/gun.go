package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type Gun struct {
	BaseWeapon
}

const GunCooldown = 500 * time.Millisecond

var baseGun = BaseWeapon{
	id:       WEAPON_GUN,
	cooldown: GunCooldown,
	radius:   1,
}

func NewGun() *Gun {
	return &Gun{
		BaseWeapon: baseGun,
	}
}

func (g *Gun) Name() string {
	return "Gun"
}

func (g *Gun) Update() []omath.IVector2 {
	if g.cooldown > 0 {
		g.cooldown -= consts.GameTick
	}
	if g.cooldown < 0 {
		g.cooldown = 0
	}

	if g.held && g.cooldown == 0 {
		return g.shoot()
	}
	return []omath.IVector2{}
}

func (g *Gun) Cooldown() time.Duration {
	return GunCooldown
}

func (g *Gun) shoot() []omath.IVector2 {
	defer g.setCooldown()
	return []omath.IVector2{{X: g.hitCenter.X, Y: g.hitCenter.Y}}
}

func (g *Gun) setCooldown() {
	g.cooldown = GunCooldown
}

func (g *Gun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       g.ID(),
		Cooldown: uint32(g.Cooldown().Milliseconds()),
		Radius:   g.radius,
		Name:     g.Name(),
	}
}
