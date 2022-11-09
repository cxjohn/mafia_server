import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number")
  x = Math.floor(Math.random() * 400);

  @type("number")
  y = Math.floor(Math.random() * 400);

  @type("string") name: string;
}

export class State extends Schema {
  @type("boolean") entered: boolean;

  setEntered() {
    this.entered = true;
  }

  @type({ map: Player })
  players = new MapSchema<Player>();

  something = "This attribute won't be sent to the client-side";

  createPlayer(sessionId: string, options) {
    this.players.set(sessionId, new Player());
    this.players.get(sessionId).name = options.name;
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }

  movePlayer(sessionId: string, movement: any) {
    if (movement.x) {
      this.players.get(sessionId).x += movement.x * 10;
    } else if (movement.y) {
      this.players.get(sessionId).y += movement.y * 10;
    }
  }
}
