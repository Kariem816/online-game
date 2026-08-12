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

    getAround(x0: number, y0: number, x1: number, y1: number) {
        const tl = this.getTile(x0, y0);
        const tr = this.getTile(x1, y0);
        const bl = this.getTile(x0, y1);
        const br = this.getTile(x1, y1);
        return { tl, tr, bl, br };
    }
}
