package msgs

import (
	"bytes"
	"encoding/binary"
	"online-game/types"
	"online-game/weapons"

	"github.com/gofiber/fiber/v2/log"
)

type ServerMessage interface {
	Buffer() (*bytes.Buffer, bool)
}

type GenericMessage struct {
	Type uint8
	Args []byte
}

type ConnectedMessage struct {
	ID       types.UserID
	Username string
}

type HostMessage struct{}
type HostedMessage struct {
	Room string
}

type JoinMessage struct {
	Room string
}
type JoinedMessage struct {
	Room string
}

type LeaveMessage struct{}
type LeftMessage struct{}

type StartMessage struct{}
type StartedMessage struct{}

type TeamMessage struct{}

type WeaponMessage struct {
	Weapon weapons.WeaponID
}

type MoveMessage struct {
	Up    bool
	Down  bool
	Right bool
	Left  bool
	Start bool
}
type MovedMessage struct{}

type ShootMessage struct{}

// TODO: maybe introduce a new structure to hold cells for separation of concerns
type ShotMessage struct {
	Cells []types.CellResult
}

type ChatMessage struct {
	Message string
}
type ChattedMessage struct {
	Message string
	From    types.UserID
}

type MapMessage struct {
	Map types.GameMap
}

type StateMessage struct {
	Host      types.UserID
	Room      string
	StartedAt types.NetworkTime
	State     types.StateMessageState
	Players   []types.StateMessagePlayer
}

type MouseMessage struct {
	DX int32

	DY int32
}

type SystemMessage struct {
	Type    uint8
	Message string
}
type ErrorMessage struct {
	Message string
}

const (
	MSG_CNCT    uint8 = iota
	MSG_HOST    uint8 = iota
	MSG_HOSTED  uint8 = iota
	MSG_JOIN    uint8 = iota
	MSG_JOINED  uint8 = iota
	MSG_LEAVE   uint8 = iota
	MSG_LEFT    uint8 = iota
	MSG_START   uint8 = iota
	MSG_STARTED uint8 = iota
	MSG_TEAM    uint8 = iota
	MSG_TEAMED  uint8 = iota
	MSG_WEAPON  uint8 = iota
	MSG_MOVE    uint8 = iota
	MSG_MOVED   uint8 = iota
	MSG_SHOOT   uint8 = iota
	MSG_SHOT    uint8 = iota
	MSG_CHAT    uint8 = iota
	MSG_CHATTED uint8 = iota
	MSG_MAP     uint8 = iota
	MSG_STATE   uint8 = iota
	MSG_MOUSE   uint8 = iota
	MSG_SYSTEM  uint8 = iota
	MSG_ERROR   uint8 = iota
	MSG_LEN     uint8 = iota
)

const (
	SYS_MSG_INFO uint8 = iota
)

type MessageError int8

const (
	MessageNoError     MessageError = iota
	MessageTooShort    MessageError = iota
	MessageInvalidType MessageError = iota
)

func ParseMessage(buf []byte) (GenericMessage, MessageError) {
	if len(buf) < 1 {
		return GenericMessage{}, MessageTooShort
	}

	t := buf[0]
	if t >= MSG_LEN {
		return GenericMessage{}, MessageInvalidType
	}

	return GenericMessage{
		Type: t,
		Args: buf[1:],
	}, MessageNoError
}

func (cm ConnectedMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{}
	buf.WriteByte(MSG_CNCT)
	// binary.Write(buf, binary.LittleEndian, cm)
	binary.Write(buf, binary.LittleEndian, cm.ID)
	buf.WriteByte(uint8(len(cm.Username)))
	buf.WriteString(cm.Username)

	return buf, true
}

