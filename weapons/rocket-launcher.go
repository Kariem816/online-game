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

var RocketLauncherRange = omath.UniformAccelerationMaxDistance(RocketLauncherProjectileInitialSpeed, -RocketLauncherProjectileDeceleration, RocketLauncherProjectileLifetime)

// projectile parameters
const RocketLauncherProjectileInitialSpeed = 25.0 // square units per second
const RocketLauncherProjectileDeceleration = 1.0  // square units per second^2
const RocketLauncherProjectileLifetime = 750 * time.Millisecond

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

func (r *Rocket) Update(gameMap *types.GameMap) []types.TileResult {
	dt := float32(consts.GameTick.Seconds())
	r.Vel.Decelerate(RocketLauncherProjectileDeceleration * dt)

	r.Pos.X += r.Vel.X * dt
	r.Pos.Y += r.Vel.Y * dt

	r.Lifetime -= consts.GameTick

	if r.Lifetime <= 0 {
		cx := int32(math32.Round(r.Pos.X))
		cy := int32(math32.Round(r.Pos.Y))
		tiles := make([]types.TileResult, 0, 9)
		for dx := int32(-1); dx <= 1; dx++ {
			for dy := int32(-1); dy <= 1; dy++ {
				if gameMap.Get(cx+dx, cy+dy) == types.TileWall {
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
	return r.Lifetime > 0
}

func (r *Rocket) Team() types.TeamID {
	return r.TeamID
}

func (r *Rocket) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, r.Pos, r.Vel, RocketLauncherProjectileDeceleration, r.TeamID)
}
