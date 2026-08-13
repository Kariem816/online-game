package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/omath"
	"online-game/types"

	"github.com/chewxy/math32"
)

type Bomb struct {
	BaseWeapon
}

type BombProjectile BaseProjectile

// Weapon parameters
const BombCooldown = 3000 * time.Millisecond

var BombRange = omath.UniformAccelerationMaxDistance(BombProjectileInitialSpeed, -BombProjectileDeceleration, BombProjectileLifetime)

// Projectile parameters
const BombProjectileRadius = 0.25       // tiles
const BombProjectileInitialSpeed = 12.0 // square units per second
const BombProjectileDeceleration = 0.7  // square units per second^2
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
			Pos:      omath.Vector2{X: b.pos.X + 0.5, Y: b.pos.Y + 0.5},
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

func (p *BombProjectile) Update(gameMap *types.GameMap) []types.TileResult {
	dt := float32(consts.GameTick.Seconds())
	p.Vel.Decelerate(BombProjectileDeceleration * dt)

	p.Pos.X += p.Vel.X * dt
	p.Pos.Y += p.Vel.Y * dt

	p.Lifetime -= consts.GameTick

	if p.Lifetime <= 0 {
		cx := int32(math32.Floor(p.Pos.X))
		cy := int32(math32.Floor(p.Pos.Y))
		tiles := make([]types.TileResult, 0, 8)
		for dx := int32(-2); dx <= 2; dx++ {
			for dy := int32(-2); dy <= 2; dy++ {
				dist := dx*dx + dy*dy
				if dist < 2 || 4 < dist {
					continue
				}
				if gameMap.Get(cx+dx, cy+dy) == types.TileWall {
					continue
				}
				tiles = append(tiles, types.TileResult{Tile: p.TeamID.ToTile(), X: cx + dx, Y: cy + dy})
			}
		}
		return tiles
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
