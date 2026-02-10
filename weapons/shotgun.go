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
	cooldownLeft time.Duration
	spread       float32
}

var baseShotgun = BaseWeapon{
	id:       WEAPON_SHOTGUN,
	cooldown: 1000 * time.Millisecond,
	radius:   2,
}

func NewShotgun() *Shotgun {
	return &Shotgun{
		BaseWeapon:   baseShotgun,
		cooldownLeft: baseShotgun.cooldown,
		spread:       1,
	}
}

func (s *Shotgun) ID() types.WeaponID {
	return s.id
}

func (s *Shotgun) Name() string {
	return "Shotgun"
}

func (s *Shotgun) Update() {
	if s.cooldownLeft > 0 {
		s.cooldownLeft -= consts.GameTick
	}
	if s.cooldownLeft < 0 {
		s.cooldownLeft = 0
	}
}

func (s *Shotgun) Cooldown() time.Duration {
	return s.cooldown
}
func (s *Shotgun) CooldownLeft() time.Duration {
	return s.cooldownLeft
}

func (s *Shotgun) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	x := px + baseShotgun.radius*math32.Cos(theta)
	y := py + baseShotgun.radius*math32.Sin(theta)

	dxc := math32.Cos(theta) * s.spread
	dyc := math32.Sin(theta) * s.spread

	dxr := math32.Cos(theta+math32.Pi/2) * s.spread
	dyr := math32.Sin(theta+math32.Pi/2) * s.spread

	dxl := math32.Cos(theta-math32.Pi/2) * s.spread
	dyl := math32.Sin(theta-math32.Pi/2) * s.spread

	defer s.setCooldown()
	return []omath.IVector2{
		{X: int32(x + dxc), Y: int32(y + dyc)},
		{X: int32(x + dxr), Y: int32(y + dyr)},
		{X: int32(x + dxl), Y: int32(y + dyl)},
	}
}

func (s *Shotgun) setCooldown() {
	s.cooldownLeft = s.cooldown
}

func (s *Shotgun) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       s.ID(),
		Cooldown: uint32(s.Cooldown().Milliseconds()),
		Radius:   s.radius,
		Name:     s.Name(),
	}
}
