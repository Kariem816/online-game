package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"online-game/consts"
	"online-game/entities"
	"online-game/msgs"
	"online-game/types"
	"strings"
	"time"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

func randomName() string {
	first := []string{"The"}
	second := []string{"Fiery", "Icy", "Electric", "Magnetic", "Toxic", "Radioactive", "Mystic", "Dark", "Light", "Wind", "Water", "Earth", "Fire"}
	third := []string{"Chicken", "Duck", "Geese", "Pigeon", "Eagle", "Falcon", "Hawk", "Owl", "Parrot", "Penguin", "Robin", "Sparrow", "Swan", "Turkey"}

	return fmt.Sprintf("%s %s %s", first[rand.Intn(len(first))], second[rand.Intn(len(second))], third[rand.Intn(len(third))])
}

func UpdateState() {
	for _, game := range entities.Games {
		game.Update()
	}
}

func BroadcastState() {
	for _, game := range entities.Games {
		if game.State.Phase != entities.Playing && !game.LC {
			continue
		}
		game.BroadcastState()
		game.LC = false
	}
}

func BroadcastMap() {
	for _, game := range entities.Games {
		if game.State.Phase != entities.Playing {
			continue
		}

		game.BroadcastMap()
	}
}

func updateMap(game *entities.Game, cells []types.CellResult) {
	msg := msgs.ShotMessage{
		Cells: cells,
	}
	buf, _ := msg.Buffer()
	by := buf.Bytes()
	for _, player := range game.Players {
		player.User.Send(by)
	}
}

func main() {
	app := fiber.New()

	app.Use(filesystem.New(filesystem.Config{
		Root: http.Dir("./public"),
	}))

	go func() {
		i := 0
		for range time.Tick(consts.GameTick) {
			UpdateState()
			BroadcastState()
			if i%consts.MapTick == 0 {
				BroadcastMap()
			}
			i++
		}
	}()

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		id := types.UserID(rand.Int31() % 65536)
		user := entities.NewUser(c, id, randomName())
		cm := msgs.ConnectedMessage{ID: id, Username: user.Username}
		user.SendMessage(cm)

		// websocket.Conn bindings https://pkg.go.dev/github.com/fasthttp/websocket?tab=doc#pkg-index
		for {
			_, msg, err := c.ReadMessage()
			if err != nil {
				log.Println("read:", err)
				break
			}

			gmsg, merr := msgs.ParseMessage(msg)
			if merr != msgs.MessageNoError {
				log.Println("parsing: Invalid Message", msg)
				break
			}

			game := entities.FindUserInfo(id)

			switch gmsg.Type {
			case msgs.MSG_HOST:
				hm := msgs.HostMessage{}
				ok := hm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseHostMessage", gmsg)
					break
				}
				if game != nil {
					user.Error("You are already in a game")
				} else {
					room := entities.NewGame(user)
					hosted := msgs.HostedMessage{Room: room}
					user.SendMessage(hosted)
				}
			case msgs.MSG_JOIN:
				if game != nil {
					user.Error("You are already in a game")
					continue
				}

				jm := msgs.JoinMessage{}
				ok := jm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseJoinedMessage", gmsg)
					break
				}
				room := strings.ToUpper(jm.Room)
				game = entities.FindGameByRoom(room)
				if game == nil {
					user.Error("Room not found")
				} else {
					err := game.AddUser(user)
					if err != nil {
						user.Error(err.Error())
					} else {
						jm := msgs.JoinedMessage{Room: room}
						user.SendMessage(jm)
						game.BroadcastSystem(msgs.SYS_MSG_INFO, fmt.Sprintf("%s joined the game", user.Username))
					}
				}
			case msgs.MSG_LEAVE:
				lm := msgs.LeaveMessage{}
				ok := lm.Parse(gmsg)
				if !ok {
					log.Fatal("Unreachable: binarize left message")
				}
				game.RemovePlayer(id)
				user.SendMessage(msgs.LeftMessage{})
				game.BroadcastSystem(msgs.SYS_MSG_INFO, fmt.Sprintf("%s left the game", user.Username))
			case msgs.MSG_START:
				if game == nil {
					user.Error("You are not in a game")
					continue
				}

				sm := msgs.StartMessage{}
				ok := sm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseStartMessage", gmsg)
				}

				err := game.Start(id)
				if err != nil {
					user.Error(err.Error())
				}
			case msgs.MSG_TEAM:
				if game == nil {
					user.Error("You are not in a game")
					continue
				}

				tm := msgs.TeamMessage{}
				ok := tm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseTeamMessage", gmsg)
				}

				err := game.SwitchTeams(id)
				if err != nil {
					user.Error(err.Error())
				}
				game.BroadcastSystem(msgs.SYS_MSG_INFO, fmt.Sprintf("%s switched teams", user.Username))
			case msgs.MSG_MOVE:
				if game == nil {
					user.Error("You are not in a game")
					continue
				}
				if game.State.Phase != entities.Playing {
					continue
				}

				mm := msgs.MoveMessage{}
				ok := mm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseMoveMessage", gmsg)
				}

				// Temp code
				direction := ""
				if mm.Up {
					direction = "up"
				} else if mm.Down {
					direction = "down"
				} else if mm.Left {
					direction = "left"
				} else if mm.Right {
					direction = "right"
				} else {
					user.Error("[ERROR]: No Direction")
					continue
				}
				start := mm.Start
				game.MovePlayer(id, direction, start)
			case msgs.MSG_SHOOT:
				if game == nil {
					user.Error("You are not in a game")
					continue
				}
				if game.State.Phase != entities.Playing {
					continue
				}

				sm := msgs.ShootMessage{}
				ok := sm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseShootMessage", gmsg)
				}

				cells, err := game.Shoot(id)
				if err != nil {
					user.Error(err.Error())
				} else {
					updateMap(game, cells)
				}
			case msgs.MSG_MOUSE:
				if game == nil {
					user.Error("You are not in a game")
					continue
				}
				if game.State.Phase != entities.Playing {
					continue
				}

				mm := msgs.MouseMessage{}
				ok := mm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseMouseMessage", gmsg)
				}

				game.MoveMouse(id, mm.DX, mm.DY)
			case msgs.MSG_CHAT:
				// TODO: Add support for commands
				if game == nil {
					user.Error("You are not in a game")
					continue
				}

				cm := msgs.ChatMessage{}
				ok := cm.Parse(gmsg)
				if !ok {
					log.Println("[ERROR]: ParseChatMessage", gmsg)
				}
				chm := msgs.ChattedMessage{
					Message: cm.Message,
					From:    id,
				}

				game.Broadcast(chm)
			default:
				fmt.Println("Unknown message type", gmsg)
				user.Error("Unknown message type")
			}
		}

		c.Close()
		user.Cleanup()
	}))

	log.Fatal(app.Listen(":3000"))
}
