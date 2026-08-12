package msgs

import (
	"bytes"
	"encoding/binary"
	"online-game/types"
	"online-game/weapons"

	"github.com/gofiber/fiber/v3/log"
)

type ServerMessage interface {
	Buffer() (*bytes.Buffer, bool)
}

type GenericMessage struct {
	Type uint8
	Args []byte
}

type WelcomeMessage struct {
	ID       types.UserID
	Username string
	Settings *types.GameSettings
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
	Weapon types.WeaponID
}

type MoveMessage struct {
	Up    bool
	Down  bool
	Right bool
	Left  bool
	Start bool
}
type MovedMessage struct{}

type MousePressMessage struct{}
type MouseReleaseMessage struct{}
type MouseMoveMessage struct {
	DX int32
	DY int32
}
type ShotMessage struct {
	Cells []types.TileResult
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
	StartedAt   types.NetworkTime
	State       types.StateMessageState
	Players     []types.StateMessagePlayer
	Projectiles []types.Projectile
}

// TODO: we only support querying room info
type QueryMessage struct{}

type RoomMessage struct {
	Host    types.UserID
	Room    string
	Players []types.RoomMessagePlayer
}

type SystemMessage struct {
	Type    uint8
	Message string
}
type ErrorMessage struct {
	Message string
}

const (
	MSG_WLCM uint8 = iota
	MSG_HOST
	MSG_HOSTED
	MSG_JOIN
	MSG_JOINED
	MSG_LEAVE
	MSG_LEFT
	MSG_START
	MSG_STARTED
	MSG_TEAM
	MSG_TEAMED
	MSG_WEAPON
	MSG_MOVE
	MSG_MOVED
	MSG_MOUSEPRESS
	MSG_MOUSERELEASE
	MSG_MOUSEMOVE
	MSG_SHOT
	MSG_CHAT
	MSG_CHATTED
	MSG_MAP
	MSG_STATE
	MSG_QUERY
	MSG_ROOM
	MSG_SYSTEM
	MSG_ERROR
	MSG_LEN
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

func (wm WelcomeMessage) Buffer() (*bytes.Buffer, bool) {
	buf := &bytes.Buffer{}
	buf.WriteByte(MSG_WLCM)

	binary.Write(buf, binary.LittleEndian, wm.ID)
	buf.WriteByte(uint8(len(wm.Username)))
	buf.WriteString(wm.Username)
	binary.Write(buf, binary.LittleEndian, wm.Settings.GameLength)
	binary.Write(buf, binary.LittleEndian, wm.Settings.MovementSpeed)
	buf.WriteByte(uint8(len(wm.Settings.Weapons)))
	for _, w := range wm.Settings.Weapons {
		binary.Write(buf, binary.LittleEndian, w.ID)
		binary.Write(buf, binary.LittleEndian, w.Cooldown)
		binary.Write(buf, binary.LittleEndian, w.Range)
		binary.Write(buf, binary.LittleEndian, uint8(len(w.Name)))
		buf.WriteString(w.Name)
	}

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

func (tm *TeamMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_TEAM {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

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

	wm.Weapon = types.WeaponID(gm.Args[0])

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

func (mp *MousePressMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_MOUSEPRESS {
		return false
	}

	if len(gm.Args) != 0 {
		return false
	}

	return true
}

func (mr *MouseReleaseMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_MOUSERELEASE {
		return false
	}

	if len(gm.Args) != 0 {
		return false
	}

	return true
}

func (mm *MouseMoveMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_MOUSEMOVE {
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
		buf.WriteByte(byte(c.Tile))
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
	binary.Write(buf, binary.LittleEndian, sm.StartedAt.Sec)
	binary.Write(buf, binary.LittleEndian, sm.StartedAt.Milli)
	binary.Write(buf, binary.LittleEndian, sm.State.ScoreA)
	binary.Write(buf, binary.LittleEndian, sm.State.ScoreB)
	buf.WriteByte(byte(sm.State.Phase))
	buf.WriteByte(uint8(len(sm.Players)))

	for _, player := range sm.Players {
		binary.Write(buf, binary.LittleEndian, player.ID)
		buf.WriteByte(byte(player.Team))
		buf.WriteByte(byte(player.Weapon))
		player.Pos.Write(buf, binary.LittleEndian)
		player.Vel.Write(buf, binary.LittleEndian)
		binary.Write(buf, binary.LittleEndian, player.Theta)
		binary.Write(buf, binary.LittleEndian, player.Cooldown)
	}

	buf.WriteByte(uint8(len(sm.Projectiles)))
	for i, projectile := range sm.Projectiles {
		if i >= 255 {
			log.Warnf("Too many projectiles to send in state message: %d", len(sm.Projectiles))
			break
		}
		projBuf, _ := projectile.Serialize(binary.LittleEndian)
		buf.Write(projBuf)
	}

	return buf, true
}

func (qm *QueryMessage) Parse(gm GenericMessage) bool {
	if gm.Type != MSG_QUERY {
		return false
	}

	if len(gm.Args) > 0 {
		return false
	}

	return true
}

func (rm RoomMessage) Buffer() (*bytes.Buffer, bool) {
	buf := new(bytes.Buffer)

	buf.WriteByte(MSG_ROOM)
	binary.Write(buf, binary.LittleEndian, rm.Host)
	buf.WriteByte(byte(len(rm.Room)))
	buf.WriteString(rm.Room)
	buf.WriteByte(uint8(len(rm.Players)))

	for _, player := range rm.Players {
		binary.Write(buf, binary.LittleEndian, player.ID)
		buf.WriteByte(byte(player.Team))
		buf.WriteByte(byte(len(player.Username)))
		buf.WriteString(player.Username)
	}

	return buf, true
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
