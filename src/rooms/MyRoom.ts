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
  mafiaFinished: boolean;
  detectiveFinished: boolean;
  angelFinished: boolean;
  hasMafia: boolean; // Should always be true;
  hasDetective: boolean;
  hasAngel: boolean;
  savedPlayer: Player;

  onCreate(options) {
    console.log("MafiaRoom created!", options);
    this.setPatchRate(20);
    this.setState(new State());
    this.narrator = new Narrator();
    this.phase = goToLobby(this.state.players);
    this.playerVotes = new Map<Player, number>();
    this.mafiaVotes = new Map<Player, number>();
    this.mafiaFinished = false;
    this.angelFinished = false;
    this.detectiveFinished = false;
    this.hasMafia = false;
    this.hasDetective = false;
    this.hasAngel = false;
    this.savedPlayer = new Player();

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
        this.mafiaFinished = true;
        this.resolveNight();
      }
    });

    this.onMessage("selectSaved", (client, target) => {
      if (this.state.players[client.sessionId]?.role != Role.ANGEL) {
        console.log(
          "Client error, selectSaved can only be called from a client who has the ANGEL role"
        );
        return;
      }

      if (!this.state.players[target]?.alive) {
        console.log(
          "Client error, only living players can be saved by the angel"
        );
        return;
      }

      this.savedPlayer = this.state.players[target];
      this.angelFinished = true;
      this.resolveNight();

    });

    this.onMessage("detectiveFinished", (client) => {
      if (this.state.players[client.sessionId]?.role != Role.DETECTIVE) {
        console.log(
          "Client error, detectiveFinished can only be called from a client who has the DETECTIVE role"
        );
        return;
      }
      this.detectiveFinished = true;
      this.resolveNight();
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
    });

    this.onMessage("setRoles", (client, roles: Array<Role>) => {
      roles.forEach(element => {
        if (element === Role.MAFIA) { this.hasMafia = true; }
        else if (element === Role.ANGEL) { this.hasAngel = true; }
        else if (element === Role.DETECTIVE) { this.hasDetective = true; }
      });

      if (!this.hasMafia) {
        console.log("Role array sent to backend but it contains no mafia.");
      }

      this.state.assignRoles(roles);
    });
  }

  resolveNight() {
    if ((this.hasMafia && !this.mafiaFinished) ||
        (this.hasAngel && !this.angelFinished) ||
        (this.hasDetective && !this.detectiveFinished)) {
          return;
        }

    this.mafiaFinished = false;
    this.angelFinished = false;
    this.detectiveFinished = false;

    // Detectives and Angels will be resolved by now.
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

    if (votedPlayer === this.savedPlayer) {
      votedPlayer = new Player();
    } else {
      console.log(votedPlayer.name + " has been murdered.");
    }

    this.state.players.forEach((player, id) => {
      player.voted = false;
      if (player == votedPlayer) {
        player.alive = false;
      }
    });

    this.mafiaVotes.clear();

    //TODO extract this into single function?
    this.phase = this.phase.getNextPhase(this.state.players);
    this.state.setNarration(this.phase.getNarration(this.narrator));
    this.state.setPhase(this.phase.type);

    this.state.countdown = 240;
    this.countdownInterval = this.clock.setInterval(() => {
      this.state.countdown--;
      this.state.phase !== PhaseType.NARRATIONMORNING &&
        this.countdownInterval.clear();
      if (this.state.countdown === 0) {
        this.countdownInterval.clear();
        this.phase = this.phase.getNextPhase(this.state.players);
        this.state.setNarration(this.phase.getNarration(this.narrator));
        this.state.setPhase(this.phase.type);
      }
    }, 1000);
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
