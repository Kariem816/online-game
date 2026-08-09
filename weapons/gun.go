package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type Gun struct {
	BaseWeapon
}
type GunBullet BaseProjectile

// weapon parameters
const GunCooldown = 500 * time.Millisecond
const GunRange = 1

// projectile parameters
const GunBulletInitialSpeed = 1.0 // square units per tick
const GunBulletDeceleration = 0.0 // square units per tick^2
const GunBulletLifetime = 500 * time.Millisecond

func NewGun(team types.TeamID) *Gun {
	return &Gun{
		BaseWeapon: BaseWeapon{
			id:       WEAPON_GUN,
			teamId:   team,
			cooldown: GunCooldown,
			maxRange: GunRange,
		},
	}
}

func (g *Gun) Name() string {
	return "Gun"
}

func (g *Gun) Update() []types.Projectile {
	if g.cooldown > 0 {
		g.cooldown -= consts.GameTick
	}
	if g.cooldown < 0 {
		g.cooldown = 0
	}

	if g.held && g.cooldown == 0 {
		bullet := GunBullet{
			Pos:      g.pos,
			Vel:      omath.Polar{R: GunBulletInitialSpeed, Theta: g.theta}.Vector2(),
			TeamID:   g.teamId,
			Lifetime: GunBulletLifetime,
		}
		g.setCooldown()
		return []types.Projectile{&bullet}
	}
	return nil
}

func (g *Gun) Cooldown() time.Duration {
	return GunCooldown
}

func (g *Gun) setCooldown() {
	g.cooldown = GunCooldown
}

func (g *Gun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       g.ID(),
		Cooldown: uint32(g.Cooldown().Milliseconds()),
		Range:    g.maxRange,
		Name:     g.Name(),
	}
}

func (b *GunBullet) Update() []omath.IVector2 {
	b.Vel.Decelerate(GunBulletDeceleration)

	b.Pos.X += b.Vel.X
	b.Pos.Y += b.Vel.Y

	b.Lifetime -= consts.GameTick

	if b.Lifetime <= 0 {
		return []omath.IVector2{
			{X: int32(b.Pos.X), Y: int32(b.Pos.Y)},
		}
	}
	return nil
}

func (b *GunBullet) IsAlive() bool {
	return b.Lifetime > 0
}

func (b *GunBullet) Team() types.TeamID {
	return b.TeamID
}

func (b *GunBullet) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, b.Pos, b.Vel, GunBulletDeceleration, b.TeamID)
}
