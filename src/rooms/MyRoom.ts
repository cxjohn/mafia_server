import { Room, Client, Delayed } from "colyseus";
import { State } from "./schema/MyRoomState";

export class MafiaRoom extends Room<State> {
  maxClients = 12;
  public countdownInterval!: Delayed;
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
        confirmed.length > 0
      ) {
        this.state.nextPhase();
        confirmed = [];
      }
    });

    if (this.state.phase === "NARRATIONMORNING") {
      this.state.countdown = 240;

      this.countdownInterval = this.clock.setInterval(() => {
        this.state.countdown--;
        if (this.state.countdown === 0) {
          this.countdownInterval.clear();
          this.state.nextPhase();
        }
      }, 1000);
    }
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
