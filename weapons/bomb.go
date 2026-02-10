package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"

	"github.com/chewxy/math32"
)

type Bomb struct {
	BaseWeapon
	cooldownLeft time.Duration
}

var baseBomb = BaseWeapon{
	id:       WEAPON_BOMB,
	cooldown: 3000 * time.Millisecond,
	radius:   4,
}

func NewBomb() *Bomb {
	return &Bomb{
		BaseWeapon:   baseBomb,
		cooldownLeft: baseBomb.cooldown,
	}
}

func (b *Bomb) ID() types.WeaponID {
	return b.id
}

func (b *Bomb) Name() string {
	return "Bomb"
}

func (b *Bomb) Update() {
	if b.cooldownLeft > 0 {
		b.cooldownLeft -= consts.GameTick
	}
	if b.cooldownLeft < 0 {
		b.cooldownLeft = 0
	}
}

func (b *Bomb) Cooldown() time.Duration {
	return b.cooldown
}
func (b *Bomb) CooldownLeft() time.Duration {
	return b.cooldownLeft
}

func (b *Bomb) Shoot(pos omath.Vector2, r float32, theta float32) []omath.IVector2 {
	px := pos.X + 0.5
	py := pos.Y + 0.5

	cx := px + baseBomb.radius*math32.Cos(theta)
	cy := py + baseBomb.radius*math32.Sin(theta)
	defer b.setCooldown()
	return []omath.IVector2{
		{X: int32(cx - 1), Y: int32(cy - 1)},
		{X: int32(cx - 1), Y: int32(cy + 1)},
		{X: int32(cx + 1), Y: int32(cy - 1)},
		{X: int32(cx + 1), Y: int32(cy + 1)},
	}
}

func (b *Bomb) setCooldown() {
	b.cooldownLeft = b.cooldown
}

func (b *Bomb) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       b.ID(),
		Cooldown: uint32(b.Cooldown().Milliseconds()),
		Radius:   b.radius,
		Name:     b.Name(),
	}
}