func (hm *HostMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_HOST {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

func (hm HostedMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{} // type[1] room[4]
	buf.WriteByte(MSG_HOSTED)
	buf.WriteString(hm.Room[:4])

	return buf, true
}

func (jm *JoinMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_JOIN {
		return false
	}

	if len(gm.Args) != 4 {
		return false
	}

	jm.Room = string(gm.Args)
	return true
}

func (jm JoinedMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{}
	buf.WriteByte(MSG_JOINED)
	buf.WriteString(jm.Room[:4])

	return buf, true
}

func (lm *LeaveMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_LEAVE {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

func (lm LeftMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{}
	buf.WriteByte(MSG_LEFT)

	return buf, true
}

func (sm *StartMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_START {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

// func (sm StartedMessage) Buffer() (*bytes.Buffer, bool) {

// }

func (tm *TeamMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_TEAM {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

// func (tm TeamedMessage) Buffer() (*bytes.Buffer, bool) {

// }

func (wm *WeaponMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_WEAPON {
		return false
	}

	if len(gm.Args) != 1 {
		return false
	}

	messageWeapon := gm.Args[0]
	if messageWeapon >= uint8(weapons.WEAPON_COUNT) {
		return false
	}

	wm.Weapon = weapons.WeaponID(gm.Args[0])

	return true
}

func (mm *MoveMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_MOVE {
		return false
	}

	if len(gm.Args) != 1 {
		return false
	}

	flags := gm.Args[0]

	mm.Up = (flags & (1 << 0)) > 0
	mm.Down = (flags & (1 << 1)) > 0
	mm.Left = (flags & (1 << 2)) > 0
	mm.Right = (flags & (1 << 3)) > 0
	mm.Start = (flags & (1 << 4)) > 0

	return true
}

// func (mm MovedMessage) Buffer() (*bytes.Buffer, bool) {

// }

func (sm *ShootMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_SHOOT {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

func (sm ShotMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{}

	l := len(sm.Cells)
	if l > 255 {
		log.Fatalf("WTF have you done? updating %d cells at the same time", l)
	}
	buf.WriteByte(MSG_SHOT)
	buf.WriteByte(uint8(l))
	for _, c := range sm.Cells {
		binary.Write(buf, binary.LittleEndian, c.X)
		binary.Write(buf, binary.LittleEndian, c.Y)
		buf.WriteByte(byte(c.State))
	}

	return buf, true
}

func (cm *ChatMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_CHAT {
		return false
	}

	if len(gm.Args) < 2 || len(gm.Args) > 256 {
		return false
	}

	sz := gm.Args[0]
	str := string(gm.Args[1 : sz+1])
	cm.Message = str

	return true
}

func (cm ChattedMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{}
	buf.WriteByte(MSG_CHATTED)
	binary.Write(buf, binary.LittleEndian, cm.From)
	binary.Write(buf, binary.LittleEndian, uint8(len(cm.Message)))
	buf.WriteString(cm.Message)

	return buf, true
}

func (mm MapMessage) Buffer() (*bytes.Buffer, bool) {
	buf := new(bytes.Buffer)

	buf.WriteByte(MSG_MAP)
	binary.Write(buf, binary.LittleEndian, int32(mm.Map.Width))
	binary.Write(buf, binary.LittleEndian, int32(mm.Map.Height))
	binary.Write(buf, binary.LittleEndian, mm.Map.Tiles)

	return buf, true
}

func (sm StateMessage) Buffer() (*bytes.Buffer, bool) {
	buf := new(bytes.Buffer)

	buf.WriteByte(MSG_STATE)
	binary.Write(buf, binary.LittleEndian, sm.Host)
	if len(sm.Room) != 4 {
		return nil, false
	}
	buf.WriteString(sm.Room)
	binary.Write(buf, binary.LittleEndian, sm.StartedAt.Sec)
	binary.Write(buf, binary.LittleEndian, sm.StartedAt.Milli)
	binary.Write(buf, binary.LittleEndian, sm.State.TeamA)
	binary.Write(buf, binary.LittleEndian, sm.State.TeamB)
	binary.Write(buf, binary.LittleEndian, sm.State.ScoreA)
	binary.Write(buf, binary.LittleEndian, sm.State.ScoreB)
	buf.WriteByte(byte(sm.State.Phase))
	buf.WriteByte(uint8(len(sm.Players)))

	for _, player := range sm.Players {
		binary.Write(buf, binary.LittleEndian, player.User.ID)
		binary.Write(buf, binary.LittleEndian, player.Team)
		binary.Write(buf, binary.LittleEndian, player.Weapon)
		player.Pos.Write(buf)
		player.Vel.Write(buf)
		binary.Write(buf, binary.LittleEndian, player.Theta)
		binary.Write(buf, binary.LittleEndian, player.Cooldown)
		binary.Write(buf, binary.LittleEndian, uint8(len(player.User.Username)))
		buf.WriteString(player.User.Username)
	}

	return buf, true
}

func (mm *MouseMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_MOUSE {
		return false
	}

	if len(gm.Args) != 8 {
		return false
	}

	reader := bytes.NewReader(gm.Args)
	binary.Read(reader, binary.LittleEndian, &mm.DX)
	binary.Read(reader, binary.LittleEndian, &mm.DY)

	return true
}

func (sm SystemMessage) Buffer() (*bytes.Buffer, bool) {
	sz := len(sm.Message)
	if sz > 255 {
		return nil, false
	}

	buf := &bytes.Buffer{}

	buf.WriteByte(MSG_SYSTEM)
	buf.WriteByte(sm.Type)
	buf.WriteByte(uint8(sz))
	buf.WriteString(sm.Message)

	return buf, true
}

func (em ErrorMessage) Buffer() (*bytes.Buffer, bool) {
	sz := len(em.Message)
	if sz > 255 {
		return nil, false
	}

	buf := &bytes.Buffer{}

	buf.WriteByte(MSG_ERROR)
	buf.WriteByte(uint8(sz))
	buf.WriteString(em.Message)

	return buf, true
}
