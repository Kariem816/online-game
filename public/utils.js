// enums helper
function enumJS(container, members) {
    for (let i = 0; i < members.length; i++) {
        const name = members[i];
        container[container[i] = name] = i;
    }
    return container;
}