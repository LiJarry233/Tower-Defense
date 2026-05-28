import { Game } from "./gamestate";
import { WALL_MAX_HP, LEVELS } from "./config";
import { saveGame, loadGame, deleteSave } from "./save";

const KENNEY = "/UI/kenney_ui-pack/PNG";

// ── Helpers ──
function el(tag: string, style: Partial<CSSStyleDeclaration> = {}, inner = ""): HTMLElement {
  const e = document.createElement(tag);
  Object.assign(e.style, style);
  if (inner) e.innerHTML = inner;
  return e;
}

function kenneyBtn(text: string, color: string, cb: () => void, w = 260, h = 55, fs = 20): HTMLElement {
  const btn = el("div", {
    width: w + "px", height: h + "px", display: "flex", justifyContent: "center", alignItems: "center",
    fontSize: fs + "px", color, fontWeight: "bold", cursor: "pointer",
  });
  btn.style.backgroundImage = `url(${KENNEY}/Grey/Double/button_rectangle_depth_gradient.png)`;
  btn.style.backgroundSize = "100% 100%";
  btn.textContent = text;
  btn.addEventListener("click", cb);
  btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.3)"; });
  btn.addEventListener("mouseleave", () => { btn.style.filter = "none"; });
  return btn;
}

function kenneyPanel(w = 400, h = 400) {
  const p = el("div", { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "30px" });
  p.style.backgroundImage = `url(${KENNEY}/Grey/Default/button_rectangle_depth_flat.png)`;
  p.style.backgroundSize = "100% 100%";
  p.style.minWidth = w + "px";
  p.style.minHeight = h + "px";
  return p;
}

// ── Base Overlay ──
class Overlay {
  root: HTMLElement;
  constructor() {
    this.root = el("div", { position: "absolute", top: "0", left: "0", width: "100%", height: "100%", display: "none", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.75)", zIndex: "10" });
    document.body.appendChild(this.root);
  }
  show() { this.root.style.display = "flex"; }
  hide() { this.root.style.display = "none"; }
}

// ── HUD ──
export class Hud {
  private hpFill: HTMLElement;
  private hpText: HTMLElement;
  private goldVal: HTMLElement;
  private killVal: HTMLElement;

  constructor() {
    const root = document.getElementById("hud")!;
    root.innerHTML = "";
    const wrap = el("div", { position: "absolute", top: "10px", left: "10px", color: "#fff", font: "18px monospace", lineHeight: "2" });

    const hpRow = el("div", { display: "flex", alignItems: "center", gap: "8px" });
    hpRow.appendChild(el("span", {}, "Wall"));
    const bg = el("div", { width: "250px", height: "24px", background: "#331111", border: "2px solid #886644", borderRadius: "4px" });
    this.hpFill = el("div", { width: "100%", height: "100%", background: "lime", borderRadius: "2px" });
    bg.appendChild(this.hpFill);
    hpRow.appendChild(bg);
    this.hpText = el("span", { fontSize: "16px" }, `${WALL_MAX_HP}/${WALL_MAX_HP}`);
    hpRow.appendChild(this.hpText);
    wrap.appendChild(hpRow);

    const goldRow = el("div", { display: "flex", alignItems: "center", gap: "6px", color: "#ffcc00", fontSize: "20px" });
    goldRow.appendChild(el("span", {}, "Gold: "));
    this.goldVal = el("span", {}, `${Game.gold}`);
    goldRow.appendChild(this.goldVal);
    wrap.appendChild(goldRow);

    this.killVal = el("span", { fontSize: "16px", color: "#ccc" }, `Kills: ${Game.kills}/${Game.totalEnemies}`);
    wrap.appendChild(this.killVal);

    root.appendChild(wrap);
  }

  update() {
    const r = Math.max(0, Game.wallHP / WALL_MAX_HP);
    this.hpFill.style.width = (r * 100) + "%";
    this.hpFill.style.background = r < 0.3 ? "#ff3333" : r < 0.6 ? "#ff8800" : "#33cc33";
    this.hpText.textContent = `${Math.ceil(Game.wallHP)}/${WALL_MAX_HP}`;
    this.goldVal.textContent = `${Game.gold}`;
    this.killVal.textContent = `Kills: ${Game.kills}/${Game.totalEnemies}`;
  }
}

// ── Main Menu ──
export class MainMenu extends Overlay {
  constructor(onStart: () => void) {
    super();
    const panel = kenneyPanel(380, 280);
    panel.appendChild(el("div", { fontSize: "44px", color: "#ffcc44", fontWeight: "bold", marginBottom: "10px" }, "末日塔防"));
    panel.appendChild(el("div", { fontSize: "16px", color: "#aa8855", marginBottom: "20px" }, "Tower Defense"));
    panel.appendChild(kenneyBtn("开始游戏", "#44cc44", onStart));
    this.root.appendChild(panel);
    this.show();
  }
}

// ── Archive (3 save slots) ──
export class ArchiveScreen extends Overlay {
  private slots: HTMLElement[] = [];
  onSelect: ((slot: number) => void) | null = null;
  onBack: (() => void) | null = null;

