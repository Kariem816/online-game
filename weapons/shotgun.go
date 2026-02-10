package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Shotgun struct {
	BaseWeapon
	cooldownLeft time.Duration
}

const SHOTGUN_SPREAD = 1

var baseShotgun = BaseWeapon{
	id:       WEAPON_SHOTGUN,
	cooldown: 1000 * time.Millisecond,
	radius:   2,
}

func NewShotgun() *Shotgun {
	return &Shotgun{
		BaseWeapon:   baseShotgun,
		cooldownLeft: baseShotgun.cooldown,
	}
}

func (g *Shotgun) ID() types.WeaponID {
	return g.id
}

func (g *Shotgun) Name() string {
	return "Shotgun"
}

func (g *Shotgun) Update() {
	if g.cooldownLeft > 0 {
		g.cooldownLeft -= consts.GameTick
	}
	if g.cooldownLeft < 0 {
		g.cooldownLeft = 0
	}
}

func (g *Shotgun) Cooldown() time.Duration {
	return g.cooldown
}
func (g *Shotgun) CooldownLeft() time.Duration {
	return g.cooldownLeft
}

func (g *Shotgun) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	x := px + baseShotgun.radius*math32.Cos(theta)
	y := py + baseShotgun.radius*math32.Sin(theta)

	dxc := math32.Cos(theta) * SHOTGUN_SPREAD
	dyc := math32.Sin(theta) * SHOTGUN_SPREAD

	dxr := math32.Cos(theta+math32.Pi/2) * SHOTGUN_SPREAD
	dyr := math32.Sin(theta+math32.Pi/2) * SHOTGUN_SPREAD

	dxl := math32.Cos(theta-math32.Pi/2) * SHOTGUN_SPREAD
	dyl := math32.Sin(theta-math32.Pi/2) * SHOTGUN_SPREAD

	defer g.setCooldown()
	return []omath.IVector2{
		{X: int32(x + dxc), Y: int32(y + dyc)},
		{X: int32(x + dxr), Y: int32(y + dyr)},
		{X: int32(x + dxl), Y: int32(y + dyl)},
	}
}

func (g *Shotgun) setCooldown() {
	g.cooldownLeft = g.cooldown
}

func (g *Shotgun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       g.ID(),
		Cooldown: uint32(g.Cooldown().Milliseconds()),
		Radius:   g.radius,
		Name:     g.Name(),
	}
}
