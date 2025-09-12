export default class GameMap {
    constructor() {
        this.tiles = [];
        this.width = 0;
        this.height = 0;
    }

    static fromMapMessage(msg) {
        const map = new GameMap();
        map.width = msg.width;
        map.height = msg.height;
        map.tiles = msg.tiles;
        return map;
    }

    setTiles(tiles) {
        for (const { x, y, state } of tiles) {
            this.tiles[y * this.width + x] = state;
        }
    }

    getTileByIndex(i) {
        return this.tiles[i];
    }

    getAround(x, y) {
        const tile = this.tiles[y * this.width + x];
        const bottom = this.tiles[(y + 1) * this.width + x];
        const right = this.tiles[y * this.width + x + 1];
        const bottomRight = this.tiles[(y + 1) * this.width + x + 1];
        return { tile, bottom, right, bottomRight };
    }
}
