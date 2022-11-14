import { Schema, type, MapSchema } from "@colyseus/schema";

export enum Phase {
  LOBBY,
  INTRODUCTION,
  NIGHT,
  NARRATIONMORNING,
  VOTING,
  NARRATIONLYNCHING,
  CONCLUSION,
}

export class Player extends Schema {
  @type("string") name: string;
  @type("boolean") alive = true;
  @type("boolean") room_owner = false;
}

export class State extends Schema {
  @type("boolean") entered = false;
  @type("number") phase = 0;

  setEntered() {
    this.entered = true;
  }

  nextPhase() {
    this.phase = this.phase + 1;
  }

  @type({ map: Player })
  players = new MapSchema<Player>();

  createPlayer(sessionId: string, options) {
    this.players.set(sessionId, new Player());
    this.players.get(sessionId).name = options.name;
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }
}
