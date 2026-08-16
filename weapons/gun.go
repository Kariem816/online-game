package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/omath"
	"online-game/types"

	"github.com/chewxy/math32"
)

type Gun struct {
	BaseWeapon
	bulletsFired     uint32
	abilityFirstTime bool
	abilityActive    bool
	abilityStartTime time.Time
}
type GunBullet BaseProjectile

// weapon parameters
const GunCooldown = 500 * time.Millisecond
const GunAbilityCooldown = 10 * time.Millisecond
const GunAbilityBulletCooldown = 100 * time.Millisecond
const GunAbilityProbability = 0.1
const GunAbilityActivationBulletCount = 10
const GunAbilityInterval = 3 * time.Second

var GunRange = omath.UniformAccelerationMaxDistance(GunBulletInitialSpeed, -GunBulletDeceleration, GunBulletLifetime)

// projectile parameters
const GunBulletInitialSpeed = 15.0 // square units per second
const GunBulletDeceleration = 1.0  // square units per second^2
const GunBulletLifetime = 300 * time.Millisecond

// projectile parameters (ability)
const GunAbilityBulletInitialSpeed = 20.0 // square units per second
const GunAbilityBulletDeceleration = 1.0  // square units per second^2
const GunAbilityBulletLifetime = 500 * time.Millisecond

func NewGun(team types.TeamID) *Gun {
	return &Gun{
		BaseWeapon: BaseWeapon{
			id:       WEAPON_GUN,
			teamId:   team,
			cooldown: GunCooldown,
			maxRange: GunRange,
		},
		abilityFirstTime: true,
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

	if g.abilityActive {
		if time.Since(g.abilityStartTime) > GunAbilityInterval {
			g.abilityActive = false
		}
	} else if (g.bulletsFired > 0 && g.bulletsFired%GunAbilityActivationBulletCount == 0) && omath.RandFloat32() < GunAbilityProbability && (g.abilityFirstTime || time.Since(g.abilityStartTime) > GunAbilityCooldown) {
		g.abilityFirstTime = false
		g.abilityActive = true
		g.abilityStartTime = time.Now()
	}

	if g.held && g.cooldown == 0 {
		defer func() {
			g.setCooldown()
			g.bulletsFired++
		}()
		if g.abilityActive {
			return g.shootAbility()
		}
		return g.shoot()
	}
	return nil
}

func (g *Gun) Cooldown() time.Duration {
	return GunCooldown
}

func (g *Gun) shoot() []types.Projectile {
	bullet := GunBullet{
		Pos:      omath.Vector2{X: g.pos.X + 0.5, Y: g.pos.Y + 0.5},
		Vel:      omath.Polar{R: GunBulletInitialSpeed, Theta: g.theta}.Vector2(),
		Lifetime: GunBulletLifetime,
		TeamID:   g.teamId,
		WeaponID: g.id,
	}

	return []types.Projectile{&bullet}
}

func (g *Gun) shootAbility() []types.Projectile {
	bullet := GunBullet{
		Pos:      omath.Vector2{X: g.pos.X + 0.5, Y: g.pos.Y + 0.5},
		Vel:      omath.Polar{R: GunAbilityBulletInitialSpeed, Theta: g.theta}.Vector2(),
		Lifetime: GunAbilityBulletLifetime,
		TeamID:   g.teamId,
		WeaponID: g.id,
	}

	return []types.Projectile{&bullet}
}

func (g *Gun) setCooldown() {
	if g.abilityActive {
		g.cooldown = GunAbilityBulletCooldown
	} else {
		g.cooldown = GunCooldown
	}
}

func (g *Gun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:                        g.ID(),
		Cooldown:                  uint32(g.Cooldown().Milliseconds()),
		Range:                     g.maxRange,
		ProjectileCollisionRadius: 0.2,
		Name:                      g.Name(),
	}
}

func (b *GunBullet) Update(gameMap *types.GameMap) []types.TileResult {
	dt := float32(consts.GameTick.Seconds())
	b.Vel.Decelerate(GunBulletDeceleration * dt)

	b.Pos.X += b.Vel.X * dt
	b.Pos.Y += b.Vel.Y * dt

	b.Lifetime -= consts.GameTick

	if b.Lifetime <= 0 {
		cx := int32(math32.Floor(b.Pos.X))
		cy := int32(math32.Floor(b.Pos.Y))
		if gameMap.Get(cx, cy) != types.TileWall {
			return []types.TileResult{
				{Tile: b.TeamID.ToTile(), X: cx, Y: cy},
			}
		}
	}
	return nil
}

func (b *GunBullet) IsAlive() bool {
	return b.Lifetime > 0 && (b.Pos.X >= 0 && b.Pos.Y >= 0 && b.Pos.X < float32(consts.MapWidth) && b.Pos.Y < float32(consts.MapHeight))
}

func (b *GunBullet) Team() types.TeamID {
	return b.TeamID
}

func (b *GunBullet) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, BaseProjectile(*b), GunBulletDeceleration)
}
