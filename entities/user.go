package entities

import (
	"online-game/msgs"
	"online-game/types"
	"online-game/weapons"
	"sync"

	"github.com/gofiber/contrib/v3/websocket"
)

type User struct {
	ID       types.UserID
	Username string
	C        *websocket.Conn
	mu       sync.Mutex
}

var Users = map[types.UserID]*User{}

func NewUser(c *websocket.Conn, id types.UserID, username string) *User {
	user := &User{
		ID:       id,
		Username: username,
		C:        c,
	}
	Users[id] = user
	return user
}

func (u *User) Send(msg []byte) error {
	u.mu.Lock()
	defer u.mu.Unlock()
	return u.C.WriteMessage(websocket.BinaryMessage, msg)
}

func (u *User) SendMessage(msg msgs.ServerMessage) error {
	buf, ok := msg.Buffer()
	if !ok {
		return nil
	}
	return u.Send(buf.Bytes())
}

func (u *User) Error(message string) {
	em := msgs.ErrorMessage{Message: message}
	u.SendMessage(em)
}

func (u *User) ToPlayer(team types.TeamID) *Player {
	return &Player{
		User:   u,
		Team:   team,
		Weapon: weapons.NewGun(team),
	}
}

func (u *User) Cleanup() {
	game := FindUserInfo(u.ID)
	if game != nil {
		game.RemovePlayer(u.ID)
	}
	delete(Users, u.ID)
}
