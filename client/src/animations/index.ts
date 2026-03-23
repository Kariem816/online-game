interface Animatable {
    value: () => number;
    from: (x: number) => void;
}

export class AnimatableNumber implements Animatable {
    private _value: number;

    constructor(initialValue: number) {
        this._value = initialValue;
    }

    value() {
        return this._value;
    }

    from(x: number) {
        this._value = x;
    }
}

type AnimatableInitializer = number | Animatable;
// TODO: allow animating other types (e.g. vectors)
export class Animation {
    private _value: Animatable;
    private _target: Animatable;
    private _progress: number;
    private _duration: number;

    constructor(initialValue: AnimatableInitializer) {
        if (typeof initialValue === "number") {
            this._value = new AnimatableNumber(initialValue);
            this._target = new AnimatableNumber(initialValue);
        } else {
            this._value = initialValue;
            this._target = initialValue;
        }
        this._duration = 0;
        this._progress = 0;
    }

    setTarget(target: AnimatableInitializer, duration: number) {
        this._target = typeof target === "number" ? new AnimatableNumber(target) : target;
        this._duration = duration;
    }

    update(dt: number) {
        if (this._progress < this._duration) {
            this._progress += dt;
            const t = this._progress / this._duration;
            // TODO: add customizable easing functions
            this._value.from((this._target.value() - this._value.value()) * t + this._value.value());
        } else {
            this._value.from(this._target.value());
        }
    }

    get value(): number {
        return this._value.value();
    }

    set value(newValue: Animatable | number) {
        if (typeof newValue === "number") {
            this._value.from(newValue);
        } else {
            this._value = newValue;
        }
        this._progress = this._duration; // Mark as completed
    }
}

export class AnimationManager {
    private animations: Animation[] = [];

    add(animation: Animation) {
        this.animations.push(animation);
    }

    remove(animation: Animation): boolean {
        const index = this.animations.indexOf(animation);
        if (index !== -1) {
            this.animations.splice(index, 1);
            return true;
        }
        return false;
    }

    update(dt: number) {
        for (const anim of this.animations) {
            anim.update(dt);
        }
    }
}