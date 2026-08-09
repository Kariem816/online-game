package consts

import "time"

const (
	MAP_DIVISIONS = 6
	ROOM_PADDING  = 2
)

const TickRate = 30
const GameTick = time.Millisecond * 1000 / TickRate
const MapTick = TickRate * 5 // every 5 seconds

const MaxPlayers = 8
const GameDuration = 90 * time.Second
const ReadyDuration = 3500 * time.Millisecond
const PlayerSpeed = 10.0

const MapWidth = 48
const MapHeight = 27
