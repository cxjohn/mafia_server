import seedRandom from "seed-random";
import { Role } from "./rooms/schema/MyRoomState";


const themes = [
  "Mafia",
  "Cultists",
  "Fanatics",
  "Zealots",
  "Werewolves",
  "Vampires",
];

const settings: [string, string][] = [
  ["Prohibition-era", "town"],
  ["Frontier", "town"],
  ["Medieval", "village"],
  ["Modern", "town"],
];

export class Narrator {
  seed: string;
  theme: string;
  setting: [string, string];
  last_killed: string;

  /*
   * This is called when we call "new Narrator()"
   * It seeds Math.random() so that we get the same random numbers in the same
   * order each time we run the game. This is important while developing so we
   * can validate the results of the narrator. When we actually release the
   * game we will uncomment out the seed line and generate a random seed.
   */
  constructor() {
    this.seed = "clay is great"; //String(Math.floor(Math.random() * 100000));
    seedRandom(this.seed, { global: true });
  }

  /*
   * Initializes the theme and setting for the narration and returns an
   * introduction to the theme and setting
   */
  public getSetting(): string {
    this.theme = themes[Math.floor(Math.random() * themes.length)];
    console.log("Theme is: ", this.theme);
    this.setting = settings[Math.floor(Math.random() * settings.length)];
    console.log("Setting is: ", this.setting);
    return (
      "You find yourself in a " +
      this.setting[0] +
      " " +
      this.setting[1] +
      " that has secretly become infested with " +
      this.theme +
      ". " +
      "You will need to do everything you can to survive."
    );
  }

  public getMorningNarration(): string {
    return this.last_killed + " was killed during the night";
  }

  public getConclusion(winner: Role): string {
    let congrats = "Congratulations Mafia, you have killed all players.";

    if (winner === Role.TOWNSPERSON) {
      congrats =
        "Congratulations Townspeople, you have rid the town of Mafia and lived.";
    }
    return congrats;
  }

  public setLastKilled(player: string) {
    this.last_killed = player;
  }
}
