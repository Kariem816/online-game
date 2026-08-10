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
const ShotgunCooldown = 1500 * time.Millisecond
const ShotgunSpread = 0.2
const ShotgunShellCount = 5 // this must be odd

var ShotgunRange = omath.UniformAccelerationMaxDistance(ShotgunShellInitialSpeed, -ShotgunShellDeceleration, ShotgunShellLifetime)

// projectile parameters
const ShotgunShellInitialSpeed = 20.0 // square units per second
const ShotgunShellDeceleration = 1.5  // square units per second^2
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
		shells := make([]types.Projectile, ShotgunShellCount)
		for i := range ShotgunShellCount {
			theta := s.theta - math32.Pi*s.spread*(float32(i-ShotgunShellCount/2)/4)
			shell := ShotgunShell{
				Pos:      s.pos,
				Vel:      omath.Polar{R: ShotgunShellInitialSpeed, Theta: theta}.Vector2(),
				TeamID:   s.teamId,
				Lifetime: ShotgunShellLifetime,
			}
			shells[i] = &shell
		}
		s.setCooldown()
		return shells
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
	dt := float32(consts.GameTick.Seconds())
	s.Vel.Decelerate(ShotgunShellDeceleration * dt)

	s.Pos.X += s.Vel.X * dt
	s.Pos.Y += s.Vel.Y * dt

	s.Lifetime -= consts.GameTick

	if s.Lifetime <= 0 {
		return []omath.IVector2{{X: int32(math32.Round(s.Pos.X)), Y: int32(math32.Round(s.Pos.Y))}}
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
