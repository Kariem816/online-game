export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function clamp(val: number, b: number, t: number) {
    return Math.min(t, Math.max(val, b));
}

export function copyText(text: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
}