package types

import (
	"online-game/consts"
	"online-game/omath"

	"github.com/chewxy/math32"
)

type GameMap struct {
	Width  int32
	Height int32
	Tiles  []Tile
}

func (m *GameMap) Get(x, y int32) Tile {
	if x < 0 || x >= m.Width || y < 0 || y >= m.Height {
		return TileWall
	}

	return m.Tiles[y*m.Width+x]
}

func (m *GameMap) GetAround(x0, y0, x1, y1 int32) (topLeft, topRight, bottomLeft, bottomRight Tile) {
	topLeft = m.Get(x0, y0)
	topRight = m.Get(x1, y0)
	bottomLeft = m.Get(x0, y1)
	bottomRight = m.Get(x1, y1)
	return
}

func (m *GameMap) HasWall(x, y float32) bool {
	xInt := int32(math32.Floor(x))
	yInt := int32(math32.Floor(y))

	return m.Get(xInt, yInt) == TileWall
}

func (m *GameMap) Set(x, y int32, tile Tile) {
	if x < 0 || x >= m.Width || y < 0 || y >= m.Height {
		return
	}

	m.Tiles[y*m.Width+x] = tile
}

func (m *GameMap) Clear() {
	for i := range m.Tiles {
		if m.Tiles[i] != TileWall {
			m.Tiles[i] = TileEmpty
		}
	}
}

func (m *GameMap) GenerateWalls(divisions int) {
	m.GenerateWallsInRange(0, 0, m.Width-1, m.Height-1, divisions)
}

func (m *GameMap) GenerateWallsInRange(x1, y1, x2, y2 int32, divisions int) {
	// use BSP to generate walls
	if divisions == 0 {
		return
	}

	width := x2 - x1
	height := y2 - y1

	if width < 2*consts.ROOM_PADDING+1 || height < 2*consts.ROOM_PADDING+1 {
		return
	}

	dir := omath.RandMN(0, 2) // 0: horizontal, 1: vertical
	px := omath.RandMN(x1+consts.ROOM_PADDING, x2-consts.ROOM_PADDING)
	py := omath.RandMN(y1+consts.ROOM_PADDING, y2-consts.ROOM_PADDING)

	if dir == 0 { // horizontal
		// draw a horizontal line
		for x := x1 + consts.ROOM_PADDING; x <= x2-consts.ROOM_PADDING; x++ {
			m.Set(x, py, TileWall)
		}
		// divide the map into two parts
		m.GenerateWallsInRange(x1, y1, x2, py-1, divisions-1)
		m.GenerateWallsInRange(x1, py+1, x2, y2, divisions-1)
	} else { // vertical
		// draw a vertical line
		for y := y1 + consts.ROOM_PADDING; y <= y2-consts.ROOM_PADDING; y++ {
			m.Set(px, y, TileWall)
		}
		// divide the map into two parts
		m.GenerateWallsInRange(x1, y1, px-1, y2, divisions-1)
		m.GenerateWallsInRange(px+1, y1, x2, y2, divisions-1)
	}
}
