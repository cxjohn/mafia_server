import { MapSchema } from "@colyseus/schema";
import { Player, Role } from "./schema/MyRoomState";
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

/*
 * Phase object is a shell for the current phase and the logic for that phase.
 */
export type Phase = {
  type: PhaseType;
  // Returns true if the right number of people confirm to move to the next phase.
  canMoveToNextPhase: (players: MapSchema<Player>) => boolean;
  // Returns the narration string for this phase.
  getNarration: (narrator: Narrator) => string;
  // Returns a new Phase object for the next phase.
  // Each phase has a goTo* function to handle phase-specific logic.
  getNextPhase: (players: MapSchema<Player>) => Phase;
};

// We will use this temporarily.
// Later, the logic will be built into the "goTo*" functions.
export function getNarrationFromPhase(narrator: Narrator): string {
  switch (this.type) {
    case PhaseType.LOBBY: {
      return "Welcome to Mafia. Please wait for the rest of the players to join.";
    }
    case PhaseType.INTRODUCTION: {
      return "default introduction";
    }
    case PhaseType.NIGHT: {
      return "Please close your eyes.";
    }
    case PhaseType.NARRATIONMORNING: {
      return "Somebody died!";
    }
    case PhaseType.VOTING: {
      return "Somebody is going to die!";
    }
    case PhaseType.NARRATIONLYNCHING: {
      return "Another person has died!";
    }
    case PhaseType.CONCLUSION: {
      return "default conclusion";
    }
    default: {
      return "";
    }
  }
}

// Checks every Player, if room_owner confirms then returns true.
export function roomOwnerConfirms(players: MapSchema<Player>): boolean {
  let confirmed = false;

  players.forEach((player, id) => {
    if (player.room_owner === true) {
      confirmed = player.confirmed;
    }
  });

  return confirmed;
}

// Checks every Player, if all living Players confirm, then returns true.
export function allConfirmed(players: MapSchema<Player>): boolean {
  let confirmed = true;

  players.forEach((player, id) => {
    confirmed &&= player.confirmed || !player.alive;
  });

  return confirmed;
}

// Checks every Player, if all living Players confirm, then returns true.
export function allVoted(players: MapSchema<Player>): boolean {
  let voted = true;

  players.forEach((player, id) => {
    voted &&= player.voted || !player.alive;
  });

  return voted;
}

// Checks every Player, if all living Mafia voted, then returns true.
export function allMafiaVoted(players: MapSchema<Player>): boolean {
  let voted = true;

  players.forEach((player, id) => {
    voted &&= (player.voted || !player.alive) && player.role === Role.MAFIA;
  });

  return voted;
}

function anyTownspersonAlive(players: MapSchema<Player>): boolean {
  let any_townsperson = false;

  players.forEach((player, id) => {
    any_townsperson ||= player.role === Role.TOWNSPERSON && player.alive;
  });

  return any_townsperson;
}

function anyMafiaAlive(players: MapSchema<Player>): boolean {
  let any_mafia = false;

  players.forEach((player, id) => {
    any_mafia ||= player.role === Role.MAFIA && player.alive;
  });

  return any_mafia;
}

// Called during Conclusion phase, or if we encounter a game-breaking issue.
export function goToLobby(players: MapSchema<Player>): Phase {
  return {
    type: PhaseType.LOBBY,
    canMoveToNextPhase: roomOwnerConfirms,
    getNarration: getNarrationFromPhase,
    getNextPhase: goToIntroduction,
  };
}

// Called during Lobby phase to start the game.
export function goToIntroduction(players: MapSchema<Player>): Phase {
  return {
    type: PhaseType.INTRODUCTION,
    canMoveToNextPhase: allConfirmed,
    getNarration: (narration: Narrator) => narration.getTheme(),
    getNextPhase: goToNight,
  };
}

// Called during Introduction phase, or from conclusion phase (if Townspeople remain).
export function goToNight(players: MapSchema<Player>): Phase {
  return {
    type: PhaseType.NIGHT,
    canMoveToNextPhase: allConfirmed,
    getNarration: getNarrationFromPhase,
    getNextPhase: goToMorning,
  };
}

// Called during Night phase.
export function goToMorning(players: MapSchema<Player>): Phase {
  if (!anyTownspersonAlive(players)) {
    return goToConclusion(players);
  }

  return {
    type: PhaseType.NARRATIONMORNING,
    canMoveToNextPhase: allConfirmed,
    getNarration: getNarrationFromPhase,
    getNextPhase: goToVoting,
  };
}

// Called during Morning phase.
export function goToVoting(players: MapSchema<Player>): Phase {
  return {
    type: PhaseType.VOTING,
    canMoveToNextPhase: allConfirmed,
    getNarration: getNarrationFromPhase,
    getNextPhase: goToLynching,
  };
}

// Called during Voting phase.
export function goToLynching(players: MapSchema<Player>): Phase {
  return {
    type: PhaseType.NARRATIONLYNCHING,
    canMoveToNextPhase: allConfirmed,
    getNarration: getNarrationFromPhase,
    getNextPhase: goToConclusion,
  };
}

// Called during Night phase or Lynching phase.
export function goToConclusion(players: MapSchema<Player>): Phase {
  if (anyTownspersonAlive(players) && anyMafiaAlive(players)) {
    return goToNight(players);
  }

  let winner = "Congratulations Mafia, you have killed all players.";

  if (anyTownspersonAlive(players)) {
    winner =
      "Congratulations Townspeople, you have rid the town of Mafia and lived.";
  }

  return {
    type: PhaseType.CONCLUSION,
    canMoveToNextPhase: roomOwnerConfirms,
    getNarration: (narration: Narrator) => winner,
    // Stay on conclusion for now until we have a way to transition to new game.
    getNextPhase: goToConclusion,
  };
}
