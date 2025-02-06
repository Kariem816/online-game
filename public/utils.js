// enums helper
function enumJS(container, members) {
    for (let i = 0; i < members.length; i++) {
        const name = members[i];
        container[container[i] = name] = i;
    }
    return container;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clamp(val, b, t) {
    return Math.min(t, Math.max(val, b));
}