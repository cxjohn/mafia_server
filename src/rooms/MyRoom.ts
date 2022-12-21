import { Room, Client, Delayed } from "colyseus";
import { Player, State, Role } from "./schema/MyRoomState";
import { Narrator } from "../Narrator";
import { PhaseType, Phase, goToLobby, allVoted, allMafiaVoted } from "./Phase";
import { type } from "@colyseus/schema";

export class MafiaRoom extends Room<State> {
  maxClients = 12;
  public countdownInterval!: Delayed;
  narrator: Narrator;
  phase: Phase;
  playerVotes: Map<Player, number>;
  mafiaVotes: Map<Player, number>;

  onCreate(options) {
    console.log("MafiaRoom created!", options);
    this.setPatchRate(20);
    this.setState(new State());
    this.narrator = new Narrator();
    this.phase = goToLobby(this.state.players);
    this.playerVotes = new Map<Player, number>();
    this.mafiaVotes = new Map<Player, number>();

    //Messages
    this.onMessage("message", (client, message) => {
      this.broadcast(
        "messages",
        `(${this.state.players[client.sessionId]?.name}) ${message}`
      );
    });

    this.onMessage("kill", () => {
      this.disconnect();
    });

    this.onMessage("voteForLynch", (client, target) => {
      if (this.phase.type != PhaseType.VOTING) {
        console.log(
          "Client error, voteForLynch can only be called during VOTING phase"
        );
        return;
      }

      if (!this.playerVotes.has(this.state.players[target])) {
        this.playerVotes.set(this.state.players[target], 1);
      } else {
        this.playerVotes.set(
          this.state.players[target],
          this.playerVotes.get(this.state.players[target]) + 1
        );
      }

      this.state.players[client.sessionId].voted = true;

      if (allVoted(this.state.players)) {
        console.log("everyone has voted");

        let highestVotes = 0;
        let votedPlayer = new Player();
        let tie = false;
        let tiedPlayer = new Player();
        this.playerVotes.forEach((votes, player) => {
          if (votes == highestVotes) {
            tie = true;
            tiedPlayer = player;
          }
          if (votes > highestVotes) {
            highestVotes = votes;
            votedPlayer = player;
            tie = false;
          }
        });

        if (tie) {
          console.log(
            "It was a tie! But " + votedPlayer.name + " is still going to die."
          );
        }

        console.log(votedPlayer.name + " has been lynched.");

        //TODO extract this into single function?
        this.phase = this.phase.getNextPhase(this.state.players);
        this.state.setNarration(this.phase.getNarration(this.narrator));
        this.state.setPhase(this.phase.type);

        this.state.players.forEach((player, id) => {
          player.voted = false;
          if (player == votedPlayer) {
            player.alive = false;
          }
        });

        this.playerVotes.clear();
      }
    });

    this.onMessage("voteForWhack", (client, target) => {
      if (this.phase.type != PhaseType.NIGHT) {
        console.log(
          "Client error, voteForWhack can only be called during NIGHT phase"
        );
        return;
      }

      if (this.state.players[client.sessionId]?.role != Role.MAFIA) {
        console.log(
          "Client error, voteForWhack can only be called from a client who has the MAFIA role"
        );
        return;
      }

      if (this.state.players[target]?.role == Role.MAFIA) {
        console.log(
          "Client error, voteForWhack can not target a user who has the MAFIA role"
        );
        return;
      }

      if (!this.mafiaVotes.has(this.state.players[target])) {
        this.mafiaVotes.set(this.state.players[target], 1);
      } else {
        this.mafiaVotes.set(
          this.state.players[target],
          this.mafiaVotes.get(this.state.players[target]) + 1
        );
      }

      this.state.players[client.sessionId].voted = true;

      if (allMafiaVoted(this.state.players)) {
        let highestVotes = 0;
        let votedPlayer = new Player();
        let tie = false;
        let tiedPlayer = new Player();
        this.mafiaVotes.forEach((votes, player) => {
          if (votes == highestVotes) {
            tie = true;
            tiedPlayer = player;
          }
          if (votes > highestVotes) {
            highestVotes = votes;
            votedPlayer = player;
            tie = false;
          }
        });

        if (tie) {
          console.log(
            "It was a tie! But " + votedPlayer.name + " is still going to die."
          );
        }

        console.log(votedPlayer.name + " has been murdered.");

        //TODO extract this into single function?
        this.phase = this.phase.getNextPhase(this.state.players);
        this.state.setNarration(this.phase.getNarration(this.narrator));
        this.state.setPhase(this.phase.type);

        this.state.players.forEach((player, id) => {
          player.voted = false;
          if (player == votedPlayer) {
            player.alive = false;
          }
        });

        this.playerVotes.clear();
      }
    });

    //Enter new phase
    let confirmed = [];
    this.onMessage("nextPhase", (client) => {
      if (!this.state.players.has(client.sessionId)) {
        console.log(
          "Client error, requesting nextPhase from client who does not exist"
        );
      }
      if (!this.state.players[client.sessionId].alive) {
        return;
      }

      if (!confirmed.includes(client.sessionId)) {
        confirmed.push(client.sessionId);
        this.state.players[client.sessionId].confirmed = true;
      }

      if (this.phase.canMoveToNextPhase(this.state.players)) {
        this.state.players.forEach((player, id) => (player.confirmed = false));
        confirmed = [];
        //TODO extract this into single function?
        this.phase = this.phase.getNextPhase(this.state.players);
        this.state.setNarration(this.phase.getNarration(this.narrator));
        this.state.setPhase(this.phase.type);
      }
      if (
        this.phase.type === PhaseType.NARRATIONMORNING &&
        confirmed.length === 0
      ) {
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

    this.onMessage("setRoles", (client, roles) => {
      console.log("roles", roles);
      this.state.assignRoles(roles);
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

  async onLeave(client: Client) {
    this.state.players.get(client.sessionId).connected = false;
    console.log(client.sessionId, "left");

    try {
      // allow disconnected client to reconnect into this room until 180 seconds
      await this.allowReconnection(client, 180);

      // client returned! let's re-activate it.
      this.state.players.get(client.sessionId).connected = true;
    } catch (e) {
      // 180 seconds expired. let's remove the client.
      this.state.removePlayer(client.sessionId);
      this.broadcast(
        "messages",
        `${this.state.players[client.sessionId]?.name} left.`
      );
    }
  }

  onDispose() {
    console.log("Dispose MafiaRoom");
  }
}
