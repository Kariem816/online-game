// enums helper
export function makeEnum(members) {
    const container = {};
    for (let i = 0; i < members.length; i++) {
        const name = members[i];
        container[container[i] = name] = i;
    }
    return container;
}

export async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function clamp(val, b, t) {
    return Math.min(t, Math.max(val, b));
}

export function copyText(text) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
}