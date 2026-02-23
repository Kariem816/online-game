package weapons

import (
	"time"

	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
)

type Bomb struct {
	BaseWeapon
}

const BombCooldown = 3000 * time.Millisecond

var baseBomb = BaseWeapon{
	id:       WEAPON_BOMB,
	cooldown: BombCooldown,
	radius:   4,
}

func NewBomb() *Bomb {
	return &Bomb{
		BaseWeapon: baseBomb,
	}
}

func (b *Bomb) Name() string {
	return "Bomb"
}

func (b *Bomb) Update() []omath.IVector2 {
	if b.cooldown > 0 {
		b.cooldown -= consts.GameTick
	}
	if b.cooldown < 0 {
		b.cooldown = 0
	}

	if b.cooldown == 0 && b.held {
		return b.shoot()
	}

	return []omath.IVector2{}
}

func (b *Bomb) Cooldown() time.Duration {
	return BombCooldown
}

func (b *Bomb) shoot() []omath.IVector2 {
	cx := b.hitCenter.X
	cy := b.hitCenter.Y

	defer b.setCooldown()
	return []omath.IVector2{
		{X: cx - 2, Y: cy},
		{X: cx + 2, Y: cy},
		{X: cx - 1, Y: cy - 1},
		{X: cx - 1, Y: cy + 1},
		{X: cx + 1, Y: cy - 1},
		{X: cx + 1, Y: cy + 1},
		{X: cx, Y: cy - 2},
		{X: cx, Y: cy + 2},
	}
}

func (b *Bomb) setCooldown() {
	b.cooldown = BombCooldown
}

func (b *Bomb) ToSettingsMessage() types.SettingsMessageWeapon {
	return types.SettingsMessageWeapon{
		ID:       b.ID(),
		Cooldown: uint32(b.Cooldown().Milliseconds()),
		Radius:   b.radius,
		Name:     b.Name(),
	}
}
