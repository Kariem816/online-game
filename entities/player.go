package entities

import (
	"online-game/consts"
	"online-game/omath"
	"online-game/types"
	"online-game/weapons"

	"github.com/chewxy/math32"
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

	yTop := int32(math32.Floor(p.Pos.Y))
	yBottom := int32(math32.Floor(p.Pos.Y + 1 - 1e-4))

	xL := int32(math32.Floor(newX))
	xR := int32(math32.Floor(newX + 1 - 1e-4))
	tl, tr, bl, br := gameMap.GetAround(xL, yTop, xR, yBottom)

	if p.Vel.X > 0 && (tr == types.TileWall || br == types.TileWall) {
		newX = math32.Floor(newX)
	} else if p.Vel.X < 0 && (tl == types.TileWall || bl == types.TileWall) {
		newX = math32.Ceil(newX)
	}

	xLeft := int32(math32.Floor(newX))
	xRight := int32(math32.Floor(newX + 1 - 1e-4))
	yT := int32(math32.Floor(newY))
	yB := int32(math32.Floor(newY + 1 - 1e-4))
	tl2, tr2, bl2, br2 := gameMap.GetAround(xLeft, yT, xRight, yB)

	if p.Vel.Y > 0 && (bl2 == types.TileWall || br2 == types.TileWall) {
		newY = math32.Floor(newY)
	} else if p.Vel.Y < 0 && (tl2 == types.TileWall || tr2 == types.TileWall) {
		newY = math32.Ceil(newY)
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
