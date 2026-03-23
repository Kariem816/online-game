import { Animation, AnimationManager } from "../animations";
import type { Rect, Size } from "../geometry";
import { clamp } from "../utils";

export class Camera {
    private readonly duration = 250; // ms
    private readonly minZoom = 1;
    private readonly maxZoom = 7;
    private readonly zoomFactor = 1.5;

    private animationManager: AnimationManager;
    private x: Animation;
    private y: Animation;
    private zoom: Animation;
    private fullView: Rect;


    constructor(fullView: Rect, startX: number, startY: number, startZoom: number, ar: Size = { w: 1, h: 1 }) {
        const maxSide = Math.max(ar.w, ar.h);
        this.fullView = {
            x: fullView.x,
            y: fullView.y,
            w: fullView.w * ar.w / maxSide,
            h: fullView.h * ar.h / maxSide,
        };
        this.animationManager = new AnimationManager();
        this.x = new Animation(clamp(startX, fullView.x, fullView.x + fullView.w));
        this.y = new Animation(clamp(startY, fullView.y, fullView.y + fullView.h));      this.y = new Animation(startY);
        this.zoom = new Animation(clamp(startZoom, this.minZoom, this.maxZoom));

        this.animationManager.add(this.x);
        this.animationManager.add(this.y);
        this.animationManager.add(this.zoom);
    }

    setFullView(fullView: Rect, ar: Size = { w: 1, h: 1 }) {
        const maxSide = Math.max(ar.w, ar.h);
        this.fullView = {
            x: fullView.x,
            y: fullView.y,
            w: fullView.w * ar.w / maxSide,
            h: fullView.h * ar.h / maxSide,
        };
    }

    update(dt: number) {
        this.animationManager.update(dt);
    }

    focusOn(x: number, y: number) {
        const targetX = clamp(x, this.fullView.x, this.fullView.x + this.fullView.w);
        const targetY = clamp(y, this.fullView.y, this.fullView.y + this.fullView.h);

        this.x.setTarget(targetX, this.duration);
        this.y.setTarget(targetY, this.duration);
    }

    focusOnIm(x: number, y: number) {
        const targetX = clamp(x, this.fullView.x, this.fullView.x + this.fullView.w);
        const targetY = clamp(y, this.fullView.y, this.fullView.y + this.fullView.h);

        this.x.value = targetX;
        this.y.value = targetY;
    }

    zoomIn() {
        const targetZoom = clamp(this.zoom.value * this.zoomFactor, this.minZoom, this.maxZoom);
        this.zoom.setTarget(targetZoom, this.duration);
    }

    zoomOut() {
        const targetZoom = clamp(this.zoom.value / this.zoomFactor, this.minZoom, this.maxZoom);
        this.zoom.setTarget(targetZoom, this.duration);
    }

    get rect(): Rect {
        const zoomedW = this.fullView.w / this.zoom.value;
        const zoomedH = this.fullView.h / this.zoom.value;

        return {
            x: clamp(this.x.value - (zoomedW / 2), this.fullView.x, this.fullView.x + this.fullView.w - zoomedW),
            y: clamp(this.y.value - (zoomedH / 2), this.fullView.y, this.fullView.y + this.fullView.h - zoomedH),
            w: zoomedW,
            h: zoomedH,
        };
    }
}