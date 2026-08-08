import * as msgs from "../msgs";

export class ConnectEvent extends CustomEvent<void> {
    constructor() {
        super("connect");
    }
}

export class DisconnectEvent extends CustomEvent<void> {
    constructor() {
        super("disconnect");
    }
}

export class ReconnectEvent extends CustomEvent<void> {
    constructor() {
        super("reconnect");
    }
}

export class WelcomeEvent extends CustomEvent<msgs.WelcomeMessage> {
    constructor(data: msgs.WelcomeMessage) {
        super("welcome", { detail: data });
    }
}

export class HostedEvent extends CustomEvent<msgs.HostedMessage> {
    constructor(data: msgs.HostedMessage) {
        super("hosted", { detail: data });
    }
}

export class JoinedEvent extends CustomEvent<msgs.JoinedMessage> {
    constructor(data: msgs.JoinedMessage) {
        super("joined", { detail: data });
    }
}

export class StateEvent extends CustomEvent<msgs.StateMessage> {
    constructor(data: msgs.StateMessage) {
        super("state", { detail: data });
    }
}

export class RoomEvent extends CustomEvent<msgs.RoomMessage> {
    constructor(data: msgs.RoomMessage) {
        super("room", { detail: data });
    }
}

export class MapEvent extends CustomEvent<msgs.MapMessage> {
    constructor(data: msgs.MapMessage) {
        super("map", { detail: data });
    }
}

export class LeftEvent extends CustomEvent<void> {
    constructor() {
        super("left");
    }
}

export class ChattedEvent extends CustomEvent<msgs.ChattedMessage> {
    constructor(data: msgs.ChattedMessage) {
        super("chatted", { detail: data });
    }
}

export class ErrorEvent extends CustomEvent<msgs.ErrorMessage> {
    constructor(data: msgs.ErrorMessage) {
        super("error", { detail: data });
    }
}

export class SystemEvent extends CustomEvent<msgs.SystemMessage> {
    constructor(data: msgs.SystemMessage) {
        super("system", { detail: data });
    }
}

export class ShotEvent extends CustomEvent<msgs.ShotMessage> {
    constructor(data: msgs.ShotMessage) {
        super("shot", { detail: data });
    }
}