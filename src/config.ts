export const WALL_MAX_HP = 10000;
export const PLAYER_BASE_DAMAGE = 100;
export const PLAYER_BASE_COOLDOWN = 0.5;
export const PLAYER_BASE_BULLETS = 1;
export const PLAYER_DAMAGE_PER_LV = 50;
export const PLAYER_CD_MULTIPLIER = 0.8;

export const MELEE_HP = 400;
export const MELEE_DAMAGE = 100;
export const MELEE_ATTACK_INTERVAL = 1.0;
export const MELEE_GOLD = 10;
export const MELEE_SPEED = 2.0;

export const RANGED_HP = 300;
export const RANGED_DAMAGE = 200;
export const RANGED_ATTACK_INTERVAL = 2.0;
export const RANGED_GOLD = 20;
export const RANGED_SPEED = 3.5;

export const TANK_HP = 2000;
export const TANK_DAMAGE = 200;
export const TANK_ATTACK_INTERVAL = 3.0;
export const TANK_GOLD = 50;
export const TANK_SPEED = 1.5;

export const BOSS_HP = 4000;
export const BOSS_DAMAGE = 400;
export const BOSS_ATTACK_INTERVAL = 3.0;
export const BOSS_SPEED = 1.2;

export const NORMAL_TURRET_DAMAGE = 50;
export const NORMAL_TURRET_CD = 0.4;
export const NORMAL_TURRET_PRICE = 500;

export const AOE_TURRET_DAMAGE = 250;
export const AOE_TURRET_CD = 2.0;
export const AOE_TURRET_PRICE = 1000;

export const LEVELS = [
  { melee: 50, ranged: 10, tank: 0, boss: 0 },
  { melee: 100, ranged: 20, tank: 10, boss: 0 },
  { melee: 100, ranged: 40, tank: 20, boss: 1 },
];
