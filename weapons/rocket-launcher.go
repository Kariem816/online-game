package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/omath"
	"online-game/types"

	"github.com/chewxy/math32"
)

type RocketLauncher struct {
	BaseWeapon
}

type Rocket BaseProjectile

// weapon parameters
const RocketLauncherCooldown = 2000 * time.Millisecond

var RocketLauncherRange = omath.UniformAccelerationMaxDistance(RocketInitialSpeed, -RocketDeceleration, RocketLifetime)

// projectile parameters
const RocketInitialSpeed = 25.0 // square units per second
const RocketDeceleration = 1.0  // square units per second^2
const RocketLifetime = 750 * time.Millisecond
const RocketRadius = 0.25 // tiles

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
			Pos:      omath.Vector2{X: l.pos.X + 0.5, Y: l.pos.Y + 0.5},
			Vel:      omath.Polar{R: RocketInitialSpeed, Theta: l.theta}.Vector2(),
			Lifetime: RocketLifetime,
			TeamID:   l.teamId,
			WeaponID: l.id,
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
		ID:                        l.ID(),
		Cooldown:                  uint32(l.Cooldown().Milliseconds()),
		Range:                     l.maxRange,
		ProjectileCollisionRadius: RocketRadius,
		Name:                      l.Name(),
	}
}

func (r *Rocket) Update(gameMap *types.GameMap) []types.TileResult {
	dt := float32(consts.GameTick.Seconds())
	r.Vel.Decelerate(RocketDeceleration * dt)

	r.Pos.X += r.Vel.X * dt
	r.Pos.Y += r.Vel.Y * dt
	hasHitWall := false
	if gameMap.HasWall(r.Pos.X-RocketRadius, r.Pos.Y-RocketRadius) || gameMap.HasWall(r.Pos.X+RocketRadius, r.Pos.Y+RocketRadius) {
		hasHitWall = true
		r.Lifetime = 0
	} else {
		r.Lifetime -= consts.GameTick
	}

	if r.Lifetime <= 0 {
		cx := int32(math32.Floor(r.Pos.X))
		cy := int32(math32.Floor(r.Pos.Y))
		tiles := make([]types.TileResult, 0, 9)
		for dx := int32(-1); dx <= 1; dx++ {
			for dy := int32(-1); dy <= 1; dy++ {
				if !hasHitWall && gameMap.Get(cx+dx, cy+dy) == types.TileWall {
					continue
				}
				tiles = append(tiles, types.TileResult{Tile: r.TeamID.ToTile(), X: cx + dx, Y: cy + dy})
			}
		}
		return tiles
	}

	return nil
}

func (r *Rocket) IsAlive() bool {
	return r.Lifetime > 0 && (r.Pos.X >= 0 && r.Pos.Y >= 0 && r.Pos.X < float32(consts.MapWidth) && r.Pos.Y < float32(consts.MapHeight))
}

func (r *Rocket) Team() types.TeamID {
	return r.TeamID
}

func (r *Rocket) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, BaseProjectile(*r), RocketDeceleration)
}
