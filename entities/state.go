package entities

import (
	"math/rand"
	"online-game/consts"
	"online-game/types"
)

func NewGameState(width, height int32) *types.GameState {
	gameMap := types.GameMap{
		Width:  width,
		Height: height,
		Tiles:  make([]types.Tile, height*width),
	}

	// Fill the map with empty tiles
	for i := range gameMap.Tiles {
		gameMap.Tiles[i] = types.TileEmpty
	}

	// walls
	gameMap.GenerateWalls(consts.MAP_DIVISIONS)

	return &types.GameState{
		GameMap: gameMap,
		Phase:   types.PhaseAwaitingPlayers,
	}
}

func RandomGameState(width, height int32) *types.GameState {
	gameState := NewGameState(width, height)

	// TODO: why though
	// Fill the map with random team tiles
	for i, tile := range gameState.GameMap.Tiles {
		if tile != types.TileWall && rand.Intn(100) < 50 {
			if rand.Intn(2) == 0 {
				gameState.GameMap.Tiles[i] = types.TileTeamA
			} else {
				gameState.GameMap.Tiles[i] = types.TileTeamB
			}
		}
	}

	return gameState
}
