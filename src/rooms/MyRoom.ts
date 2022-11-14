import { Room, Client } from "colyseus";
import { State } from "./schema/MyRoomState";

export class MafiaRoom extends Room<State> {
  maxClients = 12;

  onCreate(options) {
    console.log("MafiaRoom created!", options);

    //Messages
    this.onMessage("message", (client, message) => {
      this.broadcast(
        "messages",
        `(${this.state.players[client.sessionId]?.name}) ${message}`
      );
    });

    this.setState(new State());

    //Enter new phase
    let confirmed = [];
    this.onMessage("nextPhase", (client) => {
      if (!confirmed.includes(client.sessionId)) {
        confirmed.push(client.sessionId);
      }
      if (
        this.state.players.size === confirmed.length &&
        confirmed.length > 1
      ) {
        this.state.nextPhase();
        confirmed = [];
      }
    });

    this.state.setEntered();
  }

  onJoin(client: Client, options) {
    this.state.createPlayer(client.sessionId, options);
    this.broadcast(
      "messages",
      `${this.state.players[client.sessionId]?.name} joined.`
    );
  }

  onLeave(client: Client) {
    this.state.removePlayer(client.sessionId);
    this.broadcast(
      "messages",
      `${this.state.players[client.sessionId]?.name} left.`
    );
  }

  onDispose() {
    console.log("Dispose MafiaRoom");
  }
}
