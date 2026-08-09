import { Tile } from "./consts";
import type { CellResult, MapMessage } from "./msgs";

export default class GameMap {
    tiles: number[];
    width: number;
    height: number;

    constructor() {
        this.tiles = [];
        this.width = 0;
        this.height = 0;
    }

    static fromMapMessage(msg: MapMessage) {
        const map = new GameMap();
        map.width = msg.width;
        map.height = msg.height;
        map.tiles = msg.tiles;
        return map;
    }

    setTiles(tiles: CellResult[]) {
        for (const { x, y, state } of tiles) {
            this.tiles[y * this.width + x] = state;
        }
    }

    getTile(x: number, y: number) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return Tile.Wall;
        }
        return this.tiles[y * this.width + x];
    }
    
    getTileByIndex(i: number) {
        return this.tiles[i];
    }

    getAround(x: number, y: number) {
        const tile = this.getTile(x, y);
        const bottom = this.getTile(x, y + 1);
        const right = this.getTile(x + 1, y);
        const bottomRight = this.getTile(x + 1, y + 1);
        return { tile, bottom, right, bottomRight };
    }
}
