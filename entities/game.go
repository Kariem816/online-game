package entities

import (
	"errors"
	"fmt"
	"math/rand"
	"online-game/consts"
	"online-game/msgs"
	"online-game/omath"
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

	player := host.ToPlayer(types.TeamA)
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

	if g.Started() {
		return errors.New("game has already started")
	}
	var newTeam types.TeamID

	teamA := 0
	teamB := 0
	for _, player := range g.Players {
		if player.Team == types.TeamA {
			teamA++
		} else {
			teamB++
		}
	}
	if teamA > teamB {
		newTeam = types.TeamB
	} else {
		newTeam = types.TeamA
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
		g.State.Phase = types.PhaseAwaitingPlayers
		g.State.ScoreA = 0
		g.State.ScoreB = 0
		g.State.GameMap.Clear()
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

	if player.Team == types.TeamA {
		player.Team = types.TeamB
		player.Weapon.SetTeam(types.TeamB)
	} else {
		player.Team = types.TeamA
		player.Weapon.SetTeam(types.TeamA)
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
		if player.Team == types.TeamA {
			teamA++
		} else {
			teamB++
		}
	}

	if teamA == 0 || teamB == 0 {
		return errors.New("need at least one player on each team")
	}

	if g.State.Phase == types.PhaseAwaitingPlayers { // First game
		g.State.GameMap.Clear()
	} else {
		g.State = *NewGameState(consts.MapWidth, consts.MapHeight)
	}

	g.BroadcastMap()

	g.State.Phase = types.PhaseGetReady
	g.StartedAt = time.Now().Add(consts.ReadyDuration)
	g.LC = true

	go g.actuallyStart()

	for _, player := range g.Players {
		for {
			px := omath.RandMN(0, g.State.GameMap.Width)
			py := omath.RandMN(0, g.State.GameMap.Height)
			if g.State.GameMap.Get(px, py) != types.TileWall {
				player.Pos.X = float32(px)
				player.Pos.Y = float32(py)
				break
			}
		}
	}

	clear(g.Projectiles)
	g.Projectiles = g.Projectiles[:0]

	return nil
}

func (g *Game) actuallyStart() {
	g.BroadcastSystem(msgs.SYS_MSG_INFO, fmt.Sprintf("Game starting in %d seconds...", int(consts.ReadyDuration.Seconds())))
	time.Sleep(time.Until(g.StartedAt))
	if g.State.Phase != types.PhaseGetReady {
		return
	}
	g.State.Phase = types.PhasePlaying
	g.BroadcastSystem(msgs.SYS_MSG_INFO, "Game started!")
	g.LC = true
}

func (g *Game) MovePlayer(userId types.UserID, direction string, start bool) {
	player := g.GetPlayer(userId)
	if player != nil {
		player.Move(direction, start)
	}
}

func (g *Game) HoldUserWeapon(userId types.UserID) {
	player := g.GetPlayer(userId)
	if player != nil {
		player.Weapon.Hold()
	}
}

func (g *Game) ReleaseUserWeapon(userId types.UserID) {
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

func (g *Game) Update() []types.TileResult {
	if g.State.Phase != types.PhasePlaying {
		return nil
	}

	gameMap := &g.State.GameMap

	currentProjectiles := append([]types.Projectile(nil), g.Projectiles...)
	g.Projectiles = g.Projectiles[:0]

	cells := make([]types.TileResult, 0)
	for _, projectile := range currentProjectiles {
		attacked := projectile.Update(gameMap)
		if projectile.IsAlive() {
			g.Projectiles = append(g.Projectiles, projectile)
		}

		cells = slices.Grow(cells, len(attacked))
		for _, tile := range attacked {
			if tile.X < 0 || tile.X >= g.State.GameMap.Width || tile.Y < 0 || tile.Y >= g.State.GameMap.Height {
				continue
			}
			x := tile.X
			y := tile.Y
			oldTile := g.State.GameMap.Get(x, y)
			newTile := tile.Tile
			if oldTile == newTile {
				continue
			}

			switch oldTile {
			case types.TileTeamA:
				g.State.ScoreA--
			case types.TileTeamB:
				g.State.ScoreB--
			}

			switch newTile {
			case types.TileTeamA:
				g.State.ScoreA++
			case types.TileTeamB:
				g.State.ScoreB++
			}
			g.State.GameMap.Set(x, y, newTile)

			cells = append(cells, tile)
		}
	}

	for _, player := range g.Players {
		player.Update(gameMap)
		g.Projectiles = append(g.Projectiles, player.Weapon.Update()...)
	}

	if time.Since(g.StartedAt) > consts.GameDuration {
		g.Finish()
	}

	return cells
}

func (g *Game) Finish() {
	g.State.Phase = types.PhaseGameOver
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
	return g.State.Phase == types.PhaseGetReady || g.State.Phase == types.PhasePlaying
}
