import Input, { Mouse } from "../input.js";
import GameMap from "../map.js";
import { Weapons } from "../weapons.js";
import { copyText } from "../utils.js";
import { appendSystemMessage } from "../chat.js";
import { Messages, SystemMessageType, type CellResult, type WelcomeMessage, type MapMessage, type StateMessage, type GameSettings } from "../msgs";
import { theme } from "../consts.js";
import { Team, TWeapon } from "../consts.js";
import type { Point } from "../geometry.js";
import type Network from "../network/index";

// Game States
enum GamePhases {
    WaitingForPlayers,
    GettingReady,
    Playing,
    GameOver,
};

// Tile Types
enum Tiles {
    EmptyTile,
    TeamATile,
    TeamBTile,
    WallTile,
};

type GameExtras = WelcomeMessage;

const dts: number[] = [];
function calcFPS(dt: number): number {
    if (dts.push(dt) > 100) {
        dts.shift();
    }
    const dtAvg = dts.reduce((acc, dt) => acc + dt, 0) / dts.length;
    return Math.round(1 / dtAvg);
}

export default class Game {
    isServerUpdated = false;

    ctx: CanvasRenderingContext2D;

    debugFrame: boolean;
    fpsCounter = false;
    fps: number = 0;

    input: Input;

    game: StateMessage;
    map: GameMap;

    settings: GameSettings;

    myData: Omit<WelcomeMessage, "settings">;

    constructor(private network: Network, private renderer: HTMLCanvasElement, extras: GameExtras) {
        this.ctx = renderer.getContext("2d")!; // shouldn't fail ?!

        this.debugFrame = false;

        this.input = new Input(renderer);

        this.game = { host: 0, players: [], room: "", state: { phase: GamePhases.WaitingForPlayers, scoreA: 0, scoreB: 0 } };
        this.map = new GameMap();

        const { settings, ...myData } = extras;
        this.settings = settings;
        this.myData = myData;

        renderer.addEventListener("click", this.onClickLockPointer.bind(this));
        document.addEventListener("pointerlockchange", this.onLockChangeAlert.bind(this), false);
    }

    async onClickLockPointer(e: MouseEvent) {
        if (document.pointerLockElement === this.renderer) return;
        await this.renderer.requestPointerLock();
        this.input.setStartPosition(e.offsetX, e.offsetY);
    }

    gameStarted() {
        return this.game.state.phase === GamePhases.GettingReady || this.game.state.phase === GamePhases.Playing;
    }

    onLockChangeAlert() {
        if (document.pointerLockElement === this.renderer) {
            this.input.addListeners();
        } else {
            this.input.removeListeners();
        }
    }

    onStateUpdate(state: StateMessage) {
        this.game = state;
        this.isServerUpdated = true;
    }

    onMapUpdate(map: MapMessage) {
        this.map = GameMap.fromMapMessage(map);
    }

    onShot(cells: CellResult[]) {
        this.map.setTiles(cells);
    }

    canvasToGameCoords({ x, y }: Point) {
        const { width, height } = this.renderer;
        const wOffset = width * 0.05;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;

        const gx = (Math.max(wOffset, x) - wOffset) * this.map.width / (wRest - wOffset);
        const gy = (Math.max(hOffset, y) - hOffset) * this.map.height / hRest;

        return { x: gx, y: gy };
    }

    gameCoordsToCanvas({ x, y }: Point) {
        const { width, height } = this.renderer;
        const wOffset = width * 0.05;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;

        const gx = (x * wRest / this.map.width) + wOffset;
        const gy = (y * hRest / this.map.height) + hOffset;

        return { x: gx, y: gy };
    }

    getMyPlayer() {
        return this.game.players.find((p) => p.user.id === this.myData.id)!;
    }

