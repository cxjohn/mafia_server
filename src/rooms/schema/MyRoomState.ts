import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string;
  @type("boolean") alive = true;
  @type("boolean") room_owner = false;
}

export class State extends Schema {
  @type("string") phase = "LOBBY";
  @type("number") phaseIndex = 0;
  @type(["string"]) phaseArr = [
    "LOBBY",
    "INTRODUCTION",
    "NIGHT",
    "NARRATIONMORNING",
    "VOTING",
    "NARRATIONLYNCHING",
    "CONCLUSION",
  ];

  nextPhase() {
    this.phaseIndex = this.phaseArr.indexOf(this.phase);
    if (this.phaseIndex >= 0 && this.phaseIndex < this.phaseArr.length - 1)
      this.phase = this.phaseArr[this.phaseIndex + 1];
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
