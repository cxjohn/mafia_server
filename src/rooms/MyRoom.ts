import { Room, Client, Delayed } from "colyseus";
import { State } from "./schema/MyRoomState";
import { Narrator } from "../Narrator";

/*
 * By default Typescript enums map members onto whole numbers starting at 0.
 * Therefore, we can store a number for phase, but utilize the enum names
 * for convenience.
 * e.g. Phase: number = PhaseType.LOBBY; is the same as Phase: number = 0;
 */
export enum PhaseType {
  LOBBY,
  INTRODUCTION,
  NIGHT,
  NARRATIONMORNING,
  VOTING,
  NARRATIONLYNCHING,
  CONCLUSION,
}

export class MafiaRoom extends Room<State> {
  maxClients = 12;
  public countdownInterval!: Delayed;
  narrator: Narrator;
  onCreate(options) {
    console.log("MafiaRoom created!", options);
    this.setState(new State());

    //Messages
    this.onMessage("message", (client, message) => {
      this.broadcast(
        "messages",
        `(${this.state.players[client.sessionId]?.name}) ${message}`
      );
    });

    this.narrator = new Narrator();

    //Enter new phase
    let confirmed = false;
    this.onMessage("nextPhase", (client) => {
      this.state.players[client.sessionId].confirmed = true;

      for (let player of this.state.players.values()) {
        if (player.confirmed === false) {
          confirmed = false;
          break;
        } else {
          confirmed = true;
        }
      }
      //TODO: add logic for lobby phase
      if (confirmed && this.state.players.size >= this.state.minClients) {
        confirmed = false;

        this.state.players.forEach((player) => {
          player.confirmed = false;
        });

        this.state.nextPhase();

        console.log(this.state.phase);
        switch (this.state.phase) {
          case PhaseType.LOBBY:
            this.state.setNarration(
              "Welcome to Mafia. Please wait for the rest of the players to join."
            );
            break;
          case PhaseType.INTRODUCTION:
            this.state.setNarration(this.narrator.getTheme());
            break;
          case PhaseType.NIGHT:
            this.state.setNarration("Please close your eyes.");
            break;
          case PhaseType.NARRATIONMORNING:
            this.state.setNarration("Somebody died!");
            break;
          case PhaseType.VOTING:
            this.state.setNarration("Somebody is going to die!");
            break;
          case PhaseType.NARRATIONLYNCHING:
            this.state.setNarration("Another person has died!");
            break;
          case PhaseType.CONCLUSION:
            this.state.setNarration(
              "A sufficient number of players have died. Congratulations."
            );
            break;
          default:
            this.state.setNarration("Improper phase type");
        }
      }
      if (this.state.phase === PhaseType.NARRATIONMORNING) {
        this.state.countdown = 240;

        this.countdownInterval = this.clock.setInterval(() => {
          this.state.countdown--;
          this.state.phase !== PhaseType.NARRATIONMORNING &&
            this.countdownInterval.clear();
          if (this.state.countdown === 0) {
            this.countdownInterval.clear();
            this.state.nextPhase();
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
