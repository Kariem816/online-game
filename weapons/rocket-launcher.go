package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type RocketLauncher struct {
	BaseWeapon
}

type Rocket BaseProjectile

// weapon parameters
const RocketLauncherCooldown = 3000 * time.Millisecond
const RocketLauncherRange = 4

// projectile parameters
const RocketLauncherProjectileInitialSpeed = 10.0 // square units per second
const RocketLauncherProjectileDeceleration = 0.2  // square units per second^2
const RocketLauncherProjectileLifetime = 4000 * time.Millisecond

func NewRocketLauncher(team types.TeamID) *RocketLauncher {
	return &RocketLauncher{
		BaseWeapon: BaseWeapon{
			id:       WEAPON_ROCKETLAUNCHER,
			teamId:   team,
			cooldown: RocketLauncherCooldown,
			maxRange: RocketLauncherRange,
		},
	}
}

func (l *RocketLauncher) Name() string {
	return "Rocket Launcher"
}

func (l *RocketLauncher) Update() []types.Projectile {
	if l.cooldown > 0 {
		l.cooldown -= consts.GameTick
	}
	if l.cooldown < 0 {
		l.cooldown = 0
	}

	if l.held && l.cooldown == 0 {
		projectile := Rocket{
			Pos:      l.pos,
			Vel:      omath.Polar{R: RocketLauncherProjectileInitialSpeed, Theta: l.theta}.Vector2(),
			TeamID:   l.teamId,
			Lifetime: RocketLauncherProjectileLifetime,
		}
		l.setCooldown()
		return []types.Projectile{&projectile}
	}
	return nil
}

func (l *RocketLauncher) Cooldown() time.Duration {
	return RocketLauncherCooldown
}

func (l *RocketLauncher) setCooldown() {
	l.cooldown = RocketLauncherCooldown
}

func (l *RocketLauncher) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       l.ID(),
		Cooldown: uint32(l.Cooldown().Milliseconds()),
		Range:    l.maxRange,
		Name:     l.Name(),
	}
}

func (r *Rocket) Update() []omath.IVector2 {
	dt := float32(consts.GameTick.Seconds())
	r.Vel.Decelerate(RocketLauncherProjectileDeceleration * dt)

	r.Pos.X += r.Vel.X * dt
	r.Pos.Y += r.Vel.Y * dt

	r.Lifetime -= consts.GameTick

	if r.Lifetime <= 0 {
		cx := int32(r.Pos.X)
		cy := int32(r.Pos.Y)

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

	return nil
}

func (r *Rocket) IsAlive() bool {
	return r.Lifetime > 0
}

func (r *Rocket) Team() types.TeamID {
	return r.TeamID
}

func (r *Rocket) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, r.Pos, r.Vel, RocketLauncherProjectileDeceleration, r.TeamID)
}
