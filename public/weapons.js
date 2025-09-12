const Weapons = enumJS([
    "WEAPON_GUN",
    "WEAPON_BOMB",
])

const DrawWeapon = {
    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} color 
     * @param {number} cw map cell width
     * @param {number} ch map cell height
     * @param {{x: number, y: number}} pc player center
     * @param {number} theta player direction
     */
    [Weapons.WEAPON_GUN]: (ctx, color, cw, ch, pc, theta) => {
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
    },
    [Weapons.WEAPON_BOMB]: (ctx, color, cw, ch, pc, theta) => {
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
    },
}
