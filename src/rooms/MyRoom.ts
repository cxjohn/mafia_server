import { Room, Client } from "colyseus";
import { State } from "./schema/MyRoomState";

export class MafiaRoom extends Room<State> {
  maxClients = 4;

  onCreate(options) {
    console.log("MafiaRoom created!", options);

    this.onMessage("message", (client, message) => {
      console.log(
        "ChatRoom received message from",
        client.sessionId,
        ":",
        message
      );
      this.broadcast("messages", `(${client.sessionId}) ${message}`);
    });

    this.setState(new State());

    this.onMessage("move", (client, data) => {
      console.log(
        "MafiaRoom received message from",
        client.sessionId,
        ":",
        data
      );
      this.state.movePlayer(client.sessionId, data);
      this.broadcast(
        "messages",
        `(${client.sessionId}) ${JSON.stringify(data)}`
      );
    });

    this.state.setEntered();
  }

  onAuth(client, options, req) {
    return true;
  }

  onJoin(client: Client, options) {
    this.state.createPlayer(client.sessionId, options);
    this.broadcast("messages", `${client.sessionId} joined.`);
  }

  onLeave(client: Client) {
    this.state.removePlayer(client.sessionId);
    this.broadcast("messages", `${client.sessionId} left.`);
  }

  onDispose() {
    console.log("Dispose MafiaRoom");
  }
}
