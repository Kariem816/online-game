import type { Point, Rect } from "./geometry";

export default class Collision {
    static pointRect(p: Point, r: Rect): boolean {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }
    static rectRect(r1: Rect, r2: Rect): boolean {
        return (r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }
}