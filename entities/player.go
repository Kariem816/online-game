package entities

import (
	"online-game/consts"
	"online-game/types"
	"online-game/types/omath"
	"online-game/weapons"

	"github.com/chewxy/math32"
)

const (
	TeamA types.TeamID = iota
	TeamB types.TeamID = iota
)

type Player struct {
	User   *User
	Team   types.TeamID
	Weapon weapons.Weapon
	Pos    omath.Vector2
	Vel    omath.IVector2
	// for some god only knows reason, this contains r,theta of the mouse diff from player pos, see MoveMouse(x, y) for more
	// consider changing the ds to reflect this
	Mouse omath.Polar
}
type Players []*Player

func (p Players) StateMessage() []types.StateMessagePlayer {
	smps := make([]types.StateMessagePlayer, len(p))
	for i, player := range p {
		smps[i] = player.ToStateMessage()
	}
	return smps
}

func (p Players) RoomMessage() []types.RoomMessagePlayer {
	rmps := make([]types.RoomMessagePlayer, len(p))
	for i, player := range p {
		rmps[i] = player.ToRoomMessage()
	}
	return rmps
}

func (p *Player) ToStateMessage() types.StateMessagePlayer {
	return types.StateMessagePlayer{
		ID:       p.User.ID,
		Team:     p.Team,
		Weapon:   p.Weapon.ID(),
		Pos:      p.Pos,
		Vel:      p.Vel,
		Theta:    p.Mouse.Theta,
		Cooldown: p.Cooldown(),
	}
}

func (p *Player) ToRoomMessage() types.RoomMessagePlayer {
	return types.RoomMessagePlayer{
		ID:       p.User.ID,
		Team:     p.Team,
		Username: p.User.Username,
	}
}

func (p *Player) Move(direction string, start bool) {
	if start {
		switch direction {
		case "up":
			p.Vel.Y += -1
		case "down":
			p.Vel.Y += 1
		case "left":
			p.Vel.X += -1
		case "right":
			p.Vel.X += 1
		}
	} else {
		switch direction {
		case "up":
			p.Vel.Y -= -1
		case "down":
			p.Vel.Y -= 1
		case "left":
			p.Vel.X -= -1
		case "right":
			p.Vel.X -= 1
		}
	}
	// Clamp the direction
	p.Vel.X = int32(math32.Min(math32.Max(float32(p.Vel.X), -1), 1))
	p.Vel.Y = int32(math32.Min(math32.Max(float32(p.Vel.Y), -1), 1))
}

func (p *Player) AimTo(x, y int32) {
	dx := float32(x) - p.Pos.X
	dy := float32(y) - p.Pos.Y

	p.Mouse.R = math32.Sqrt(dx*dx + dy*dy)
	p.Mouse.Theta = math32.Atan2(dy, dx)

	p.Weapon.Aim(p.Pos, p.Mouse.R, p.Mouse.Theta)
}

func (p *Player) Update(gameMap *types.GameMap) {
	newX := p.Pos.X + float32(p.Vel.X)*consts.PlayerSpeed*float32(consts.GameTick.Seconds())
	newY := p.Pos.Y + float32(p.Vel.Y)*consts.PlayerSpeed*float32(consts.GameTick.Seconds())

	tile, bottom, right, bottomRight := GetAround(gameMap, int32(math32.Floor(newX)), int32(math32.Floor(newY)))
	cornerX := newX-math32.Floor(newX) > 0
	cornerY := newY-math32.Floor(newY) > 0

	// Check for collisions
	if p.Vel.X > 0 { // Moving right
		if right == WallTile || (cornerY && bottomRight == WallTile) {
			newX = math32.Floor(newX)
		}
	}

	if p.Vel.X < 0 { // Moving left
		if tile == WallTile || (cornerY && bottom == WallTile) {
			newX = math32.Ceil(newX)
		}
	}

	if p.Vel.Y > 0 { // Moving down
		if bottom == WallTile || (cornerX && bottomRight == WallTile) {
			newY = math32.Floor(newY)
		}
	}

	if p.Vel.Y < 0 { // Moving up
		if tile == WallTile || (cornerX && right == WallTile) {
			newY = math32.Ceil(newY)
		}
	}

	p.Pos.X = newX
	p.Pos.Y = newY
}

func (p *Player) Reset() {
	p.Vel.X = 0
	p.Vel.Y = 0
}

func (p *Player) Cooldown() uint8 {
	return uint8(p.Weapon.CooldownLeft() * 100 / p.Weapon.Cooldown())
}

func (p *Player) ChangeWeapon(weaponID types.WeaponID) {
	if p.Weapon.ID() == weaponID {
		return
	}
	held := p.Weapon.IsHeld()

	switch weaponID {
	case weapons.WEAPON_GUN:
		p.Weapon = weapons.NewGun(p.Team)
	case weapons.WEAPON_ROCKETLAUNCHER:
		p.Weapon = weapons.NewRocketLauncher(p.Team)
	case weapons.WEAPON_SHOTGUN:
		p.Weapon = weapons.NewShotgun(p.Team)
	case weapons.WEAPON_UZI:
		p.Weapon = weapons.NewUzi(p.Team)
	case weapons.WEAPON_BOMB:
		p.Weapon = weapons.NewBomb(p.Team)
	}

	if held {
		p.Weapon.Hold()
	}
}