  constructor() {
    super();
    const panel = kenneyPanel(420, 400);
    panel.appendChild(el("div", { fontSize: "28px", color: "#ffcc44", marginBottom: "5px" }, "选择存档"));

    for (let i = 0; i < 3; i++) {
      const slotRow = el("div", {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "340px", height: "60px", padding: "0 12px",
      });
      slotRow.style.backgroundImage = `url(${KENNEY}/Grey/Default/button_rectangle_depth_gradient.png)`;
      slotRow.style.backgroundSize = "100% 100%";

      const info = el("span", { fontSize: "16px", color: "#88cc88" }, `存档 ${i + 1} — 空`);
      slotRow.appendChild(info);
      const btnWrap = el("div", { display: "flex", gap: "8px" });

      const loadBtn = kenneyBtn("读取", "#44aaff", () => { if (this.onSelect) this.onSelect(i); }, 80, 35, 14);
      const delBtn = kenneyBtn("删除", "#ff6666", () => { deleteSave(i); this.refresh(); }, 80, 35, 14);

      btnWrap.appendChild(loadBtn);
      btnWrap.appendChild(delBtn);
      slotRow.appendChild(btnWrap);
      this.slots.push(slotRow);
      panel.appendChild(slotRow);
    }

    panel.appendChild(kenneyBtn("返回", "#ff8888", () => { if (this.onBack) this.onBack(); }, 200, 40, 16));
    this.root.appendChild(panel);
  }

  refresh() {
    for (let i = 0; i < 3; i++) {
      const raw = localStorage.getItem("td_save_" + i);
      const info = this.slots[i].querySelector("span")!;
      if (raw) {
        try {
          const d = JSON.parse(raw);
          info.textContent = `存档 ${i + 1} — 第${d.level}关  ${d.gold}金币`;
          info.style.color = "#88ccff";
        } catch {
          info.textContent = `存档 ${i + 1} — 空`;
          info.style.color = "#88cc88";
        }
      } else {
        info.textContent = `存档 ${i + 1} — 空`;
        info.style.color = "#88cc88";
      }
    }
  }

  show() { super.show(); this.refresh(); }
}

// ── Level Select ──
export class LevelSelect extends Overlay {
  onLevel: ((level: number) => void) | null = null;
  onBack: (() => void) | null = null;

  constructor() {
    super();
    const panel = kenneyPanel(380, 320);
    panel.appendChild(el("div", { fontSize: "28px", color: "#ffcc44", marginBottom: "5px" }, "关卡选择"));

    for (let i = 1; i <= 3; i++) {
      const data = LEVELS[i - 1];
      const total = data.melee + data.ranged + data.tank + data.boss;
      const btn = kenneyBtn(`第 ${i} 关 — ${total} 只怪物`, "#88ff88", () => {
        if (this.onLevel) this.onLevel(i);
      }, 280, 50, 18);
      panel.appendChild(btn);
    }

    panel.appendChild(kenneyBtn("返回", "#ff8888", () => { if (this.onBack) this.onBack(); }, 200, 40, 16));
    this.root.appendChild(panel);
  }
}

// ── Pause ──
export class PauseOverlay extends Overlay {
  constructor(onContinue: () => void, onExit: () => void) {
    super();
    const panel = kenneyPanel(320, 220);
    panel.appendChild(el("div", { fontSize: "36px", color: "#fff", marginBottom: "10px" }, "PAUSED"));
    panel.appendChild(kenneyBtn("继续", "#88ff88", onContinue));
    panel.appendChild(kenneyBtn("退出", "#ff8888", onExit));
    this.root.appendChild(panel);
  }
}

// ── Victory / Defeat ──
export class ResultOverlay extends Overlay {
  private titleEl: HTMLElement;
  private btn1: HTMLElement;
  private btn2: HTMLElement;
  private btnWrap: HTMLElement;

  constructor() {
    super();
    const panel = kenneyPanel(360, 260);
    this.titleEl = el("div", { fontSize: "44px", fontWeight: "bold", marginBottom: "15px" });
    panel.appendChild(this.titleEl);

    this.btnWrap = el("div", { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" });
    this.btn1 = el("div");
    this.btn2 = el("div");
    this.btnWrap.appendChild(this.btn1);
    this.btnWrap.appendChild(this.btn2);
    panel.appendChild(this.btnWrap);
    this.root.appendChild(panel);
  }

  showVictory(level: number, onNext: () => void, onExit: () => void) {
    this.titleEl.textContent = "胜利！";
    this.titleEl.style.color = "#44ff44";
    this.btnWrap.innerHTML = "";
    if (level < 3) {
      const b = kenneyBtn("下一关", "#88ff88", onNext);
      b.style.marginBottom = "8px";
      this.btnWrap.appendChild(b);
    }
    this.btnWrap.appendChild(kenneyBtn("退出", "#ff8888", onExit));
    this.show();
  }

  showDefeat(onRetry: () => void, onExit: () => void) {
    this.titleEl.textContent = "失败";
    this.titleEl.style.color = "#ff4444";
    this.btnWrap.innerHTML = "";
    const b = kenneyBtn("重试", "#ffaa44", onRetry);
    b.style.marginBottom = "8px";
    this.btnWrap.appendChild(b);
    this.btnWrap.appendChild(kenneyBtn("退出", "#ff8888", onExit));
    this.show();
  }
}

// ── Turret Shop ──
export class TurretShop extends Overlay {
  constructor(onBuyNormal: () => void, onBuyAOE: () => void, onClose: () => void) {
    super();
    const panel = kenneyPanel(320, 260);
    panel.appendChild(el("div", { fontSize: "22px", color: "#fff", marginBottom: "5px" }, "购买炮台"));
    panel.appendChild(kenneyBtn("普通炮台  500g", "#88ccff", onBuyNormal));
    panel.appendChild(kenneyBtn("范围炮台 1000g", "#ffaa44", onBuyAOE));
    panel.appendChild(kenneyBtn("返回", "#ff8888", onClose, 200, 40, 16));
    this.root.appendChild(panel);
  }
}
