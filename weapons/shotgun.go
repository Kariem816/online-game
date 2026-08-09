package weapons

import (
	"encoding/binary"
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Shotgun struct {
	BaseWeapon
	spread float32
}

type ShotgunShell BaseProjectile

// weapon parameters
const ShotgunCooldown = 1000 * time.Millisecond
const ShotgunRange = 2
const ShotgunSpread = 0.5

// projectile parameters
const ShotgunShellInitialSpeed = 1.0 // square units per tick
const ShotgunShellDeceleration = 0.0 // square units per tick^2
const ShotgunShellLifetime = 250 * time.Millisecond

func NewShotgun(team types.TeamID) *Shotgun {
	return &Shotgun{
		BaseWeapon: BaseWeapon{
			id:       WEAPON_SHOTGUN,
			teamId:   team,
			cooldown: ShotgunCooldown,
			maxRange: ShotgunRange,
		},
		spread: ShotgunSpread,
	}
}

func (s *Shotgun) Name() string {
	return "Shotgun"
}

func (s *Shotgun) Update() []types.Projectile {
	if s.cooldown > 0 {
		s.cooldown -= consts.GameTick
	}
	if s.cooldown < 0 {
		s.cooldown = 0
	}

	if s.held && s.cooldown == 0 {
		mainShell := ShotgunShell{
			Pos:      s.pos,
			Vel:      omath.Polar{R: ShotgunShellInitialSpeed, Theta: s.theta}.Vector2(),
			TeamID:   s.teamId,
			Lifetime: ShotgunShellLifetime,
		}
		shellLeft := mainShell
		shellLeft.Vel = omath.Polar{R: ShotgunShellInitialSpeed, Theta: s.theta - math32.Pi*s.spread/4}.Vector2()
		shellRight := mainShell
		shellRight.Vel = omath.Polar{R: ShotgunShellInitialSpeed, Theta: s.theta + math32.Pi*s.spread/4}.Vector2()
		s.setCooldown()
		return []types.Projectile{&mainShell, &shellLeft, &shellRight}
	}
	return nil
}

func (s *Shotgun) Cooldown() time.Duration {
	return ShotgunCooldown
}

func (s *Shotgun) setCooldown() {
	s.cooldown = ShotgunCooldown
}

func (s *Shotgun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       s.ID(),
		Cooldown: uint32(s.Cooldown().Milliseconds()),
		Range:    s.maxRange,
		Name:     s.Name(),
	}
}

func (s *ShotgunShell) Update() []omath.IVector2 {
	s.Vel.Decelerate(ShotgunShellDeceleration)

	s.Pos.X += s.Vel.X
	s.Pos.Y += s.Vel.Y

	s.Lifetime -= consts.GameTick

	if s.Lifetime <= 0 {
		return []omath.IVector2{{X: int32(s.Pos.X), Y: int32(s.Pos.Y)}}
	}

	return nil
}

func (s *ShotgunShell) IsAlive() bool {
	return s.Lifetime > 0
}

func (s *ShotgunShell) Team() types.TeamID {
	return s.TeamID
}

func (s *ShotgunShell) Serialize(order binary.ByteOrder) ([]byte, error) {
	return serializeBaseProjectile(order, s.Pos, s.Vel, ShotgunShellDeceleration, s.TeamID)
}
