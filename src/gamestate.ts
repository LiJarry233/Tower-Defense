import { WALL_MAX_HP } from "./config";

export const Game = {
  wallHP: WALL_MAX_HP,
  gold: 1500,
  kills: 0,
  totalEnemies: 50,
  level: 1,
  state: "playing" as "menu" | "playing" | "paused" | "victory" | "defeat",
};
