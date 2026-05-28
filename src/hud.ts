import { Game } from "./gamestate";
import { WALL_MAX_HP } from "./config";

export class Hud {
  private el: HTMLDivElement;

  constructor() {
    this.el = document.getElementById("hud") as HTMLDivElement;
    this.el.innerHTML = `
      <div style="position:absolute;top:10px;left:10px;color:white;font:16px monospace;line-height:1.8">
        <div style="display:flex;align-items:center;gap:8px">
          <span>Wall</span>
          <div style="width:200px;height:18px;background:#331111;border:1px solid #664444">
            <div id="hp-fill" style="width:100%;height:100%;background:lime"></div>
          </div>
          <span id="hp-text">${WALL_MAX_HP}/${WALL_MAX_HP}</span>
        </div>
        <div style="color:#ffcc00">Gold: <span id="gold-val">${Game.gold}</span></div>
        <div>Kills: <span id="kill-val">${Game.kills}/${Game.totalEnemies}</span></div>
        <div id="state-label" style="color:#88ff88">State: playing</div>
      </div>
    `;
  }

  update() {
    const ratio = Math.max(0, Game.wallHP / WALL_MAX_HP);
    const fill = document.getElementById("hp-fill");
    const text = document.getElementById("hp-text");
    const g = document.getElementById("gold-val");
    const k = document.getElementById("kill-val");
    const s = document.getElementById("state-label");
    if (fill) {
      fill.style.width = (ratio * 100) + "%";
      fill.style.background = ratio < 0.3 ? "red" : ratio < 0.6 ? "orange" : "lime";
    }
    if (text) text.textContent = `${Math.ceil(Game.wallHP)}/${WALL_MAX_HP}`;
    if (g) g.textContent = `${Game.gold}`;
    if (k) k.textContent = `${Game.kills}/${Game.totalEnemies}`;
    if (s) s.textContent = `State: ${Game.state}`;
  }
}

// keep backward compat
export function setWallHP(v: number) { Game.wallHP = v; }
export function setGold(v: number) { Game.gold = v; }
export function setKills(k: number, t: number) { Game.kills = k; Game.totalEnemies = t; }
