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

func (l *RocketLauncher) ID() types.WeaponID {
	return l.id
}

func (l *RocketLauncher) Name() string {
	return "Rocket Launcher"
}

func (l *RocketLauncher) Update() {
	if l.cooldownLeft > 0 {
		l.cooldownLeft -= consts.GameTick
	}
	if l.cooldownLeft < 0 {
		l.cooldownLeft = 0
	}
}

func (l *RocketLauncher) Cooldown() time.Duration {
	return l.cooldown
}

func (l *RocketLauncher) CooldownLeft() time.Duration {
	return l.cooldownLeft
}

func (l *RocketLauncher) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	cx := px + baseRocketLauncher.radius*math32.Cos(theta)
	cy := py + baseRocketLauncher.radius*math32.Sin(theta)
	defer l.setCooldown()
	return []omath.IVector2{
		{X: int32(cx - 1), Y: int32(cy)},
		{X: int32(cx), Y: int32(cy - 1)},
		{X: int32(cx), Y: int32(cy)},
		{X: int32(cx), Y: int32(cy + 1)},
		{X: int32(cx + 1), Y: int32(cy)},
	}
}

func (l *RocketLauncher) setCooldown() {
	l.cooldownLeft = l.cooldown
}

func (l *RocketLauncher) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       l.ID(),
		Cooldown: uint32(l.Cooldown().Milliseconds()),
		Radius:   l.radius,
		Name:     l.Name(),
	}
}
