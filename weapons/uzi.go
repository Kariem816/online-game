package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/omath"
	"online-game/types"

	"github.com/chewxy/math32"
)

type Uzi struct {
	BaseWeapon
}

type UziBullet BaseProjectile

// weapon parameters
const UziCooldown = 200 * time.Millisecond

var UziRange = omath.UniformAccelerationMaxDistance(UziBulletInitialSpeed, -UziBulletDeceleration, UziBulletLifetime)

// projectile parameters
const UziBulletInitialSpeed = 20.0 // square units per second
const UziBulletDeceleration = 0.0  // square units per second^2
const UziBulletLifetime = 666 * time.Millisecond
const UziBulletRadius = 0.2 // tiles

func NewUzi(team types.TeamID) *Uzi {
	return &Uzi{
		BaseWeapon: BaseWeapon{
			id:       WEAPON_UZI,
			teamId:   team,
			cooldown: UziCooldown,
			maxRange: UziRange,
		},
	}
}

func (u *Uzi) Name() string {
	return "Uzi"
}

func (u *Uzi) Update() []types.Projectile {
	if u.cooldown > 0 {
		u.cooldown -= consts.GameTick
	}
	if u.cooldown < 0 {
		u.cooldown = 0
	}

	if u.held && u.cooldown == 0 {
		projectile := UziBullet{
			Pos:      omath.Vector2{X: u.pos.X + 0.5, Y: u.pos.Y + 0.5},
			Vel:      omath.Polar{R: UziBulletInitialSpeed, Theta: u.theta}.Vector2(),
			TeamID:   u.teamId,
			Lifetime: UziBulletLifetime,
		}
		u.setCooldown()
		return []types.Projectile{&projectile}
	}
	return nil
}

func (u *Uzi) Cooldown() time.Duration {
	return UziCooldown
}

func (u *Uzi) setCooldown() {
	u.cooldown = UziCooldown
}

func (u *Uzi) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       u.ID(),
		Cooldown: uint32(u.Cooldown().Milliseconds()),
		Range:    u.maxRange,
		Name:     u.Name(),
	}
}

func (b *UziBullet) Update(gameMap *types.GameMap) []types.TileResult {
	dt := float32(consts.GameTick.Seconds())
	b.Vel.Decelerate(UziBulletDeceleration * dt)

	newX := b.Pos.X + b.Vel.X*dt
	newY := b.Pos.Y + b.Vel.Y*dt

	if gameMap.HasWall(newX-UziBulletRadius, b.Pos.Y) || gameMap.HasWall(newX+UziBulletRadius, b.Pos.Y) {
		b.Vel.X *= -1
	} else {
		b.Pos.X = newX
	}

	if gameMap.HasWall(b.Pos.X, newY-UziBulletRadius) || gameMap.HasWall(b.Pos.X, newY+UziBulletRadius) {
		b.Vel.Y *= -1
	} else {
		b.Pos.Y = newY
	}

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

func (b *UziBullet) IsAlive() bool {
	return b.Lifetime > 0 && (b.Pos.X >= 0 && b.Pos.Y >= 0 && b.Pos.X < float32(consts.MapWidth) && b.Pos.Y < float32(consts.MapHeight))
}

func (b *UziBullet) Team() types.TeamID {
	return b.TeamID
}

func (b *UziBullet) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, b.Pos, b.Vel, UziBulletDeceleration, b.TeamID)
}