    update(dt: number) {
        // Logging
        if (this.debugFrame) {
            console.log({ state: this.game, serverUpdated: this.isServerUpdated });
            this.debugFrame = false;
        }

        this.fps = calcFPS(dt);

        // Players State
        if (this.game.state.phase === GamePhases.Playing && !this.isServerUpdated) {
            for (const player of this.game.players) {
                let newX = player.x + player.vx * dt * this.settings.playerSpeed;
                let newY = player.y + player.vy * dt * this.settings.playerSpeed;

                const { tile, bottom, right, bottomRight } = this.map.getAround(Math.floor(newX), Math.floor(newY));
                const cornerX = newX - Math.floor(newX) > 0;
                const cornerY = newY - Math.floor(newY) > 0;

                if (player.vx > 0) {
                    if (right === Tiles.WallTile || (cornerY && bottomRight === Tiles.WallTile)) {
                        newX = Math.floor(newX);
                    }
                }

                if (player.vx < 0) {
                    if (tile === Tiles.WallTile || (cornerY && bottom === Tiles.WallTile)) {
                        newX = Math.ceil(newX);
                    }
                }

                if (player.vy > 0) {
                    if (bottom === Tiles.WallTile || (cornerX && bottomRight === Tiles.WallTile)) {
                        newY = Math.floor(newY);
                    }
                }

                if (player.vy < 0) {
                    if (tile === Tiles.WallTile || (cornerX && right === Tiles.WallTile)) {
                        newY = Math.ceil(newY);
                    }
                }

                player.x = newX;
                player.y = newY;

                if (player.cooldown > 0) {
                    // TODO: consider making player cooldown not a percentage
                    const playerWeapon = this.settings.weapons.find((w) => w.id === player.weapon);
                    if (!playerWeapon) {
                        console.error("Invalid player weapon", player.weapon, this.settings.weapons);
                        continue;
                    }
                    const cooldownTime = player.cooldown * playerWeapon.cooldown / 100 - dt * 1000;
                    player.cooldown = Math.max(0, cooldownTime) / playerWeapon.cooldown * 100;
                }
            }
        } else {
            this.isServerUpdated = false;
        }

        // Input
        this.input.update();
        const network = this.network;

        if (this.game.state.phase === GamePhases.Playing) {
            // Movement
            if (this.input.isKeyPressed("KeyW")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "up",
                    start: true,
                });
            }
            if (this.input.isKeyReleased("KeyW")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "up",
                    start: false,
                });
            }

            if (this.input.isKeyPressed("KeyS")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "down",
                    start: true,
                });
            }
            if (this.input.isKeyReleased("KeyS")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "down",
                    start: false,
                });
            }

            if (this.input.isKeyPressed("KeyA")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "left",
                    start: true,
                });
            }
            if (this.input.isKeyReleased("KeyA")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "left",
                    start: false,
                });
            }

            if (this.input.isKeyPressed("KeyD")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "right",
                    start: true,
                });
            }
            if (this.input.isKeyReleased("KeyD")) {
                network.send(Messages.MSG_MOVE, {
                    direction: "right",
                    start: false,
                });
            }

            // Weapons
            if (this.input.isKeyReleased("Digit1")) {
                network.send(Messages.MSG_WEAPON, {
                    weapon: TWeapon.WEAPON_GUN,
                });
            }
            if (this.input.isKeyReleased("Digit2")) {
                network.send(Messages.MSG_WEAPON, {
                    weapon: TWeapon.WEAPON_ROCKETLAUNCHER,
                });
            }
            if (this.input.isKeyReleased("Digit3")) {
                network.send(Messages.MSG_WEAPON, {
                    weapon: TWeapon.WEAPON_SHOTGUN,
                });
            }
            if (this.input.isKeyReleased("Digit4")) {
                network.send(Messages.MSG_WEAPON, {
                    weapon: TWeapon.WEAPON_UZI,
                });
            }
            if (this.input.isKeyReleased("Digit5")) {
                network.send(Messages.MSG_WEAPON, {
                    weapon: TWeapon.WEAPON_BOMB,
                });
            }

            // Shooting
            if (this.input.isMouseDown(Mouse.Left)) {
                const myPlayer = this.getMyPlayer();
                if (myPlayer.cooldown <= 0) {
                    network.send(Messages.MSG_SHOOT);
                }
            }
        }

        if (this.game.state.phase === GamePhases.GettingReady || this.game.state.phase === GamePhases.Playing) {
            // Aiming
            const gameCoords = this.canvasToGameCoords(this.input.getMousePosition());
            network.send(Messages.MSG_MOUSE, gameCoords);
        }

        if (this.game.state.phase === GamePhases.WaitingForPlayers || this.game.state.phase === GamePhases.GameOver) {
            // Menu
            if (this.input.isKeyReleased("KeyQ")) {
                network.send(Messages.MSG_START);
            }
            if (this.input.isKeyReleased("KeyT")) {
                network.send(Messages.MSG_TEAM);
            }
        }

        // Debug
        if (this.input.isKeyReleased("KeyR")) {
            this.debugFrame = true;
        }
        if (this.input.isKeyReleased("KeyF")) {
            this.fpsCounter = !this.fpsCounter;
        }
    }

    render() {
        const { width, height } = this.renderer;
        const wOffset = width * 0.05;
        const wRest = width - wOffset;
        const hOffset = height * 0.1;
        const hRest = height - hOffset;
        const teamAColor = theme.colors.teamA;
        const teamBColor = theme.colors.teamB;
        const me = this.getMyPlayer();

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Bars
        this.ctx.fillStyle = theme.colors.background;
        this.ctx.fillRect(0, 0, width, height);

        // Top Left Corner
        if (this.input.isMouseOver({ x: 0, y: 0, w: wOffset * 2, h: hOffset })) {
            this.ctx.fillStyle = theme.colors.backgroundHighlight;
            this.ctx.fillRect(0, 0, wOffset * 2, hOffset);
            if (this.input.isMouseReleased(Mouse.Left)) {
                copyText(this.game.room);
                appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Copied room code to clipboard");
            }
        }
        this.ctx.fillStyle = theme.colors.foreground;
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(this.game.room, wOffset, hOffset / 2, wOffset - 16);

        // Top bar
        let timeLeft: number;
        if (this.game.state.phase === GamePhases.Playing || this.game.state.phase === GamePhases.GettingReady) {
            const start = this.game.startedAt?.getTime() ?? 0;
            const now = Date.now();
            timeLeft = this.settings.gameLength - (now - start);
            this.ctx.fillStyle = theme.colors.foreground;
            if (timeLeft < 0) {
                this.ctx.fillText("00:00", wOffset + wRest / 2, hOffset / 2);
            } else {
                const minutes = Math.floor(timeLeft / 1000 / 60).toString().padStart(2, "0");
                const seconds = Math.floor(timeLeft / 1000 % 60).toString().padStart(2, "0");
                this.ctx.fillText(`${minutes}:${seconds}`, wOffset + wRest / 2, hOffset / 2);
            }
        } else if (this.game.state.phase === GamePhases.GameOver) {
            this.ctx.fillStyle = theme.colors.foreground;
            this.ctx.fillText("Time is up", wOffset + wRest / 2, hOffset / 2);
        } else {
            this.ctx.fillStyle = theme.colors.foreground;
            const minutes = Math.floor(this.settings.gameLength / 1000 / 60).toString().padStart(2, "0");
            const seconds = Math.floor(this.settings.gameLength / 1000 % 60).toString().padStart(2, "0");
            this.ctx.fillText(`${minutes}:${seconds}`, wOffset + wRest / 2, hOffset / 2);
        }

        // Sidebar
        const timerWidth = this.ctx.measureText("Time is up").width;
        const padding = 20;
        const middle = wOffset + wRest / 2;
        const scoreWidth = this.ctx.measureText("000").width;
        const playerSize = hOffset - padding;
        const teamA = this.game.players.filter((p) => p.team === Team.TeamA);
        const teamB = this.game.players.filter((p) => p.team === Team.TeamB);

        // Team A
        this.ctx.fillStyle = teamAColor;
        let end = middle - (timerWidth / 2) - padding;
        this.ctx.fillText(this.game.state.scoreA.toString(), end - scoreWidth / 2, hOffset / 2);
        end -= scoreWidth + padding;
        for (const player of teamA) {
            const isMe = player.user.id === this.myData.id;
            Weapons[player.weapon].drawIcon(this.ctx, theme.colors.teamA, theme.colors[isMe ? "warning" : "foreground"], end - padding - scoreWidth, padding / 2, playerSize, playerSize);
            end -= playerSize + padding;
        }

        // Team B
        this.ctx.fillStyle = teamBColor;
        let start = middle + (timerWidth / 2) + padding;
        this.ctx.fillText(this.game.state.scoreB.toString(), start + scoreWidth / 2, hOffset / 2);
        start += scoreWidth + padding;
        for (const player of teamB) {
            const isMe = player.user.id === this.myData.id;
            Weapons[player.weapon].drawIcon(this.ctx, theme.colors.teamB, theme.colors[isMe ? "warning" : "foreground"], start, padding / 2, playerSize, playerSize);
            start += playerSize + padding;
        }

        if (this.fpsCounter) {
            // top right corner
            this.ctx.fillStyle = theme.colors.foreground;
            this.ctx.fillText(`${this.fps}`, wRest + wOffset / 2, hOffset / 2);
        }

        // Map
        this.ctx.fillStyle = theme.colors.backgroundHighlight;
        this.ctx.fillRect(wOffset, hOffset, wRest - wOffset, hRest);

        // Render map
        if (this.gameStarted()) {
            const { width: mapWidth, height: mapHeight } = this.map;
            const cellWidth = Math.floor((wRest - wOffset) / mapWidth);
            const mapWidthOffset = wOffset / cellWidth;
            const cellHeight = Math.floor(hRest / mapHeight);
            const mapHeightOffset = hOffset / cellHeight;

            for (let i = 0; i < mapWidth * mapHeight; i++) {
                const x = (i % mapWidth) + mapWidthOffset;
                const y = Math.floor(i / mapWidth) + mapHeightOffset;

                switch (this.map.getTileByIndex(i)) {
                    case Tiles.EmptyTile: {
                        // Empty
                    } break;
                    case Tiles.TeamATile: {
                        this.ctx.fillStyle = theme.colors.tileA;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                    case Tiles.TeamBTile: {
                        this.ctx.fillStyle = theme.colors.tileB;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                    case Tiles.WallTile: {
                        this.ctx.fillStyle = theme.colors.tileWall;
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    } break;
                }
            }

            // Render players
            for (const player of this.game.players) {
                const x = player.x + mapWidthOffset;
                const y = player.y + mapHeightOffset;
                const color = theme.colors[player.team === Team.TeamA ? "teamA" : "teamB"];

                const ringColor = player.user.id === this.game.host ?
                    theme.colors.warning : theme.colors.foreground;
                const withRing = player.user.id === this.game.host || player.user.id === this.myData.id;

                // ring
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                if (withRing) {
                    this.ctx.strokeStyle = ringColor;
                    this.ctx.lineWidth = 0.2 * cellWidth; // TODO: this will cause issues if cellWidth !== cellHeight
                    this.ctx.beginPath();
                    this.ctx.moveTo((x + 0.1) * cellWidth, (y + 0.1) * cellHeight);
                    this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.1) * cellHeight);
                    this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                    this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                    this.ctx.closePath();
                    this.ctx.stroke();
                }

                // cooldown
                if (player.cooldown > 0) {
                    this.ctx.strokeStyle = theme.colors[player.team === Team.TeamA ? "teamB" : "teamA"];
                    this.ctx.lineWidth = 0.2 * cellWidth; // TODO: this will cause issues if cellWidth !== cellHeight
                    this.ctx.beginPath();

                    let progress = 0;
                    if (player.cooldown <= 100 && player.cooldown > 75) {
                        progress = 0.8 * (player.cooldown - 75) / 25; // 0.8 because the the full line has a length of 0.8
                        this.ctx.moveTo((x + 0.9 - progress) * cellWidth, (y + 0.1) * cellHeight);
                        this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.1) * cellHeight);
                        this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }
                    if (player.cooldown <= 75 && player.cooldown > 50) {
                        progress = 0.8 * (player.cooldown - 50) / 25;
                        this.ctx.moveTo((x + 0.9) * cellWidth, (y + 0.9 - progress) * cellHeight);
                        this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }
                    if (player.cooldown <= 50 && player.cooldown > 25) {
                        progress = 0.8 * (player.cooldown - 25) / 25;
                        this.ctx.moveTo((x + 0.1 + progress) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }
                    if (player.cooldown <= 25) {
                        progress = 0.8 * player.cooldown / 25;
                        this.ctx.moveTo((x + 0.1) * cellWidth, (y + 0.1 + progress) * cellHeight);
                        this.ctx.lineTo((x + 0.1) * cellWidth, y * cellHeight);
                    }

                    this.ctx.stroke();
                }

                // render player weapon
                Weapons[player.weapon].draw(
                    this.ctx,
                    color,
                    cellWidth,
                    cellHeight,
                    { x: x + 0.5, y: y + 0.5 },
                    player.theta,
                );
            }

            if (this.game.state.phase === GamePhases.GettingReady) {
                const x = me.x + mapWidthOffset;
                const y = me.y + mapHeightOffset;
                this.ctx.fillStyle = theme.colors.foreground;
                this.ctx.textAlign = "center";
                const secs = Math.floor((timeLeft! - this.settings.gameLength) / 1000);
                this.ctx.fillText("Get ready! " + secs, (x + 0.5) * cellWidth, (y - 0.5) * cellHeight);
            }
        } else {
            this.ctx.fillStyle = theme.colors.foreground;
            this.ctx.font = "60px Arial";
            switch (this.game.state.phase) {
                case GamePhases.WaitingForPlayers: {
                    this.ctx.fillText("Waiting for players", width / 2, hOffset + hRest / 2);
                } break;
                case GamePhases.GameOver: {
                    const winner = this.game.state.scoreA > this.game.state.scoreB ? "Team A Wins"
                        : this.game.state.scoreA < this.game.state.scoreB ? "Team B Wins" : "It's a Tie";
                    this.ctx.fillText(winner, width / 2, hOffset + hRest / 2);
                } break;
            }
        }

        this.crosshair();
    }

    crosshair() {
        const radius = 10;
        const { x, y } = this.input.getMousePosition();

        this.ctx.fillStyle = theme.colors.backgroundHighlight;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.strokeStyle = theme.colors.teamB;
        this.ctx.lineWidth = 3;
        this.ctx.moveTo(x - radius, y);
        this.ctx.lineTo(x + radius, y);
        this.ctx.moveTo(x, y - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.stroke();

        this.ctx.strokeStyle = theme.colors.foreground;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    getUsername(id: number) {
        for (const player of this.game.players) {
            if (player.user.id === id) {
                return player.user.username;
            }
        }
        return "Unknown";
    }
}
