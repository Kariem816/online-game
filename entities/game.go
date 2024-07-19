package entities

import (
	"math/rand"
)

type Game struct {
	Players Players   `json:"players"`
	State   GameState `json:"state"`
	Host    *Player   `json:"host"`
	Room    string    `json:"room"`
}

var Games = []*Game{}

func NewGame(host *User) string {
	// room is a random string
	room := ""
	for i := 0; i < 4; i++ {
		room += string(rune(65 + rand.Intn(26)))
	}
	player := host.ToPlayer()
	game := &Game{
		Players: Players{
			player,
		},
		State: GameState{},
		Host:  player,
		Room:  room,
	}
	Games = append(Games, game)
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

func FindUserInfo(userId string) *Game {
	for _, game := range Games {
		for _, player := range game.Players {
			if player.User.ID == userId {
				return game
			}
		}
	}
	return nil
}

func (g *Game) Stringify() map[string]interface{} {
	gameMap := map[string]interface{}{
		"players": g.Players.Stringify(),
		"state":   g.State.Stringify(),
		"host":    g.Host.Stringify(),
		"room":    g.Room,
	}

	return gameMap
}

func (g *Game) AddPlayer(player *Player) {
	g.Players = append(g.Players, player)
}

func (g *Game) RemovePlayer(userId string) {
	for i, p := range g.Players {
		if p.User.ID == userId {
			g.Players = append(g.Players[:i], g.Players[i+1:]...)
			break
		}
	}
	if len(g.Players) == 0 {
		g.Finish()
	} else if g.Host.User.ID == userId {
		g.Host = g.Players[0]
	}
}

func (g *Game) Finish() {
	for i, game := range Games {
		if game == g {
			Games = append(Games[:i], Games[i+1:]...)
			break
		}
	}
}
