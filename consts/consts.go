package consts

import "time"

const (
	MAP_DIVISIONS = 6
	ROOM_PADDING  = 2
	TEAM_A_COLOR  = 0x6C946F
	TEAM_B_COLOR  = 0xDC0083
)

const TickRate = 30
const GameTick = time.Millisecond * 1000 / TickRate
const MapTick = TickRate * 5 // every 5 seconds

const MaxPlayers = 8
const GameDuration = 60 * time.Second
const PlayerSpeed = 10

const MapWidth = 48
const MapHeight = 27
