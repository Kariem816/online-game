import type { Point, Rect } from "./geometry";

export default class Collision {
    static pointRect(p: Point, r: Rect) {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }
}