import { Room, Client, Delayed } from "colyseus";
import { State } from "./schema/MyRoomState";
import { Narrator } from "../Narrator";
import { PhaseType, Phase, goToLobby } from "./Phase";
import { type } from '@colyseus/schema';

export class MafiaRoom extends Room<State> {
  maxClients = 12;
  public countdownInterval!: Delayed;
  narrator: Narrator;
  phase: Phase;
  onCreate(options) {
    console.log("MafiaRoom created!", options);
    this.setState(new State());
    this.narrator = new Narrator();
    this.phase = goToLobby(this.state.players);

    //Messages
    this.onMessage("message", (client, message) => {
      this.broadcast(
        "messages",
        `(${this.state.players[client.sessionId]?.name}) ${message}`
      );
    });

    //Enter new phase
    let confirmed = [];
    this.onMessage("nextPhase", (client) => {
      if (!confirmed.includes(client.sessionId)) {
        confirmed.push(client.sessionId);
        this.state.players[client.sessionId].confirmed = true;
      }

      if (this.phase.canMoveToNextPhase(this.state.players)) {
        this.state.players.forEach((player, id) => player.confirmed = false);
        confirmed = [];
        this.phase  = this.phase.getNextPhase(this.state.players);
        this.state.setNarration(this.phase.getNarration(this.narrator));
        this.state.setPhase(this.phase.type);

        // Initialize roles when we first go to Introduction Phase.
        if (this.phase.type === PhaseType.INTRODUCTION) {
          this.state.assignRoles();
        }
      }

      if (this.phase.type === PhaseType.NARRATIONMORNING) {
        this.state.countdown = 240;

        this.countdownInterval = this.clock.setInterval(() => {
          this.state.countdown--;
          this.state.phase !== PhaseType.NARRATIONMORNING &&
            this.countdownInterval.clear();
          if (this.state.countdown === 0) {
            this.countdownInterval.clear();
            this.phase = this.phase.getNextPhase(this.state.players);
          }
        }, 1000);
      }
    });
  }

  onJoin(client: Client, options) {
    this.state.createPlayer(client.sessionId, options);
    if (this.state.players.size === 1) {
      this.state.players[client.sessionId].room_owner = true;
    }
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
