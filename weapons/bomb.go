package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type Bomb struct {
	BaseWeapon
}

type BombProjectile BaseProjectile

// Weapon parameters
const BombCooldown = 3000 * time.Millisecond
const BombRange = 4

// Projectile parameters
const BombProjectileInitialSpeed = 0.3  // square units per tick
const BombProjectileDeceleration = 0.01 // square units per tick^2
const BombProjectileLifetime = 1000 * time.Millisecond

func NewBomb(team types.TeamID) *Bomb {
	return &Bomb{
		BaseWeapon: BaseWeapon{
			id:       WEAPON_BOMB,
			teamId:   team,
			cooldown: BombCooldown,
			maxRange: BombRange,
		},
	}
}

func (b *Bomb) Name() string {
	return "Bomb"
}

func (b *Bomb) Update() []types.Projectile {
	if b.cooldown > 0 {
		b.cooldown -= consts.GameTick
	}
	if b.cooldown < 0 {
		b.cooldown = 0
	}

	if b.cooldown == 0 && b.held {
		projectile := BombProjectile{
			Pos:      b.pos,
			Vel:      omath.Polar{R: BombProjectileInitialSpeed, Theta: b.theta}.Vector2(),
			TeamID:   b.teamId,
			Lifetime: BombProjectileLifetime,
		}
		b.setCooldown()
		return []types.Projectile{&projectile}
	}

	return nil
}

func (b *Bomb) Cooldown() time.Duration {
	return BombCooldown
}

func (b *Bomb) setCooldown() {
	b.cooldown = BombCooldown
}

func (b *Bomb) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       b.ID(),
		Cooldown: uint32(b.Cooldown().Milliseconds()),
		Range:    b.maxRange,
		Name:     b.Name(),
	}
}

func (p *BombProjectile) Update() []omath.IVector2 {
	p.Vel.Decelerate(BombProjectileDeceleration)

	p.Pos.X += p.Vel.X
	p.Pos.Y += p.Vel.Y

	p.Lifetime -= consts.GameTick

	if p.Lifetime <= 0 {
		cx := int32(p.Pos.X)
		cy := int32(p.Pos.Y)
		return []omath.IVector2{
			{X: cx - 2, Y: cy},
			{X: cx + 2, Y: cy},
			{X: cx - 1, Y: cy - 1},
			{X: cx - 1, Y: cy + 1},
			{X: cx + 1, Y: cy - 1},
			{X: cx + 1, Y: cy + 1},
			{X: cx, Y: cy - 2},
			{X: cx, Y: cy + 2},
		}
	}

	return nil
}

func (p *BombProjectile) IsAlive() bool {
	return p.Lifetime > 0
}

func (p *BombProjectile) Team() types.TeamID {
	return p.TeamID
}

func (p *BombProjectile) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, p.Pos, p.Vel, BombProjectileDeceleration, p.TeamID)
}
