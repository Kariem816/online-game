const Weapons = enumJS({}, [
    "WEAPON_GUN",
])

const DrawWeapon = {
    [Weapons.WEAPON_GUN]: (ctx, x, y, w, h) => {
        ctx.fillStyle = "tomato";
        ctx.fillRect(x, y, w, h);
        if (highlight) {
            ctx.strokeStyle = "white";
            ctx.strokeRect(x, y, w, h);
        }
    }
}