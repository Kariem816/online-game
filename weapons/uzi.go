package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type Uzi struct {
	BaseWeapon
}

type UziBullet BaseProjectile

// weapon parameters
const UziCooldown = 200 * time.Millisecond
const UziRange = 10

// projectile parameters
const UziBulletInitialSpeed = 1.5 // square units per tick
const UziBulletDeceleration = 0.0 // square units per tick^2
const UziBulletLifetime = 1000 * time.Millisecond

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
			Pos:      u.pos,
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

func (b *UziBullet) Update() []omath.IVector2 {
	b.Vel.Decelerate(UziBulletDeceleration)

	b.Pos.X += b.Vel.X
	b.Pos.Y += b.Vel.Y

	b.Lifetime -= consts.GameTick

	if b.Lifetime <= 0 {
		return []omath.IVector2{{X: int32(b.Pos.X), Y: int32(b.Pos.Y)}}
	}

	return nil
}

func (b *UziBullet) IsAlive() bool {
	return b.Lifetime > 0
}

func (b *UziBullet) Team() types.TeamID {
	return b.TeamID
}

func (b *UziBullet) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, b.Pos, b.Vel, UziBulletDeceleration, b.TeamID)
}
