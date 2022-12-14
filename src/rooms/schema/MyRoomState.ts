import { Schema, type, MapSchema } from "@colyseus/schema";
import { PhaseType, Phase } from "../Phase";

export enum Role {
  MAFIA = 0,
  TOWNSPERSON = 1,
  ANGEL = 2,
  DETECTIVE = 3,
}

export class Player extends Schema {
  @type("string") name: string;
  @type("boolean") alive = true;
  @type("number") role: Role;
  @type("boolean") room_owner = false;
  @type("boolean") confirmed = false;
  @type("boolean") voted = false;
  @type("boolean") connected = true;
}

export class State extends Schema {
  @type("number") minClients = 2;
  @type("number") countdown: number;
  @type("number") phase = PhaseType.LOBBY;
  @type("string") narration = "Welcome to Mafia";

  setPhase(phase: number) {
    this.phase = phase;
  }

  setNarration(narration: string) {
    this.narration = narration;
  }

  @type({ map: Player })
  players = new MapSchema<Player>();

  createPlayer(sessionId: string, options) {
    this.players.set(sessionId, new Player());
    this.players.get(sessionId).name = options.name;
    // Everyone is a townsperson to start. Role gets assigned when game starts.
    this.players.get(sessionId).role = Role.TOWNSPERSON;
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }

  assignRoles(roles: Array<Role>) {
    // Shuffle the array and assign a role to each person.
    shuffleArray(roles);
    this.players.forEach((player, id) => (player.role = roles.pop()));
  }
}

function shuffleArray(array: Array<Role>) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}
