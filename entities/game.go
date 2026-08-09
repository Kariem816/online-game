package entities

import (
	"errors"
	"fmt"
	"math/rand"
	"online-game/consts"
	"online-game/msgs"
	"online-game/types"
	"slices"
	"strings"
	"time"
)

type Game struct {
	Players     Players
	Projectiles []types.Projectile
	State       types.GameState
	Host        types.UserID
	Room        string
	LC          bool // large change

	StartedAt time.Time
}

var Games = []*Game{}

// var baseWeapons = []weapons.Weapon{
// 	weapons.NewGun(),
// }

func NewGame(host *User) string {
	var sb strings.Builder
	for range 4 {
		sb.WriteRune(rune(65 + rand.Intn(26)))
	}
	room := sb.String()

	player := host.ToPlayer(TeamA)
	game := &Game{
		Players: Players{
			player,
		},
		State: *NewGameState(consts.MapWidth, consts.MapHeight),
		Host:  host.ID,
		Room:  room,
		LC:    true,
	}
	Games = append(Games, game)
	fmt.Println("New Room:", room)
	return room
}

func FindGameByRoom(room string) *Game {
	for _, game := range Games {
		if game.Room == room {
			return game
		}
	}
	return nil
}

func FindUserInfo(userId types.UserID) *Game {
	for _, game := range Games {
		for _, player := range game.Players {
			if player.User.ID == userId {
				return game
			}
		}
	}
	return nil
}

func (g *Game) AddUser(user *User) error {
	if len(g.Players) >= consts.MaxPlayers {
		return errors.New("game is full")
	}

	if g.State.Phase != WaitingForPlayers {
		return errors.New("game has already started")
	}
	var newTeam types.TeamID

	teamA := 0
	teamB := 0
	for _, player := range g.Players {
		if player.Team == TeamA {
			teamA++
		} else {
			teamB++
		}
	}
	if teamA > teamB {
		newTeam = TeamB
	} else {
		newTeam = TeamA
	}

	player := user.ToPlayer(newTeam)
	g.Players = append(g.Players, player)
	g.LC = true

	return nil
}

func (g *Game) RemovePlayer(userId types.UserID) {
	player := g.GetPlayer(userId)
	for i, p := range g.Players {
		if p == player {
			g.Players = append(g.Players[:i], g.Players[i+1:]...)
			break
		}
	}
	if len(g.Players) == 0 {
		g.Terminate()
	} else if len(g.Players) < 2 {
		g.State.Phase = WaitingForPlayers
		g.State.ScoreA = 0
		g.State.ScoreB = 0
		Clear(&g.State.GameMap)
		if g.Host == userId {
			g.Host = g.Players[0].User.ID
		}
		g.BroadcastSystem(msgs.SYS_MSG_INFO, fmt.Sprintf("%s left the game", player.User.Username))
	}
	g.LC = true
}

func (g *Game) GetPlayer(userId types.UserID) *Player {
	for _, player := range g.Players {
		if player.User.ID == userId {
			return player
		}
	}
	return nil
}

func (g *Game) SwitchTeams(userId types.UserID) error {
	if g.Started() {
		return errors.New("game has already started")
	}

	player := g.GetPlayer(userId)
	if player == nil {
		return errors.New("player not found")
	}

	if player.Team == TeamA {
		player.Team = TeamB
	} else {
		player.Team = TeamA
	}
	g.LC = true

	return nil
}

func (g *Game) Start(userId types.UserID) error {
	if g.Started() {
		return errors.New("game has already started")
	}

	if g.Host != userId {
		return errors.New("only the host can start the game")
	}

	if len(g.Players) < 2 {
		return errors.New("need at least 2 players to start the game")
	}

	teamA := 0
	teamB := 0

	for _, player := range g.Players {
		if player.Team == TeamA {
			teamA++
		} else {
			teamB++
		}
	}

	if teamA == 0 || teamB == 0 {
		return errors.New("need at least one player on each team")
	}

	if g.State.Phase == WaitingForPlayers { // First game
		Clear(&g.State.GameMap)
	} else {
		g.State = *NewGameState(consts.MapWidth, consts.MapHeight)
	}

	g.BroadcastMap()

	g.State.Phase = GettingReady
	g.StartedAt = time.Now().Add(consts.ReadyDuration)
	g.LC = true

	go g.actuallyStart()

	for _, player := range g.Players {
		for {
			px := RandMN(0, g.State.GameMap.Width)
			py := RandMN(0, g.State.GameMap.Height)
			if Get(&g.State.GameMap, px, py) != WallTile {
				player.Pos.X = float32(px)
				player.Pos.Y = float32(py)
				player.Vel.X = 0
				player.Vel.Y = 0
				break
			}
		}
	}

	return nil
}

func (g *Game) actuallyStart() {
	g.BroadcastSystem(msgs.SYS_MSG_INFO, fmt.Sprintf("Game starting in %d seconds...", int(consts.ReadyDuration.Seconds())))
	time.Sleep(time.Until(g.StartedAt))
	if g.State.Phase != GettingReady {
		return
	}
	g.State.Phase = Playing
	g.BroadcastSystem(msgs.SYS_MSG_INFO, "Game started!")
	g.LC = true
}

