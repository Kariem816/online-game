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

const bombRange = 4

var baseBomb = BaseWeapon{
	id:       WEAPON_BOMB,
	cooldown: 3000 * time.Millisecond,
}

func NewBomb() *Bomb {
	return &Bomb{
		BaseWeapon: baseBomb,
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

	cx := px + bombRange*math32.Cos(theta)
	cy := py + bombRange*math32.Sin(theta)
	defer b.setCooldown()
	return []omath.IVector2{
		{X: int32(cx - 1), Y: int32(cy)},
		{X: int32(cx), Y: int32(cy - 1)},
		{X: int32(cx), Y: int32(cy)},
		{X: int32(cx), Y: int32(cy + 1)},
		{X: int32(cx + 1), Y: int32(cy)},
	}
}

func (b *Bomb) setCooldown() {
	b.cooldownLeft = b.cooldown
}

func (b *Bomb) ToSyncMessage() types.SyncMessageWeapon {
	return types.SyncMessageWeapon{
		ID:       b.ID(),
		Cooldown: uint32(b.Cooldown().Milliseconds()),
		Name:     b.Name(),
	}
}
