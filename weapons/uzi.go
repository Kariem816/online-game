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

func (g *Uzi) ID() types.WeaponID {
	return g.id
}

func (g *Uzi) Name() string {
	return "Uzi"
}

func (g *Uzi) Update() {
	if g.cooldownLeft > 0 {
		g.cooldownLeft -= consts.GameTick
	}
	if g.cooldownLeft < 0 {
		g.cooldownLeft = 0
	}
}

func (g *Uzi) Cooldown() time.Duration {
	return g.cooldown
}
func (g *Uzi) CooldownLeft() time.Duration {
	return g.cooldownLeft
}

func (g *Uzi) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	x := px + baseUzi.radius*math32.Cos(theta)
	y := py + baseUzi.radius*math32.Sin(theta)

	defer g.setCooldown()
	return []omath.IVector2{
		{X: int32(x), Y: int32(y)},
	}
}

func (g *Uzi) setCooldown() {
	g.cooldownLeft = g.cooldown
}

func (g *Uzi) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       g.ID(),
		Cooldown: uint32(g.Cooldown().Milliseconds()),
		Radius:   g.radius,
		Name:     g.Name(),
	}
}
