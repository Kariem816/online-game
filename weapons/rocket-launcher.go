package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type RocketLauncher struct {
	BaseWeapon
}

const RocketLauncherCooldown = 3000 * time.Millisecond

var baseRocketLauncher = BaseWeapon{
	id:       WEAPON_ROCKETLAUNCHER,
	cooldown: RocketLauncherCooldown,
	radius:   4,
}

func NewRocketLauncher() *RocketLauncher {
	return &RocketLauncher{
		BaseWeapon: baseRocketLauncher,
	}
}

func (l *RocketLauncher) Name() string {
	return "Rocket Launcher"
}

func (l *RocketLauncher) Update() []omath.IVector2 {
	if l.cooldown > 0 {
		l.cooldown -= consts.GameTick
	}
	if l.cooldown < 0 {
		l.cooldown = 0
	}

	if l.held && l.cooldown == 0 {
		return l.shoot()
	}
	return []omath.IVector2{}
}

func (l *RocketLauncher) Cooldown() time.Duration {
	return RocketLauncherCooldown
}

func (l *RocketLauncher) shoot() []omath.IVector2 {
	cx := l.hitCenter.X
	cy := l.hitCenter.Y
	defer l.setCooldown()
	return []omath.IVector2{
		{X: cx - 1, Y: cy - 1},
		{X: cx - 1, Y: cy},
		{X: cx - 1, Y: cy + 1},
		{X: cx, Y: cy - 1},
		{X: cx, Y: cy},
		{X: cx, Y: cy + 1},
		{X: cx + 1, Y: cy - 1},
		{X: cx + 1, Y: cy},
		{X: cx + 1, Y: cy + 1},
	}
}

func (l *RocketLauncher) setCooldown() {
	l.cooldown = RocketLauncherCooldown
}

func (l *RocketLauncher) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       l.ID(),
		Cooldown: uint32(l.Cooldown().Milliseconds()),
		Radius:   l.radius,
		Name:     l.Name(),
	}
}
