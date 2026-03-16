import { TWeapon, WeaponsCount, theme } from "../consts";
import Input from "../input";
import { Weapons } from "../weapons";

type TestFn = (ctx: CanvasRenderingContext2D) => void;

// @ts-expect-error TS6133
const weaponIconScene: TestFn = (ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const ROWS = 2;

    const cw = w * 0.9;
    const cwp = w * 0.05;
    const ch = h * 0.9;
    const chp = h * 0.05;

    const cols = Math.ceil(WeaponsCount / ROWS);
    const cellW = cw / cols;
    const cellH = ch / ROWS;
    const cellSz = Math.min(cellW, cellH);
    const padW = (cw - cellSz * cols) / 2 + cwp;
    const padH = (ch - cellSz * ROWS) / 2 + chp;

    const { teamA: c1, teamB: c2 } = theme.colors;

    for (let i = 0; i < WeaponsCount; i++) {
        const weapon = i as TWeapon;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellSz + padW;
        const y = row * cellSz + padH;

        const drawIcon = Weapons[weapon].drawIcon;
        drawIcon(ctx, { x, y, w: cellSz, h: cellSz }, [c1, c2]);
    }
}

const playerWeaponScene: TestFn = (ctx: CanvasRenderingContext2D) => {
    const renderer = ctx.canvas;
    const input = new Input(renderer);
    const onClickLockPointer = async (e: MouseEvent) => {
        if (document.pointerLockElement === renderer) return;
        await renderer.requestPointerLock();
        input.setStartPosition(e.offsetX, e.offsetY);
    };
    const onLockChangeAlert = () => {
        if (document.pointerLockElement === renderer) {
            input.addListeners();
        } else {
            input.removeListeners();
        }
    };
    renderer.addEventListener("click", onClickLockPointer);
    document.addEventListener("pointerlockchange", onLockChangeAlert, false);

    const PLAYER_POS = { x: renderer.width / 2, y: renderer.height / 2 } as const;
    const PLAYER_SIZE = 50;
    const MOUSE_SIZE = 10;
    const CELL_SIZE = 100;
    const LINE_LEN = 300;

    function frame() {
        // update
        input.update();

        // render
        ctx.fillStyle = "black";
        ctx.clearRect(0, 0, renderer.width, renderer.height);
        ctx.fillRect(PLAYER_POS.x - PLAYER_SIZE / 2, PLAYER_POS.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

        const mousePos = input.getMousePosition();
        const theta = Math.atan2(mousePos.y - PLAYER_POS.y, mousePos.x - PLAYER_POS.x);

        ctx.beginPath();
        ctx.moveTo(PLAYER_POS.x, PLAYER_POS.y);
        ctx.lineTo(PLAYER_POS.x+LINE_LEN*Math.cos(theta), PLAYER_POS.y+LINE_LEN*Math.sin(theta));
        ctx.closePath();
        ctx.stroke();
        
        Weapons[TWeapon.WEAPON_SHOTGUN].draw(ctx, { w: CELL_SIZE, h: CELL_SIZE }, { pos: mousePos, theta }, "white");

        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, MOUSE_SIZE, 0, 2*Math.PI);
        ctx.fill();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

export function run(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        alert("Failed to get canvas context");
        return;
    }

    // weaponIconScene(ctx);
    playerWeaponScene(ctx);
}