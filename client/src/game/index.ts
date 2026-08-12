import Input, { Mouse } from "../input";
import GameMap from "../map";
import { Weapons } from "../weapons";
import { Camera } from "./camera";
import { clamp, copyText } from "../utils";
import { appendSystemMessage } from "../chat";
import { Messages, SystemMessageType, type CellResult, type WelcomeMessage, type MapMessage, type StateMessage, type GameSettings, type RoomMessage } from "../msgs";
import { theme } from "../consts";
import { Team, TWeapon } from "../consts";
import Collision from "../collision";
import type { Point, Rect } from "../geometry";
import type Network from "../network";

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

    fpsCounter = false;
    fps: number = 0;

    input: Input;

    gameState: StateMessage;
    roomState?: RoomMessage;
    map: GameMap;
    camera: Camera;

    settings: GameSettings;

    myData: Omit<WelcomeMessage, "settings">;

    private gameStarted = false;
    private gameJustStarted = false;
    private gameJustEnded = false;

    constructor(private network: Network, private renderer: HTMLCanvasElement, extras: GameExtras) {
        this.ctx = renderer.getContext("2d")!; // shouldn't fail ?!

        this.input = new Input(renderer);

        this.gameState = { players: [], state: { phase: GamePhases.WaitingForPlayers, scoreA: 0, scoreB: 0 }, projectiles: [] };
        this.map = new GameMap();
        this.camera = new Camera({ x: 0, y: 0, w: 0, h: 0 }, 0, 0, 1);
        this.network.send(Messages.MSG_QUERY);

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

    onLockChangeAlert() {
        if (document.pointerLockElement === this.renderer) {
            this.input.addListeners();
        } else {
            this.input.removeListeners();
        }
    }

    hasGameStarted() {
        return this.gameState.state.phase === GamePhases.GettingReady || this.gameState.state.phase === GamePhases.Playing;
    }

    onStateUpdate(state: StateMessage) {
        this.gameState = state;
        this.isServerUpdated = true;
        this.network.send(Messages.MSG_QUERY);
        const gameStarted = this.hasGameStarted();
        if (gameStarted && !this.gameStarted) {
            this.gameJustStarted = true;
            this.gameStarted = true;
        } else if (!gameStarted && this.gameStarted) {
            this.gameJustEnded = true;
            this.gameStarted = false;
        } else if (this.gameJustStarted) {
            this.gameJustStarted = false;
        } else if (this.gameJustEnded) {
            this.gameJustEnded = false;
        }
    }

    onRoomQuery(room: RoomMessage) {
        this.roomState = room;
    }

    onMapUpdate(map: MapMessage) {
        this.map = GameMap.fromMapMessage(map);
        this.camera.setFullView({ x: 0, y: 0, w: this.map.width, h: this.map.height });
    }

    onShot(cells: CellResult[]) {
        this.map.setTiles(cells);
    }

    canvasToGameCoords({ x, y }: Point) {
        const { width: canvasWidth, height: canvasHeight } = this.renderer;
        const wOffset = canvasWidth * 0.05;
        const wRest = canvasWidth - wOffset;
        const hOffset = canvasHeight * 0.1;
        const hRest = canvasHeight - hOffset;

        const { x: mapX, y: mapY, w: mapWidth, h: mapHeight } = this.camera.rect;

        const gx = mapX + (Math.max(wOffset, x) - wOffset) * mapWidth / (wRest - wOffset);
        const gy = mapY + (Math.max(hOffset, y) - hOffset) * mapHeight / hRest;

        return { x: gx, y: gy };
    }

    createGameCoordsToCanvasFn() {
        const { width: canvasWidth, height: canvasHeight } = this.renderer;
        const wOffset = canvasWidth * 0.05;
        const wRest = canvasWidth - wOffset;
        const hOffset = canvasHeight * 0.1;
        const hRest = canvasHeight - hOffset;

        const { x: mapX, y: mapY, w: mapWidth, h: mapHeight } = this.camera.rect;

        const widthR = wRest / mapWidth;
        const heightR = hRest / mapHeight;

        return ({ x, y }: Point) => {

            const gx = (x * widthR) + wOffset - mapX;
            const gy = (y * heightR) + hOffset - mapY;

            return { x: gx, y: gy };
        };
    }

    getMyPlayer() {
        return this.gameState.players.find((p) => p.id === this.myData.id)!;
    }

    update(dt: number) {
        const me = this.getMyPlayer();

        this.fps = calcFPS(dt);

        // Players State
        if (this.gameState.state.phase === GamePhases.Playing && !this.isServerUpdated) {
            for (const player of this.gameState.players) {
                let newX = player.x + player.vx * dt * this.settings.playerSpeed;
                let newY = player.y + player.vy * dt * this.settings.playerSpeed;

                const yTop = Math.floor(player.y);
                const yBottom = Math.floor(player.y + 1 - 1e-4);

                const xL = Math.floor(newX);
                const xR = Math.floor(newX + 1 - 1e-4);
                const { tl, tr, bl, br } = this.map.getAround(xL, yTop, xR, yBottom);

                if (player.vx > 0 && (tr === Tiles.WallTile || br === Tiles.WallTile)) {
                    newX = Math.floor(newX);
                } else if (player.vx < 0 && (tl === Tiles.WallTile || bl === Tiles.WallTile)) {
                    newX = Math.ceil(newX);
                }

                const xLeft = Math.floor(newX);
                const xRight = Math.floor(newX + 1 - 1e-4);
                const yT = Math.floor(newY);
                const yB = Math.floor(newY + 1 - 1e-4);
                const { tl: tl2, tr: tr2, bl: bl2, br: br2 } = this.map.getAround(xLeft, yT, xRight, yB);

                if (player.vy > 0 && (bl2 === Tiles.WallTile || br2 === Tiles.WallTile)) {
                    newY = Math.floor(newY);
                } else if (player.vy < 0 && (tl2 === Tiles.WallTile || tr2 === Tiles.WallTile)) {
                    newY = Math.ceil(newY);
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
            for (const proj of this.gameState.projectiles) {
                const polarV = { r: Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy), theta: Math.atan2(proj.vy, proj.vx) };
                polarV.r = clamp(polarV.r - proj.acc * dt, 0, polarV.r);
                proj.vx = polarV.r * Math.cos(polarV.theta);
                proj.vy = polarV.r * Math.sin(polarV.theta);

                proj.x += proj.vx * dt;
                proj.y += proj.vy * dt;
            }
        } else {
            this.isServerUpdated = false;
        }

        // Camera
        this.camera.focusOn(me.x, me.y);
        if (this.gameJustStarted) {
            this.camera.focusOnIm(me.x, me.y);
        }
        this.camera.update(dt);

        // Input
        this.input.update();
        const network = this.network;

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

        if (this.gameState.state.phase === GamePhases.Playing) {
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
            if (this.input.isMousePressed(Mouse.Left)) {
                network.send(Messages.MSG_MOUSEPRESS);
            }
            if (this.input.isMouseReleased(Mouse.Left)) {
                network.send(Messages.MSG_MOUSERELEASE);
            }
        }

        if (this.gameState.state.phase === GamePhases.GettingReady || this.gameState.state.phase === GamePhases.Playing) {
            // Aiming
            const gameCoords = this.canvasToGameCoords(this.input.getMousePosition());
            network.send(Messages.MSG_MOUSEMOVE, gameCoords);

            // map zoom
            const wheel = this.input.getWheelDelta();
            if (wheel !== 0) {
                if (wheel > 0) {
                    this.camera.zoomOut();
                } else {
                    this.camera.zoomIn();
                }
            }
        }

        if (this.gameState.state.phase === GamePhases.WaitingForPlayers || this.gameState.state.phase === GamePhases.GameOver) {
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
            console.log({ state: this.gameState, serverUpdated: this.isServerUpdated });
        }
        if (this.input.isKeyReleased("KeyF")) {
            this.fpsCounter = !this.fpsCounter;
        }
    }

    render() {
        const { width: rendererWidth, height: rendererHeight } = this.renderer;
        const wOffset = rendererWidth * 0.05;
        const wRest = rendererWidth - wOffset;
        const hOffset = rendererHeight * 0.1;
        const hRest = rendererHeight - hOffset;
        const teamAColor = theme.colors.teamA;
        const teamBColor = theme.colors.teamB;
        const me = this.getMyPlayer();

        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Bars
        this.ctx.fillStyle = theme.colors.background;
        this.ctx.fillRect(0, 0, rendererWidth, rendererHeight);

        // Top Left Corner
        if (this.roomState && this.input.isMouseOver({ x: 0, y: 0, w: wOffset * 2, h: hOffset })) {
            this.ctx.fillStyle = theme.colors.backgroundHighlight;
            this.ctx.fillRect(0, 0, wOffset * 2, hOffset);
            if (this.input.isMouseReleased(Mouse.Left)) {
                copyText(this.roomState.room);
                appendSystemMessage(SystemMessageType.SYS_MSG_INFO, "Copied room code to clipboard");
            }
        }
        this.ctx.fillStyle = theme.colors.foreground;
        this.ctx.font = "30px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(this.roomState?.room || "", wOffset, hOffset / 2, wOffset - 16);

        // Top bar
        let timeLeft: number;
        if (this.gameState.state.phase === GamePhases.Playing || this.gameState.state.phase === GamePhases.GettingReady) {
            const start = this.gameState.startedAt?.getTime() ?? 0;
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
        } else if (this.gameState.state.phase === GamePhases.GameOver) {
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
        const teamA = this.gameState.players.filter((p) => p.team === Team.TeamA);
        const teamB = this.gameState.players.filter((p) => p.team === Team.TeamB);
        let playerNameOverlay: { rect: Rect; text: string; team: Team } | null = null;
        // Team A
        this.ctx.fillStyle = teamAColor;
        let end = middle - (timerWidth / 2) - padding;
        this.ctx.fillText(this.gameState.state.scoreA.toString(), end - scoreWidth / 2, hOffset / 2);
        end -= scoreWidth + padding;
        for (const player of teamA) {
            const isMe = player.id === this.myData.id;
            const bb = { x: end - padding - scoreWidth, y: padding / 2, w: playerSize, h: playerSize };
            Weapons[player.weapon].drawIcon(this.ctx, bb, [theme.colors.teamA, theme.colors[isMe ? "warning" : "foreground"]]);
            // render player name
            if (this.roomState && this.input.isMouseOver(bb)) {
                playerNameOverlay = {
                    text: this.getUsername(player.id),
                    team: Team.TeamA,
                    rect: bb,
                };
            }
            end -= playerSize + padding;
        }

        // Team B
        this.ctx.fillStyle = teamBColor;
        let start = middle + (timerWidth / 2) + padding;
        this.ctx.fillText(this.gameState.state.scoreB.toString(), start + scoreWidth / 2, hOffset / 2);
        start += scoreWidth + padding;
        for (const player of teamB) {
            const isMe = player.id === this.myData.id;
            const bb = { x: start, y: padding / 2, w: playerSize, h: playerSize };
            Weapons[player.weapon].drawIcon(this.ctx, bb, [theme.colors.teamB, theme.colors[isMe ? "warning" : "foreground"]]);
            // render player name
            if (!playerNameOverlay && this.roomState && this.input.isMouseOver(bb)) {
                playerNameOverlay = {
                    text: this.getUsername(player.id),
                    team: Team.TeamB,
                    rect: bb,
                };
            }
            start += playerSize + padding;
        }

        if (playerNameOverlay) {
            const username = playerNameOverlay.text;
            const textWidth = this.ctx.measureText(username).width;
            const bb = playerNameOverlay.rect;

            this.ctx.strokeStyle = theme.colors.foreground;
            this.ctx.lineWidth = 2;
            this.ctx.fillStyle = theme.colors.backgroundHighlight;

            this.ctx.beginPath();
            this.ctx.roundRect(bb.x + (bb.w - textWidth - padding) / 2, bb.y, textWidth + padding, bb.h, bb.w * 0.1);
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.fillStyle = playerNameOverlay.team === Team.TeamA ? theme.colors.teamA : theme.colors.teamB;
            this.ctx.fillText(username, bb.x + (bb.w) / 2, hOffset / 2);
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
        if (this.gameStarted) {
            this.ctx.save();

            const renderRect = this.camera.rect;
            const mapWidth = renderRect.w;
            const mapHeight = renderRect.h;
            const cellWidth = Math.floor((wRest - wOffset) / mapWidth);
            const mapWidthOffset = wOffset / cellWidth - renderRect.x;
            const cellHeight = Math.floor(hRest / mapHeight);
            const mapHeightOffset = hOffset / cellHeight - renderRect.y;

            // calculate the range of tiles to render based on the camera rect
            this.ctx.beginPath();
            this.ctx.rect(wOffset, hOffset, wRest - wOffset, hRest);
            this.ctx.clip();

            for (let ry = Math.floor(renderRect.y); ry < mapHeight + renderRect.y; ry++) {
                for (let rx = Math.floor(renderRect.x); rx < mapWidth + renderRect.x; rx++) {
                    const x = rx + mapWidthOffset;
                    const y = ry + mapHeightOffset;

                    const tile = this.map.getTile(rx, ry);
                    switch (tile) {
                        case Tiles.EmptyTile: {
                            // Empty
                        } break;
                        case Tiles.TeamATile: {
                            this.ctx.fillStyle = theme.colors.tileA;
                        } break;
                        case Tiles.TeamBTile: {
                            this.ctx.fillStyle = theme.colors.tileB;
                        } break;
                        case Tiles.WallTile: {
                            this.ctx.fillStyle = theme.colors.tileWall;
                        } break;
                    }

                    if (tile !== Tiles.EmptyTile) {
                        this.ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    }
                }
            }

            // Render players
            for (const player of this.gameState.players) {
                const x = player.x + mapWidthOffset;
                const y = player.y + mapHeightOffset;
                const color = theme.colors[player.team === Team.TeamA ? "teamA" : "teamB"];

                const ringColor = player.id === this.roomState?.host ?
                    theme.colors.warning : theme.colors.foreground;
                const withRing = player.id === this.roomState?.host || player.id === this.myData.id;

                // player
                this.ctx.fillStyle = color;
                const startX = Math.max(wOffset, x * cellWidth);
                const startY = Math.max(hOffset, y * cellHeight);
                const endX = Math.min(rendererWidth - wOffset, (x + 1) * cellWidth);
                const endY = Math.min(rendererHeight, (y + 1) * cellHeight);
                this.ctx.fillRect(startX, startY, endX - startX, endY - startY);

                // ring
                if (withRing) {
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.rect(startX, startY, endX - startX, endY - startY);
                    this.ctx.clip();

                    this.ctx.strokeStyle = ringColor;
                    this.ctx.lineWidth = 0.2 * cellWidth; // TODO: this will cause issues if cellWidth !== cellHeight
                    this.ctx.beginPath();
                    this.ctx.moveTo((x + 0.1) * cellWidth, (y + 0.1) * cellHeight);
                    this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.1) * cellHeight);
                    this.ctx.lineTo((x + 0.9) * cellWidth, (y + 0.9) * cellHeight);
                    this.ctx.lineTo((x + 0.1) * cellWidth, (y + 0.9) * cellHeight);
                    this.ctx.closePath();
                    this.ctx.stroke();

                    this.ctx.restore();
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
                    { w: cellWidth, h: cellHeight },
                    { pos: { x: (x + 0.5) * cellWidth, y: (y + 0.5) * cellHeight }, theta: player.theta },
                    theme.colors.foreground
                );
            }

            for (const projectile of this.gameState.projectiles) {
                const x = projectile.x + mapWidthOffset;
                const y = projectile.y + mapHeightOffset;
                const color = theme.colors[projectile.team === Team.TeamA ? "teamA" : "teamB"];

                this.ctx.beginPath();
                this.ctx.arc((x + 0.5) * cellWidth, (y + 0.5) * cellHeight, 0.2 * cellWidth, 0, 2 * Math.PI);
                this.ctx.fillStyle = color;
                this.ctx.fill();
            }

            if (this.gameState.state.phase === GamePhases.GettingReady) {
                const x = (me.x + mapWidthOffset + 0.5) * cellWidth;
                const y = (me.y + mapHeightOffset + 0.5) * cellHeight;
                const playerBB = { x: x - cellWidth / 2, y: y - cellHeight / 2, w: cellWidth, h: cellHeight };

                const secs = Math.max(Math.floor((timeLeft! - this.settings.gameLength) / 1000), 0);
                const text = "Get ready! " + secs;
                const textMetrics = this.ctx.measureText(text);
                const halfTextWidth = textMetrics.width / 2;
                const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
                const bb = {
                    x: clamp(x - halfTextWidth - padding / 2, wOffset, rendererWidth - wOffset - textMetrics.width - padding),
                    y: clamp(y - padding / 2, hOffset, rendererHeight - textHeight - padding),
                    w: textMetrics.width + padding,
                    h: textHeight + padding,
                }
                // check if the text box is overlapping with the player, if so, move it up
                if (Collision.rectRect(bb, playerBB)) {
                    // check where to move the text box, up or down, based on which side has more space
                    const spaceAbove = playerBB.y - hOffset;
                    const spaceBelow = hRest - spaceAbove - playerBB.h;
                    if (spaceBelow > bb.h) {
                        bb.y = playerBB.y + bb.h;
                    } else if (spaceAbove > bb.h) {
                        bb.y = playerBB.y - playerBB.h;
                    }
                }

                if (Collision.rectRect(bb, playerBB)) {
                    const spaceLeft = playerBB.x - wOffset;
                    const spaceRight = wRest - spaceLeft - playerBB.w;
                    if (spaceRight > bb.w) {
                        bb.x = playerBB.x + playerBB.w;
                    } else if (spaceLeft > bb.w) {
                        bb.x = playerBB.x - bb.w;
                    }
                }


                // text frame
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = theme.colors.foreground;
                this.ctx.fillStyle = theme.colors.backgroundHighlight;
                this.ctx.beginPath();
                this.ctx.roundRect(bb.x, bb.y, bb.w, bb.h, 10);
                this.ctx.fill();
                this.ctx.stroke();

                // text
                this.ctx.textAlign = "center";
                this.ctx.textBaseline = "top";
                this.ctx.fillStyle = theme.colors.foreground;
                this.ctx.fillText(text,
                    bb.x + bb.w / 2,
                    bb.y + (bb.h - textHeight) / 2
                );
            }

            this.ctx.restore();
        } else {
            this.ctx.fillStyle = theme.colors.foreground;
            this.ctx.font = "60px Arial";
            switch (this.gameState.state.phase) {
                case GamePhases.WaitingForPlayers: {
                    this.ctx.fillText("Waiting for players", rendererWidth / 2, hOffset + hRest / 2);
                } break;
                case GamePhases.GameOver: {
                    let winner = "It's a Tie";
                    this.ctx.fillStyle = theme.colors.foreground;
                    if (this.gameState.state.scoreA > this.gameState.state.scoreB) {
                        winner = "Team A Wins";
                        this.ctx.fillStyle = theme.colors.teamA;
                    } else if (this.gameState.state.scoreA < this.gameState.state.scoreB) {
                        winner = "Team B Wins";
                        this.ctx.fillStyle = theme.colors.teamB;
                    }
                    this.ctx.fillText(winner, rendererWidth / 2, hOffset + hRest / 2);
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
        if (this.roomState) {
            for (const player of this.gameState.players) {
                if (player.id === id) {
                    return this.roomState.players.find((u) => u.id === id)?.username || "Unknown";
                }
            }
        }
        return "Unknown";
    }
}
