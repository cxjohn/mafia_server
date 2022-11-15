import { Schema, type, MapSchema } from "@colyseus/schema";
import { PhaseType } from "../MyRoom";

export class Player extends Schema {
  @type("string") name: string;
  @type("boolean") alive = true;
  @type("boolean") room_owner = false;
}

export class State extends Schema {
  @type("number") countdown: number;
  @type("number") phase = PhaseType.LOBBY;
  @type("string") narration = "Welcome to Mafia";

  nextPhase() {
    if (this.phase >= PhaseType.LOBBY && this.phase < PhaseType.CONCLUSION - 1) {
      this.phase = this.phase + 1;
    }
  }

  setNarration(narration: string) {
    this.narration = narration;
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
