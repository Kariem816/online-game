package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Gun struct {
	BaseWeapon
	cooldownLeft time.Duration
}

var baseGun = BaseWeapon{
	id:       WEAPON_GUN,
	cooldown: 500 * time.Millisecond,
}

func NewGun() *Gun {
	return &Gun{
		BaseWeapon: baseGun,
	}
}

func (g *Gun) ID() types.WeaponID {
	return g.id
}

func (g *Gun) Name() string {
	return "Gun"
}

func (g *Gun) Update() {
	if g.cooldownLeft > 0 {
		g.cooldownLeft -= consts.GameTick
	}
	if g.cooldownLeft < 0 {
		g.cooldownLeft = 0
	}
}

func (g *Gun) Cooldown() time.Duration {
	return g.cooldown
}
func (g *Gun) CooldownLeft() time.Duration {
	return g.cooldownLeft
}

func (g *Gun) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	x := px + math32.Cos(theta)
	y := py + math32.Sin(theta)
	defer g.setCooldown()
	return []omath.IVector2{{X: int32(x), Y: int32(y)}}
}

func (g *Gun) setCooldown() {
	g.cooldownLeft = g.cooldown
}

func (g *Gun) ToSyncMessage() types.SyncMessageWeapon {
	return types.SyncMessageWeapon{
		ID:       g.ID(),
		Cooldown: uint32(g.Cooldown().Milliseconds()),
		Name:     g.Name(),
	}
}
