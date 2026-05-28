import { Game } from "./gamestate";

const PREFIX = "td_save_";

interface SaveSlot {
  level: number;
  gold: number;
  wallHP: number;
  kills: number;
  total: number;
  turrets: (number | null)[]; // [slot0 type, slot1 type]  -1=none, 0=normal, 1=aoe
}

export function saveGame(slot: number) {
  const data: SaveSlot = {
    level: Game.level,
    gold: Game.gold,
    wallHP: Game.wallHP,
    kills: Game.kills,
    total: Game.totalEnemies,
    turrets: [], // will be filled from main
  };
  // turretSlots are in main.ts, can't import here due to circular dep
  // Store with a flag and main fills it in
  localStorage.setItem(PREFIX + slot, JSON.stringify(data));
}

export function loadGame(slot: number): SaveSlot | null {
  const raw = localStorage.getItem(PREFIX + slot);
  if (!raw) return null;
  try { return JSON.parse(raw) as SaveSlot; } catch { return null; }
}

export function deleteSave(slot: number) {
  localStorage.removeItem(PREFIX + slot);
}

export function getSaveInfo(slot: number): { exists: boolean; level: number; gold: number } {
  const data = loadGame(slot);
  return data ? { exists: true, level: data.level, gold: data.gold } : { exists: false, level: 0, gold: 0 };
}
