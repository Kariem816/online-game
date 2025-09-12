import { TWeapon } from "./consts";

type TWeapons = {
    [key in TWeapon]: {
        draw: (ctx: CanvasRenderingContext2D, color: string, cw: number, ch: number, pc: { x: number, y: number }, theta: number) => void
    }
}

export const Weapons: TWeapons = {
    [TWeapon.WEAPON_GUN]: {
        draw: (ctx, color, cw, ch, pc, theta) => {
            const spx = pc.x * cw; // center of the player in canvas coordinates
            const spy = pc.y * ch; // center of the player in canvas coordinates

            const stickLen = ch;
            const epx = spx + stickLen * Math.cos(theta);
            const epy = spy + stickLen * Math.sin(theta);

            // draw line from (spx, spy) to (epx, epy)
            ctx.strokeStyle = color;
            ctx.lineWidth = 15

            ctx.beginPath();
            ctx.moveTo(spx, spy);
            ctx.lineTo(epx, epy);
            ctx.stroke();
        }
    },
    [TWeapon.WEAPON_BOMB]: {
        draw: (ctx, color, cw, ch, pc, theta) => {
            const spx = pc.x * cw; // center of the player in canvas coordinates
            const spy = pc.y * ch; // center of the player in canvas coordinates

            const stickLen = ch;
            const epx = spx + stickLen * Math.cos(theta);
            const epy = spy + stickLen * Math.sin(theta);

            // draw line from (spx, spy) to (epx, epy)
            ctx.fillStyle = color;

            ctx.beginPath();
            ctx.arc(epx, epy, ch / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    },
};
