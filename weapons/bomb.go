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
	prevHeld bool
	lastHold time.Time
}

type BombProjectile BaseProjectile

// Weapon parameters
const BombCooldown = 1000 * time.Millisecond

var BombRange = omath.UniformAccelerationMaxDistance(BombProjectileMaxInitialSpeed, -BombProjectileDeceleration, BombProjectileLifetime)

// Projectile parameters
const BombProjectileRadius = 0.25          // tiles
const BombProjectileMaxInitialSpeed = 15.0 // square units per second
const BombProjectileDeceleration = 0.7     // square units per second^2
const BombProjectileLifetime = 1000 * time.Millisecond
const BombExplosionRadius = 0.3 // tiles
const BombProjectileCollisionLoss = 0.5
const BombProjectileMinHoldTime = 1000 * time.Millisecond
const BombProjectileMaxHoldTime = 3000 * time.Millisecond

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

func (b *Bomb) Hold() {
	b.held = true
	b.lastHold = time.Now()
}

func (b *Bomb) Update() []types.Projectile {
	if b.cooldown > 0 {
		b.cooldown -= consts.GameTick
	}
	if b.cooldown < 0 {
		b.cooldown = 0
	}
	defer func() {
		b.prevHeld = b.held
	}()

	if !b.held && b.prevHeld && b.cooldown == 0 {
		holdTime := time.Since(b.lastHold).Seconds()
		if holdTime > BombProjectileMaxHoldTime.Seconds() {
			holdTime = BombProjectileMaxHoldTime.Seconds()
		} else if holdTime < BombProjectileMinHoldTime.Seconds() {
			holdTime = BombProjectileMinHoldTime.Seconds()
		}

		vi := BombProjectileMaxInitialSpeed * float32(holdTime) / float32(BombProjectileMaxHoldTime.Seconds())
		projectile := BombProjectile{
			Pos:      omath.Vector2{X: b.pos.X + 0.5, Y: b.pos.Y + 0.5},
			Vel:      omath.Polar{R: vi, Theta: b.theta}.Vector2(),
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

	newX := p.Pos.X + p.Vel.X*dt
	newY := p.Pos.Y + p.Vel.Y*dt

	if gameMap.HasWall(newX-BombProjectileRadius, p.Pos.Y) || gameMap.HasWall(newX+BombProjectileRadius, p.Pos.Y) {
		p.Vel.X *= -1 * (1 - BombProjectileCollisionLoss)
	} else {
		p.Pos.X = newX
	}

	if gameMap.HasWall(p.Pos.X, newY-BombProjectileRadius) || gameMap.HasWall(p.Pos.X, newY+BombProjectileRadius) {
		p.Vel.Y *= -1 * (1 - BombProjectileCollisionLoss)
	} else {
		p.Pos.Y = newY
	}

	p.Lifetime -= consts.GameTick

	if p.Lifetime <= 0 {
		cx := int32(math32.Floor(p.Pos.X))
		cy := int32(math32.Floor(p.Pos.Y))
		tiles := make([]types.TileResult, 0, 8)
		for dx := int32(-2); dx <= 2; dx++ {
			for dy := int32(-2); dy <= 2; dy++ {
				dist := dx*dx + dy*dy
				if dist < 2 || 4 < dist {
					if dist < 2 && gameMap.Get(cx+dx, cy+dy) == types.TileWall {
						tiles = append(tiles, types.TileResult{X: cx + dx, Y: cy + dy}) // empty tile
					}
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
	return p.Lifetime > 0 && (p.Pos.X >= 0 && p.Pos.Y >= 0 && p.Pos.X < float32(consts.MapWidth) && p.Pos.Y < float32(consts.MapHeight))
}

func (p *BombProjectile) Team() types.TeamID {
	return p.TeamID
}

func (p *BombProjectile) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, p.Pos, p.Vel, BombProjectileDeceleration, p.TeamID)
}
