import { makeEnum } from "./utils.js";

export const WeaponTypes = makeEnum([
    "WEAPON_GUN",
    "WEAPON_BOMB",
])

export const Weapons = {
    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} color 
     * @param {number} cw map cell width
     * @param {number} ch map cell height
     * @param {{x: number, y: number}} pc player center
     * @param {number} theta player direction
     */
    [WeaponTypes.WEAPON_GUN]: {
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
    [WeaponTypes.WEAPON_BOMB]: {
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