func (g *Game) MovePlayer(userId types.UserID, direction string, start bool) {
	if g.State.Phase != Playing {
		return
	}
	player := g.GetPlayer(userId)
	if player != nil {
		player.Move(direction, start)
	}
}

func (g *Game) HoldUserWeapon(userId types.UserID) {
	if g.State.Phase != Playing {
		return
	}
	player := g.GetPlayer(userId)
	if player != nil {
		player.Weapon.Hold()
	}
}

func (g *Game) ReleaseUserWeapon(userId types.UserID) {
	if g.State.Phase != Playing {
		return
	}
	player := g.GetPlayer(userId)
	if player != nil {
		player.Weapon.Release()
	}
}

func (g *Game) AimUserTo(userId types.UserID, dx, dy int32) {
	if !g.Started() {
		return
	}
	player := g.GetPlayer(userId)
	if player != nil {
		player.AimTo(dx, dy)
	}
}

func (g Game) RoomMessage() msgs.RoomMessage {
	return msgs.RoomMessage{
		Host:    g.Host,
		Room:    g.Room,
		Players: g.Players.RoomMessage(),
	}
}

func (g *Game) Update() []types.CellResult {
	if !g.Started() {
		return []types.CellResult{}
	}

	gameMap := g.State.GameMap

	currentProjectiles := append([]types.Projectile(nil), g.Projectiles...)
	g.Projectiles = g.Projectiles[:0]

	cells := make([]types.CellResult, 0)
	for _, projectile := range currentProjectiles {
		attacked := projectile.Update()
		if projectile.IsAlive() {
			g.Projectiles = append(g.Projectiles, projectile)
		}

		cells = slices.Grow(cells, len(attacked))
		for _, tile := range attacked {
			x, y := tile.X, tile.Y
			tile := Get(&g.State.GameMap, x, y)
			if tile == WallTile {
				continue
			}

			switch tile {
			case TeamATile:
				g.State.ScoreA--
			case TeamBTile:
				g.State.ScoreB--
			}

			var newTile types.Tile
			switch projectile.Team() {
			case TeamA:
				newTile = TeamATile
				g.State.ScoreA++
			case TeamB:
				newTile = TeamBTile
				g.State.ScoreB++
			}
			Set(&g.State.GameMap, x, y, newTile)

			cells = append(cells, types.CellResult{
				X:     x,
				Y:     y,
				State: newTile,
			})
		}
	}

	for _, player := range g.Players {
		player.Update(&gameMap)
		g.Projectiles = append(g.Projectiles, player.Weapon.Update()...)
	}

	if time.Since(g.StartedAt) > consts.GameDuration {
		g.Finish()
	}

	return cells
}

func (g *Game) Finish() {
	g.State.Phase = GameOver
	for _, player := range g.Players {
		player.Reset()
	}
	g.BroadcastSystem(msgs.SYS_MSG_INFO, "Game over")
	g.LC = true
}

func (g *Game) Terminate() {
	for i, game := range Games {
		if game == g {
			Games = append(Games[:i], Games[i+1:]...)
			break
		}
	}
}

func (g *Game) Broadcast(message msgs.ServerMessage, exclude ...types.UserID) {
	b, _ := message.Buffer()
	buf := b.Bytes()

PlayerLoop:
	for _, player := range g.Players {
		for _, ex := range exclude {
			if player.User.ID == ex {
				continue PlayerLoop
			}
		}
		player.User.Send(buf)
	}
}

func (g *Game) BroadcastMap(exclude ...types.UserID) {
	g.Broadcast(msgs.MapMessage{
		Map: g.State.GameMap,
	})
}

func (g *Game) BroadcastState(exclude ...types.UserID) {
	at := g.StartedAt.UnixMilli()
	m := at % 1000
	s := int32((at - m) / 1000)
	g.Broadcast(msgs.StateMessage{
		StartedAt: types.NetworkTime{
			Sec:   s,
			Milli: int16(m),
		},
		State: types.StateMessageState{
			ScoreA: int32(g.State.ScoreA),
			ScoreB: int32(g.State.ScoreB),
			Phase:  g.State.Phase,
		},
		Players:     g.Players.StateMessage(),
		Projectiles: g.Projectiles,
	})
}

func (g *Game) BroadcastSystem(msgType uint8, msg string, exclude ...types.UserID) {
	mapped := msgs.SystemMessage{
		Type:    msgs.SYS_MSG_INFO,
		Message: msg,
	}
	b, ok := mapped.Buffer()

	if !ok {
		fmt.Println("Failed to marshal system message")
	}
	buf := b.Bytes()

PlayerLoop:
	for _, player := range g.Players {
		for _, ex := range exclude {
			if player.User.ID == ex {
				continue PlayerLoop
			}
		}
		player.User.Send(buf)
	}
}

func (g *Game) Started() bool {
	return g.State.Phase == GettingReady || g.State.Phase == Playing
}
