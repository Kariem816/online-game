package weapons

import (
	"bytes"
	"encoding/binary"
	"time"

	"online-game/types"
	"online-game/types/omath"
)

type Weapon interface {
	ID() types.WeaponID
	Name() string
	Update() []types.Projectile
	Cooldown() time.Duration
	CooldownLeft() time.Duration
	IsHeld() bool
	Hold()
	Release()
	Aim(pos omath.Vector2, r float32, theta float32)

	ToSettingsMessage() types.SettingsMessageWeapon
}

type BaseWeapon struct {
	id       types.WeaponID
	teamId   types.TeamID
	cooldown time.Duration
	maxRange float32
	held     bool
	pos      omath.Vector2
	theta    float32
}

type BaseProjectile struct {
	Pos      omath.Vector2
	Vel      omath.Vector2
	TeamID   types.TeamID
	Lifetime time.Duration
}

func (w *BaseWeapon) ID() types.WeaponID {
	return w.id
}

func (w *BaseWeapon) CooldownLeft() time.Duration {
	return w.cooldown
}

func (w *BaseWeapon) IsHeld() bool {
	return w.held
}

func (w *BaseWeapon) Hold() {
	w.held = true
}

func (w *BaseWeapon) Release() {
	w.held = false
}

func (w *BaseWeapon) Aim(pos omath.Vector2, r float32, theta float32) {
	w.pos = pos
	w.theta = theta
}

const (
	WEAPON_GUN            types.WeaponID = iota
	WEAPON_ROCKETLAUNCHER                = iota
	WEAPON_SHOTGUN                       = iota
	WEAPON_UZI                           = iota
	WEAPON_BOMB                          = iota
	WEAPON_COUNT                         = iota
)

func List() []types.SettingsMessageWeapon {
	weapons := []Weapon{
		NewBomb(0),
		NewGun(0),
		NewRocketLauncher(0),
		NewShotgun(0),
		NewUzi(0),
	}
	ws := make([]types.SettingsMessageWeapon, len(weapons))
	for i, weapon := range weapons {
		ws[i] = weapon.ToSettingsMessage()
	}
	return ws
}

func serializeBaseProjectile(order binary.ByteOrder, pos omath.Vector2, vel omath.Vector2, acc float32, team types.TeamID) ([]byte, error) {
	buf := &bytes.Buffer{}
	var err error

	err = pos.Write(buf, order)
	if err != nil {
		return nil, err
	}

	err = vel.Write(buf, order)
	if err != nil {
		return nil, err
	}

	err = binary.Write(buf, order, acc)
	if err != nil {
		return nil, err
	}

	err = buf.WriteByte(uint8(team))
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
