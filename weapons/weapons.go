package weapons

import (
	"bytes"
	"encoding/binary"
	"time"

	"online-game/omath"
	"online-game/types"
)

type Weapon interface {
	ID() types.WeaponID
	Name() string
	SetTeam(team types.TeamID)

	Update() []types.Projectile

	Cooldown() time.Duration
	CooldownLeft() time.Duration
	ResetCooldown() error

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
	Lifetime time.Duration
	TeamID   types.TeamID
	WeaponID types.WeaponID
}

func (w *BaseWeapon) ID() types.WeaponID {
	return w.id
}

func (w *BaseWeapon) SetTeam(team types.TeamID) {
	w.teamId = team
}

func (w *BaseWeapon) CooldownLeft() time.Duration {
	return w.cooldown
}

func (w *BaseWeapon) ResetCooldown() error {
	w.cooldown = 0
	return nil
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

func serializeBaseProjectile(order binary.ByteOrder, proj BaseProjectile, acc float32) ([]byte, error) {
	buf := &bytes.Buffer{}
	var err error

	err = proj.Pos.Write(buf, order)
	if err != nil {
		return nil, err
	}

	err = proj.Vel.Write(buf, order)
	if err != nil {
		return nil, err
	}

	err = binary.Write(buf, order, acc)
	if err != nil {
		return nil, err
	}

	err = binary.Write(buf, order, proj.WeaponID)
	if err != nil {
		return nil, err
	}

	err = binary.Write(buf, order, proj.TeamID)
	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
