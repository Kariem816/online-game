package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type RocketLauncher struct {
	BaseWeapon
	cooldownLeft time.Duration
}

var baseRocketLauncher = BaseWeapon{
	id:       WEAPON_ROCKETLAUNCHER,
	cooldown: 3000 * time.Millisecond,
	radius:   4,
}

func NewRocketLauncher() *RocketLauncher {
	return &RocketLauncher{
		BaseWeapon:   baseRocketLauncher,
		cooldownLeft: baseRocketLauncher.cooldown,
	}
}

func (b *RocketLauncher) ID() types.WeaponID {
	return b.id
}

func (b *RocketLauncher) Name() string {
	return "Rocket Launcher"
}

func (b *RocketLauncher) Update() {
	if b.cooldownLeft > 0 {
		b.cooldownLeft -= consts.GameTick
	}
	if b.cooldownLeft < 0 {
		b.cooldownLeft = 0
	}
}

func (b *RocketLauncher) Cooldown() time.Duration {
	return b.cooldown
}

func (b *RocketLauncher) CooldownLeft() time.Duration {
	return b.cooldownLeft
}

func (b *RocketLauncher) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	cx := px + baseRocketLauncher.radius*math32.Cos(theta)
	cy := py + baseRocketLauncher.radius*math32.Sin(theta)
	defer b.setCooldown()
	return []omath.IVector2{
		{X: int32(cx - 1), Y: int32(cy)},
		{X: int32(cx), Y: int32(cy - 1)},
		{X: int32(cx), Y: int32(cy)},
		{X: int32(cx), Y: int32(cy + 1)},
		{X: int32(cx + 1), Y: int32(cy)},
	}
}

func (b *RocketLauncher) setCooldown() {
	b.cooldownLeft = b.cooldown
}

func (b *RocketLauncher) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       b.ID(),
		Cooldown: uint32(b.Cooldown().Milliseconds()),
		Radius:   b.radius,
		Name:     b.Name(),
	}
}
