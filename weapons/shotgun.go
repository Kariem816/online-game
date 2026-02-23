package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Shotgun struct {
	BaseWeapon
	spread    float32
	hitCenter omath.Vector2
	theta     float32
}

const ShotgunCooldown = 1000 * time.Millisecond

var baseShotgun = BaseWeapon{
	id:       WEAPON_SHOTGUN,
	cooldown: ShotgunCooldown,
	radius:   2,
}

func NewShotgun() *Shotgun {
	return &Shotgun{
		BaseWeapon: baseShotgun,
		spread:     1,
	}
}

func (s *Shotgun) Name() string {
	return "Shotgun"
}

func (s *Shotgun) Update() []omath.IVector2 {
	if s.cooldown > 0 {
		s.cooldown -= consts.GameTick
	}
	if s.cooldown < 0 {
		s.cooldown = 0
	}

	if s.held && s.cooldown == 0 {
		return s.shoot()
	}
	return []omath.IVector2{}
}

func (s *Shotgun) Cooldown() time.Duration {
	return ShotgunCooldown
}

// we have oop at home
func (s *Shotgun) Aim(pos omath.Vector2, r float32, theta float32) {
	s.theta = theta
	s.hitCenter = omath.Vector2{
		X: pos.X + 0.5 + s.radius*math32.Cos(theta),
		Y: pos.Y + 0.5 + s.radius*math32.Sin(theta),
	}
}

func (s *Shotgun) shoot() []omath.IVector2 {
	cx := float32(s.hitCenter.X)
	cy := float32(s.hitCenter.Y)

	dxc := math32.Cos(s.theta) * s.spread
	dyc := math32.Sin(s.theta) * s.spread

	dxr := math32.Cos(s.theta+math32.Pi/2) * s.spread
	dyr := math32.Sin(s.theta+math32.Pi/2) * s.spread

	dxl := math32.Cos(s.theta-math32.Pi/2) * s.spread
	dyl := math32.Sin(s.theta-math32.Pi/2) * s.spread

	defer s.setCooldown()
	return []omath.IVector2{
		{X: int32(cx + dxc), Y: int32(cy + dyc)},
		{X: int32(cx + dxr), Y: int32(cy + dyr)},
		{X: int32(cx + dxl), Y: int32(cy + dyl)},
	}
}

func (s *Shotgun) setCooldown() {
	s.cooldown = ShotgunCooldown
}

func (s *Shotgun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       s.ID(),
		Cooldown: uint32(s.Cooldown().Milliseconds()),
		Radius:   s.radius,
		Name:     s.Name(),
	}
}
