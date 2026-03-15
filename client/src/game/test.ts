import { TWeapon, WeaponsCount, theme } from "../consts";
import { Weapons } from "../weapons";

const ROWS = 2;

type TestFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const weaponIconScene: TestFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
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
        drawIcon(ctx, c1, c2, x, y, cellSz, cellSz);
    }
}

export function run(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        alert("Failed to get canvas context");
        return;
    }

    weaponIconScene(ctx, canvas.width, canvas.height);
}