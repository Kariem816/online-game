import { TWeapon } from "./consts";

type TWeapons = {
    [key in TWeapon]: {
        /*
            cw: cell width
            ch: cell height
            pc: player center
        */
        draw: (ctx: CanvasRenderingContext2D, color: string, cw: number, ch: number, pc: { x: number, y: number }, theta: number) => void
        drawIcon: (ctx: CanvasRenderingContext2D, color1: string, color2: string, x: number, y: number, w: number, h: number) => void
    }
}

function drawUnknown(ctx: CanvasRenderingContext2D, color: string, cw: number, ch: number, pc: { x: number, y: number }, theta: number) {
    const spx = pc.x * cw; // center of the player in canvas coordinates
    const spy = pc.y * ch; // center of the player in canvas coordinates

    const stickLen = ch;
    const epx = spx + stickLen * Math.cos(theta);
    const epy = spy + stickLen * Math.sin(theta);

    ctx.fillStyle = color;
    ctx.font = `${ch}px`;
    ctx.fillText("?", epx, epy);
}

function drawIconUnknown(ctx: CanvasRenderingContext2D, color1: string, color2: string, x: number, y: number, w: number, h: number) {
    ctx.save();

    ctx.translate(x, y);
    ctx.strokeStyle = color2;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, w * 0.1);
    ctx.stroke();

    ctx.restore();

    ctx.save();

    ctx.fillStyle = color1;
    ctx.font = `${h*2}px`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", x + w / 2, y + h / 2);

    ctx.restore();
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
        },
        drawIcon: (ctx, color1, color2, x, y, w, h) => {
            ctx.save();

            // https://upload.wikimedia.org/wikipedia/commons/e/ee/Gun_outline.svg
            const svgWidth = 586;
            const svgHeight = 400;
            const svgPath = "M 104 31 L 94.5 41 C 87.8381 48.0125 80.2106 48.5232 70.5 45 C 65.7305 43.2695 60.3654 38.2732 56 42.5 C 51.8416 46.5264 57.7706 49.7775 62 51.5 C 79.3448 58.564 89.1372 68.7571 85 90 C 80.8628 111.2429 66.5078 108.8414 54 111 C 44.6057 112.6213 35.6848 112.5799 31 117 C 21.6913 125.7828 30.3744 135.5729 37 135 C 67.3998 132.3713 92.8049 155.6292 79 186 L 64 219 L 80 220 L 25 346 L 162 364 L 204 214 C 206.8676 203.7585 220.3759 197.4903 231 197 L 296 194 C 309.4723 193.3782 324.6892 181.2872 327 168 L 331 145 C 332.6602 135.4537 343.3109 126.0969 353 126 L 453 125 L 456 120 L 553 119 C 557.6306 118.9523 558.1192 111.2317 560 107 L 564 98 L 564 42 L 555 31 L 330 31 L 320 42 L 265 42 L 258 31 L 104 31 Z M 259.25 131.5 L 291 131.5 C 327.0088 131.5 327.6826 189.5 291 189.5 L 259.25 189.5 C 225.7995 189.5 220.8458 131.5 259.25 131.5 Z M 259.25 133.25 C 222.7158 133.1284 228.8993 188.4569 259.25 187.75 C 245.6192 169.212 244.961 150.906 259.25 133.25 Z";

            ctx.translate(x, y);
            ctx.strokeStyle = color2;
            ctx.beginPath();
            ctx.roundRect(0, 0, w, h, w * 0.1);
            ctx.stroke();

            const scalar = Math.max(svgWidth, svgHeight) + 80;
            const paddingX = scalar - svgWidth;
            const paddingY = scalar - svgHeight;
            ctx.scale(w / scalar, h / scalar);

            ctx.fillStyle = color1;
            ctx.translate(paddingX / 2, paddingY / 2);
            ctx.fill(new Path2D(svgPath));

            ctx.restore();
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
        },
        drawIcon: (ctx, color1, color2, x, y, w, h) => {
            ctx.save();

            const svgWidth = 64;
            const svgHeight = 64;

            ctx.translate(x, y);
            ctx.strokeStyle = color2;
            ctx.beginPath();
            ctx.roundRect(0, 0, w, h, w * 0.1);
            ctx.stroke();

            const scalar = Math.max(svgWidth, svgHeight);
            const paddingX = scalar - svgWidth;
            const paddingY = scalar - svgHeight;
            ctx.scale(w / scalar, h / scalar);

            ctx.fillStyle = color1;
            ctx.translate(paddingX / 2, paddingY / 2);
            ctx.beginPath();
            ctx.arc(32, 35, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.rect(28, 11, 8, 8);
            ctx.fill();

            ctx.restore()
        }
    },
    [TWeapon.WEAPON_SHOTGUN]: {
        draw: drawUnknown,
        drawIcon: drawIconUnknown,
    },
    [TWeapon.WEAPON_UZI]: {
        draw: drawUnknown,
        drawIcon: drawIconUnknown,
    },
};
