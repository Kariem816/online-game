import type { Point, Rect, Size } from "../geometry";

export type DrawWeaponFn = (ctx: CanvasRenderingContext2D, cellSize: Size, player: { pos: Point, theta: number }, colors: string) => void;
export function createDrawFn(width: number, height: number, centerX: number, centerY: number, path: string): DrawWeaponFn {
    const path2d = new Path2D(path);
    return (ctx: CanvasRenderingContext2D, cellSize: Size, player: { pos: Point, theta: number }, color: string) => {
        const scalar = Math.max(width, height) * 1.1;

        ctx.save();

        ctx.translate(player.pos.x, player.pos.y);
        ctx.scale(cellSize.w / scalar, cellSize.h / scalar);
        ctx.rotate(player.theta);
        const reversed = Math.abs(player.theta) > Math.PI / 2;
        if (reversed) {
            ctx.rotate(-Math.PI);
            ctx.scale(-1, 1);
        }
        ctx.translate(-centerX, -centerY);
        ctx.fillStyle = color;
        ctx.fill(path2d);

        ctx.restore();
    };
}

export type DrawProjFn = (ctx: CanvasRenderingContext2D, pos: Point, vel: Point, radius: number, color: string) => void;

export type DrawIconFn = (ctx: CanvasRenderingContext2D, rect: Rect, colors: [string, string]) => void;
export function createDrawIconFn(width: number, height: number, path: string): DrawIconFn {
    const path2d = new Path2D(path);
    return (ctx: CanvasRenderingContext2D, { x, y, w, h }: Rect, [color1, color2]: [string, string]) => {
        ctx.save();

        ctx.translate(x, y);
        ctx.strokeStyle = color2;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, w * 0.1);
        ctx.stroke();

        const scalar = Math.max(width, height) * 1.1;
        const paddingX = scalar - width;
        const paddingY = scalar - height;
        ctx.scale(w / scalar, h / scalar);

        ctx.fillStyle = color1;
        ctx.translate(paddingX / 2, paddingY / 2);
        ctx.fill(path2d);

        ctx.restore();
    };
}