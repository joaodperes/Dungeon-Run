import { GRID, CLASSES, ABILITIES, TALENTS, SHOP, ENEMY_TYPES } from './data.js';
export { GRID, CLASSES, ABILITIES, TALENTS, SHOP, ENEMY_TYPES };

export const SAVE_VERSION = 1;
export const nextLevelXp = level => 45 + level * 25;
const clone = value => JSON.parse(JSON.stringify(value));
const key = (x, y) => `${x},${y}`;
export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const inside = (x, y) => x >= 0 && y >= 0 && x < GRID.width && y < GRID.height;
const alive = state => state.enemies.filter(e => e.hp > 0);
const random = state => { state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0; return state.seed / 4294967296; };
const write = (state, text, type = 'info') => {
  state.log.push({ text, type, turn: state.turn });
  state.log = state.log.slice(-60);
  return text;
};
const result = (ok, message) => ({ ok, message });

export function stats(state) {
  const preset = CLASSES[state.classId];
  const level = state.hero.level;
  const s = { maxHp: preset.hp + (level - 1) * 8, maxMana: preset.mana + (level - 1) * 4,
    damage: 0, spellDamage: 0, armor: state.classId === 'knight' ? 2 : 0,
    movement: preset.movement, manaRegen: 3, crit: 0.05, gold: 0, xp: 0, lifesteal: 0 };
  const bonus = b => { for (const [k, v] of Object.entries(b || {})) if (k in s) s[k] += v; };
  for (const item of Object.values(state.hero.equipment)) if (item) bonus(item.bonus);
  for (const t of TALENTS) {
    const rank = state.hero.talents[t.id] || 0;
    if (rank) bonus(Object.fromEntries(Object.entries(t.bonus).map(([k, v]) => [k, v * rank])));
  }
  s.range = ABILITIES[state.hero.abilities.find(id => ABILITIES[id]?.kind === 'attack')]?.range || 1;
  return s;
}

export function createGame(classId = 'shaman') {
  if (typeof classId !== 'string' || !Object.hasOwn(CLASSES, classId)) classId = 'shaman';
  const c = CLASSES[classId];
  const state = {
    version: SAVE_VERSION, classId, seed: 51826, uid: 0, floor: 1, deepestFloor: 1,
    turn: 1, ap: 2, movement: c.movement, status: 'combat', merchant: false, reward: null,
    hero: { name: c.name === 'Shaman' ? 'Kael' : c.name === 'Hunter' ? 'Rowan' : 'Aldric', x: 2, y: 6,
      hp: c.hp, mana: c.mana, level: 1, xp: 0, gold: 125, talentPoints: 0,
      talents: {}, abilities: [c.weapon, c.skill], potions: 3, manaPotions: 2,
      inventory: [], equipment: { weapon: { id: 'starting-weapon', name: c.weapon === 'staff' ? 'Apprentice’s Staff' : c.weapon === 'bow' ? 'Oak Longbow' : 'Iron Sword', slot: 'weapon', rarity: 'common', bonus: {}, description: 'A faithful weapon for the journey ahead.', icon: c.weapon, price: 12 }, armor: null, charm: null } },
    enemies: [], walls: [], log: [], kills: 0, bossesDefeated: 0, goldEarned: 0,
  };
  generateFloor(state);
  write(state, 'You enter the Whispering Crypt. Something stirs in the dark.', 'explore');
  write(state, 'Your turn. Move into position, then choose an attack or spell.', 'info');
  return state;
}

function generateFloor(state) {
  state.hero.x = 2; state.hero.y = 6;
  state.walls = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 9, y: 0 }, { x: 10, y: 0 },
    { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 },
    { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 7, y: 5 }, { x: 7, y: 6 },
    { x: 7, y: 1 }, { x: 8, y: 1 }, { x: 4, y: 7 },
  ];
  if (state.floor > 3) state.walls.push({ x: 5, y: 3 }, { x: 5, y: 4 });
  const boss = state.floor % 3 === 0;
  const roster = boss ? [['boss', 8, 3], ['skeleton', 4, 4], ['shade', 8, 6]] :
    state.floor === 1 ? [['slime', 5, 5], ['skeleton', 6, 2], ['archer', 9, 4]] :
      [['skeleton', 5, 5], ['archer', 8, 2], [state.floor > 3 ? 'shade' : 'slime', 9, 6]];
  state.enemies = roster.map(([type, x, y], i) => {
    const base = ENEMY_TYPES[type];
    const mult = 1 + (state.floor - 1) * 0.12;
    const hp = Math.round(base.hp * mult);
    return { ...clone(base), id: `f${state.floor}-${type}-${i}`, type, x, y, hp, maxHp: hp,
      damage: Math.round(base.damage * (1 + (state.floor - 1) * 0.09)),
      boss: type === 'boss', stunned: 0, slowed: 0,
      name: type === 'boss' ? ['The Crypt Warden', 'Ashen Matriarch', 'The Hollow King'][Math.floor(state.floor / 3) - 1] : base.name };
  });
  state.merchant = state.floor >= 4 && state.floor % 3 === 1;
  state.status = 'combat'; state.reward = null; state.guarding = false; state.ap = 2; state.movement = stats(state).movement;
  state.deepestFloor = Math.max(state.deepestFloor, state.floor);
}

function blocked(state, ignoreEnemyId = null, heroBlocks = false) {
  const cells = new Set(state.walls.map(p => key(p.x, p.y)));
  for (const e of alive(state)) if (e.id !== ignoreEnemyId) cells.add(key(e.x, e.y));
  if (heroBlocks) cells.add(key(state.hero.x, state.hero.y));
  return cells;
}

function paths(state, from, budget, obstacles) {
  const seen = new Map([[key(from.x, from.y), { x: from.x, y: from.y, cost: 0 }]]);
  const queue = [{ x: from.x, y: from.y, cost: 0 }];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p.cost >= budget) continue;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = p.x + dx, y = p.y + dy, k = key(x, y);
      if (!inside(x, y) || seen.has(k) || obstacles.has(k)) continue;
      const cell = { x, y, cost: p.cost + 1 }; seen.set(k, cell); queue.push(cell);
    }
  }
  return [...seen.values()];
}

export function reachable(state) {
  if (state.status !== 'combat' || state.reward) return [];
  return paths(state, state.hero, state.movement, blocked(state)).filter(p => p.cost > 0);
}

export function hasLineOfSight(state, from, to) {
  // Integer supercover ray: walls touched by the ray block it, including corners.
  const walls = new Set(state.walls.map(p => key(p.x, p.y)));
  let x = from.x, y = from.y;
  const dx = to.x - x, dy = to.y - y;
  const nx = Math.abs(dx), ny = Math.abs(dy), sx = Math.sign(dx), sy = Math.sign(dy);
  let ix = 0, iy = 0;
  while (ix < nx || iy < ny) {
    const a = (1 + 2 * ix) * ny, b = (1 + 2 * iy) * nx;
    if (a === b) {
      if (walls.has(key(x + sx, y)) || walls.has(key(x, y + sy))) return false;
      x += sx; y += sy; ix++; iy++;
    } else if (a < b) { x += sx; ix++; } else { y += sy; iy++; }
    if (walls.has(key(x, y))) return false;
  }
  return true;
}

export function validTargets(state, abilityId) {
  const a = ABILITIES[abilityId];
  if (!Object.hasOwn(ABILITIES, abilityId) || !state.hero.abilities.includes(abilityId) || state.status !== 'combat') return [];
  if (a.kind === 'heal') return [state.hero];
  if (a.kind === 'blink') return [];
  return alive(state).filter(e => distance(state.hero, e) <= a.range && hasLineOfSight(state, state.hero, e));
}

function gainXp(state, amount) {
  state.hero.xp += Math.round(amount * (1 + stats(state).xp));
  while (state.hero.xp >= nextLevelXp(state.hero.level)) {
    state.hero.xp -= nextLevelXp(state.hero.level);
    state.hero.level++; state.hero.talentPoints++;
    const s = stats(state); state.hero.hp = Math.min(s.maxHp, state.hero.hp + 24); state.hero.mana = s.maxMana;
    write(state, `Level ${state.hero.level}! You gained a talent point. Health and mana restored.`, 'level');
  }
}

function makeLoot(state, epic = false) {
  const pool = SHOP.filter(i => i.slot !== 'consumable' && (epic ? i.rarity === 'epic' : i.rarity === 'rare'));
  const base = pool[Math.floor(random(state) * pool.length)] || SHOP.find(i => i.slot !== 'consumable');
  const item = { ...clone(base), baseId: base.id, id: `loot-${++state.uid}`, price: base.price };
  if (state.hero.inventory.length >= 60) {
    const gold = Math.floor(item.price / 2);
    state.hero.gold += gold; state.goldEarned += gold;
    write(state, `Inventory full. ${item.name} salvaged for ${gold} gold.`, 'loot');
    return;
  }
  state.hero.inventory.push(item);
  write(state, `Loot found: ${item.name} (${item.rarity}). Open your inventory to equip it.`, 'loot');
}

function defeat(state, enemy) {
  state.kills++;
  const gold = Math.round(enemy.gold * (1 + stats(state).gold));
  state.hero.gold += gold; state.goldEarned += gold;
  gainXp(state, enemy.xp);
  write(state, `${enemy.name} defeated. +${enemy.xp} XP · +${gold} gold`, 'loot');
  if (enemy.boss) {
    state.bossesDefeated++; makeLoot(state, true);
    const pools = { 3: ['fireball', 'frostNova', 'axe'], 6: ['chainLightning', 'heal', 'wand'], 9: ['whirlwind', 'blink', 'sword'] };
    const choices = (pools[state.floor] || pools[3]).filter(id => !state.hero.abilities.includes(id));
    if (!choices.length) choices.push(...Object.keys(ABILITIES).filter(id => !state.hero.abilities.includes(id)).slice(0, 3));
    if (choices.length) state.reward = { boss: enemy.name, choices };
    write(state, `The power of ${enemy.name} is yours. Choose one new spell or weapon discipline.`, 'boss');
  } else if (random(state) < 0.22) makeLoot(state);
}

function clearCheck(state) {
  if (alive(state).length) return;
  state.status = 'cleared';
  const gold = 15 + state.floor * 5;
  state.hero.gold += gold; state.goldEarned += gold;
  write(state, `Floor ${state.floor} cleared. +${gold} gold. Descend deeper or return to town.`, 'explore');
  state.hero.mana = Math.min(stats(state).maxMana, state.hero.mana + 12);
  if (state.merchant) write(state, 'A hooded merchant steps from the shadows. Rare wares await.', 'merchant');
}

function damageEnemy(state, enemy, amount, ability) {
  const critical = random(state) < stats(state).crit;
  const damage = Math.max(1, Math.round(amount * (critical ? 1.5 : 1)));
  enemy.hp = Math.max(0, enemy.hp - damage);
  write(state, `${ability.name} hits ${enemy.name} for ${damage}${critical ? ' critical' : ''} damage.`, 'attack');
  const s = stats(state);
  if (s.lifesteal) state.hero.hp = Math.min(s.maxHp, state.hero.hp + s.lifesteal);
  if (ability.effect === 'slow' || ability.id === 'frostNova') enemy.slowed = 2;
  if (ability.effect === 'stun') enemy.stunned = 1;
  if (enemy.hp === 0) defeat(state, enemy);
}

function useAbility(state, action) {
  if (state.status !== 'combat' || state.reward) return result(false, 'Resolve the current encounter first.');
  const id = action.id || action.abilityId;
  const a = ABILITIES[id];
  if (!Object.hasOwn(ABILITIES, id) || !state.hero.abilities.includes(id)) return result(false, 'You have not learned that ability.');
  if (state.ap < a.ap) return result(false, 'Not enough action points. End your turn to refresh them.');
  if (state.hero.mana < a.mana) return result(false, 'Not enough mana. Use a mana potion or end your turn to regenerate.');
  if (a.kind === 'heal') {
    const s = stats(state), amount = Math.min(s.maxHp - state.hero.hp, a.damage + s.spellDamage);
    if (!amount) return result(false, 'Your health is already full.');
    state.hero.hp += amount; state.ap -= a.ap; state.hero.mana -= a.mana;
    return result(true, write(state, `${a.name} restores ${amount} health.`, 'heal'));
  }
  if (a.kind === 'blink') {
    const x = action.x, y = action.y;
    if (!Number.isInteger(x) || !Number.isInteger(y) || !inside(x, y) || blocked(state).has(key(x, y)) || distance(state.hero, { x, y }) > a.range || distance(state.hero, {x, y}) === 0) return result(false, 'Choose an empty tile within blink range.');
    state.hero.x = x; state.hero.y = y; state.ap -= a.ap; state.hero.mana -= a.mana;
    return result(true, write(state, 'You blink through the shadows.', 'move'));
  }
  const enemy = alive(state).find(e => e.id === action.targetId || (e.x === action.x && e.y === action.y));
  if (!enemy) return result(false, 'Choose an enemy to target.');
  if (!validTargets(state, id).some(e => e.id === enemy.id)) return result(false, `Target is out of range (${a.range} tiles) or blocked by a wall.`);
  state.ap -= a.ap; state.hero.mana -= a.mana;
  const s = stats(state), damage = a.damage + (a.kind === 'spell' ? s.spellDamage : s.damage) + (state.hero.level - 1) * 2;
  damageEnemy(state, enemy, damage, a);
  if (a.id === 'chainLightning' || a.effect === 'chain') {
    const secondary = alive(state).find(e => e.id !== enemy.id && distance(e, enemy) <= 3);
    if (secondary) damageEnemy(state, secondary, Math.ceil(damage * .6), a);
  }
  if (['frostNova', 'whirlwind', 'cleave'].includes(a.id) || a.effect === 'area' || a.effect === 'splash') {
    for (const other of [...alive(state)]) if (other.id !== enemy.id && distance(other, enemy) <= 1) damageEnemy(state, other, Math.round(damage * .65), a);
  }
  clearCheck(state);
  return result(true, 'Ability used.');
}

function enemyTurn(state) {
  if (state.status !== 'combat' || state.reward) return result(false, 'There are no enemies left to fight.');
  for (const e of alive(state)) {
    if (e.stunned > 0) { e.stunned--; write(state, `${e.name} is stunned.`, 'info'); continue; }
    const inRange = () => distance(e, state.hero) <= e.range && hasLineOfSight(state, e, state.hero);
    if (!inRange()) {
      const possible = paths(state, e, e.slowed > 0 ? Math.max(1, e.movement - 1) : e.movement, blocked(state, e.id, true));
      possible.sort((a, b) => {
        const da = distance(a, state.hero), db = distance(b, state.hero);
        const av = da <= e.range && hasLineOfSight(state, a, state.hero), bv = db <= e.range && hasLineOfSight(state, b, state.hero);
        return Number(bv) - Number(av) || da - db || a.cost - b.cost;
      });
      const to = possible[0]; e.x = to.x; e.y = to.y;
    }
    if (e.slowed > 0) e.slowed--;
    if (inRange()) {
      const damage = Math.max(1, e.damage - stats(state).armor - (state.guarding ? 5 : 0));
      state.hero.hp = Math.max(0, state.hero.hp - damage);
      write(state, `${e.name} ${e.range > 1 ? 'shoots' : 'strikes'} you for ${damage} damage.`, 'damage');
      if (!state.hero.hp) {
        state.status = 'dead';
        write(state, 'You fall in the dungeon. Return to town to recover; a portion of your gold will be lost.', 'danger');
        return result(true, 'You have fallen.');
      }
    }
  }
  state.guarding = false; state.turn++; state.ap = 2; state.movement = stats(state).movement;
  state.hero.mana = Math.min(stats(state).maxMana, state.hero.mana + stats(state).manaRegen);
  write(state, `Turn ${state.turn}. Your actions and movement are refreshed.`, 'turn');
  return result(true, 'Your turn.');
}

export function canLearn(state, id) {
  const t = TALENTS.find(t => t.id === id);
  return Boolean(t && state.hero.talentPoints > 0 && state.hero.level >= t.level && (state.hero.talents[id] || 0) < t.maxRank && t.requires.every(p => (state.hero.talents[p] || 0) > 0));
}

export function shopItems(state) {
  if (state.status === 'town') return SHOP.filter(i => i.rarity !== 'epic');
  if (state.status === 'cleared' && state.merchant) return SHOP;
  return [];
}

export function act(state, action) {
  if (!action || typeof action.type !== 'string') return result(false, 'Unknown action.');
  const h = state.hero;
  switch (action.type) {
    case 'move': {
      const to = reachable(state).find(p => p.x === action.x && p.y === action.y);
      if (!to) return result(false, 'That tile is blocked or beyond your movement allowance.');
      h.x = to.x; h.y = to.y; state.movement -= to.cost;
      return result(true, write(state, `Moved ${to.cost} tile${to.cost === 1 ? '' : 's'}. ${state.movement} movement remaining.`, 'move'));
    }
    case 'ability': return useAbility(state, action);
    case 'endTurn': return enemyTurn(state);
    case 'guard':
      if (state.status !== 'combat' || state.ap < 1 || state.reward) return result(false, 'Guard requires one action point during combat.');
      if (state.guarding) return result(false, 'You are already guarding.');
      state.ap--; state.guarding = true;
      return result(true, write(state, 'Guard raised. Incoming attacks deal 5 less damage this turn.', 'info'));
    case 'potion': case 'manaPotion': {
      if (state.status === 'dead' || state.status === 'victory' || state.reward) return result(false, 'You cannot use a potion now.');
      const mana = action.type === 'manaPotion', field = mana ? 'manaPotions' : 'potions', resource = mana ? 'mana' : 'hp', cap = stats(state)[mana ? 'maxMana' : 'maxHp'];
      if (h[field] <= 0) return result(false, 'You have no potions of that type.');
      if (h[resource] >= cap) return result(false, `${mana ? 'Mana' : 'Health'} is already full.`);
      if (state.status === 'combat' && state.ap < 1) return result(false, 'A potion costs one action point.');
      const amount = Math.min(cap - h[resource], mana ? 25 : 40);
      h[resource] += amount; h[field]--; if (state.status === 'combat') state.ap--;
      return result(true, write(state, `Potion restored ${amount} ${mana ? 'mana' : 'health'}.`, 'heal'));
    }
    case 'learn': {
      if (!state.reward?.choices.includes(action.id)) return result(false, 'Choose one of the boss rewards.');
      h.abilities.push(action.id); state.reward = null;
      return result(true, write(state, `You learned ${ABILITIES[action.id].name}.`, 'level'));
    }
    case 'talent': {
      if (!canLearn(state, action.id)) return result(false, 'Talent requirements are not met, or no talent points remain.');
      const before = stats(state), talent = TALENTS.find(t => t.id === action.id);
      h.talents[action.id] = (h.talents[action.id] || 0) + 1; h.talentPoints--;
      const after = stats(state); h.hp += after.maxHp - before.maxHp; h.mana += after.maxMana - before.maxMana;
      return result(true, write(state, `${talent.name} upgraded to rank ${h.talents[action.id]}.`, 'level'));
    }
    case 'equip': {
      const index = h.inventory.findIndex(i => i.id === action.itemId);
      if (index < 0) return result(false, 'Item not found.');
      if (state.status === 'dead' || state.reward) return result(false, 'You cannot change equipment now.');
      const item = h.inventory[index];
      if (!['weapon', 'armor', 'charm'].includes(item.slot)) return result(false, 'That item cannot be equipped.');
      if (state.status === 'combat' && state.ap < 1) return result(false, 'Changing equipment in combat costs one action point.');
      const previous = h.equipment[item.slot]; h.inventory.splice(index, 1); if (previous) h.inventory.push(previous);
      h.equipment[item.slot] = item;
      if (state.status === 'combat') state.ap--;
      const s = stats(state); h.hp = Math.min(h.hp, s.maxHp); h.mana = Math.min(h.mana, s.maxMana); state.movement = Math.min(state.movement, s.movement);
      return result(true, write(state, `Equipped ${item.name}.`, 'loot'));
    }
    case 'buy': {
      const item = shopItems(state).find(i => i.id === action.itemId);
      if (!item) return result(false, 'That item is not available here.');
      if (h.gold < item.price) return result(false, 'Not enough gold.');
      if (item.slot !== 'consumable' && h.inventory.length >= 60) return result(false, 'Inventory is full. Sell some equipment first.');
      h.gold -= item.price;
      if (item.slot === 'consumable') h[item.id === 'manaPotion' ? 'manaPotions' : 'potions']++;
      else h.inventory.push({ ...clone(item), baseId: item.id, id: `bought-${++state.uid}` });
      return result(true, write(state, `Purchased ${item.name} for ${item.price} gold.`, 'merchant'));
    }
    case 'sell': {
      if (state.status !== 'town' && !(state.status === 'cleared' && state.merchant)) return result(false, 'Visit a merchant to sell equipment.');
      const index = h.inventory.findIndex(i => i.id === action.itemId);
      if (index < 0) return result(false, 'Item not found.');
      const item = h.inventory[index], gold = Math.max(1, Math.floor(item.price / 2));
      h.inventory.splice(index, 1); h.gold += gold;
      return result(true, write(state, `Sold ${item.name} for ${gold} gold.`, 'merchant'));
    }
    case 'town': case 'retreat': {
      if (state.status === 'town') return result(false, 'You are already in town.');
      if (state.reward) return result(false, 'Choose your boss reward before leaving.');
      const loss = state.status === 'dead' ? Math.floor(h.gold * .3) : state.status === 'combat' ? Math.floor(h.gold * .1) : 0;
      h.gold -= loss; state.status = 'town'; state.ap = 2; state.guarding = false;
      const s = stats(state); h.hp = s.maxHp; h.mana = s.maxMana;
      write(state, `Returned to Emberfall. Health and mana restored.${loss ? ` Lost ${loss} gold ${h.hp === 0 ? 'during rescue' : 'on the journey'}.` : ''}`, 'explore');
      return result(true, 'Welcome to Emberfall.');
    }
    case 'rest': {
      if (state.status !== 'town') return result(false, 'You can rest at the town inn.');
      const s = stats(state); h.hp = s.maxHp; h.mana = s.maxMana;
      return result(true, write(state, 'You rest by the hearth. Health and mana fully restored.', 'heal'));
    }
    case 'enterDungeon': {
      if (state.status !== 'town') return result(false, 'You can enter a dungeon from town.');
      generateFloor(state); write(state, `You return to floor ${state.floor}. Enemies have regrouped.`, 'explore');
      return result(true, 'Dungeon entered.');
    }
    case 'descend': {
      if (state.status !== 'cleared') return result(false, 'Defeat every enemy before descending.');
      if (state.reward) return result(false, 'Choose your boss reward before descending.');
      if (state.floor >= 9) {
        state.status = 'victory'; write(state, 'The Hollow King is defeated. The crypt is free, and your legend begins.', 'boss');
        return result(true, 'Dungeon conquered!');
      }
      state.floor++; generateFloor(state);
      h.hp = Math.min(stats(state).maxHp, h.hp + 12);
      write(state, `You descend to floor ${state.floor}.${state.floor % 3 === 0 ? ' A powerful presence waits ahead.' : ''}`, 'explore');
      return result(true, `Entered floor ${state.floor}.`);
    }
    default: return result(false, 'Unknown action.');
  }
}

export function validateSave(value) {
  // Rebuild only recognized fields, then validate every simulation value. Import
  // never executes code or merges user-provided prototypes into game objects.
  const fail = message => { throw new Error(`Invalid save: ${message}`); };
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== SAVE_VERSION || typeof value.classId !== 'string' || !Object.hasOwn(CLASSES, value.classId)) fail('unsupported format or hero class.');
  let state;
  try { state = clone(value); } catch { fail('save is not JSON data.'); }
  const int = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
  const finite = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
  const point = p => p && int(p.x, 0, GRID.width - 1) && int(p.y, 0, GRID.height - 1);
  if (!int(state.floor, 1, 9) || !int(state.turn, 1, 1000000) || !int(state.seed, 0, 4294967295) || !int(state.uid, 0, 1000000)) fail('invalid dungeon metadata.');
  if (!['combat', 'cleared', 'town', 'dead', 'victory'].includes(state.status) || !int(state.ap, 0, 2) || !int(state.movement, 0, 30)) fail('invalid turn state.');
  const h = state.hero;
  if (!point(h) || typeof h.name !== 'string' || h.name.length > 40 || !int(h.level, 1, 100) || !int(h.xp, 0, nextLevelXp(h.level) - 1) || !int(h.gold, 0, 10000000) || !int(h.talentPoints, 0, 1000) || !int(h.potions, 0, 10000) || !int(h.manaPotions, 0, 10000)) fail('invalid hero values.');
  if (!Array.isArray(h.abilities) || h.abilities.length < 1 || h.abilities.length > Object.keys(ABILITIES).length || new Set(h.abilities).size !== h.abilities.length || h.abilities.some(id => typeof id !== 'string' || !Object.hasOwn(ABILITIES, id))) fail('unknown abilities.');
  if (!h.talents || typeof h.talents !== 'object' || Array.isArray(h.talents) || Object.entries(h.talents).some(([id, rank]) => { const t = TALENTS.find(t => t.id === id); return !t || !int(rank, 0, t.maxRank); })) fail('invalid talents.');
  for (const [id, rank] of Object.entries(h.talents)) {
    if (!rank) continue;
    const talent = TALENTS.find(t => t.id === id);
    if (h.level < talent.level || !talent.requires.every(p => h.talents[p] > 0)) fail('talent prerequisites not satisfied.');
  }
  if (Object.values(h.talents).reduce((a, b) => a + b, 0) + h.talentPoints > h.level - 1) fail('more talent points than earned.');
  const itemValid = item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || item.id.length > 80 || typeof item.name !== 'string' || item.name.length > 100 || typeof item.description !== 'string' || item.description.length > 500 || !['weapon', 'armor', 'charm'].includes(item.slot) || !['common', 'rare', 'epic'].includes(item.rarity) || !finite(item.price, 0, 100000)) return false;
    const base = item.id === 'starting-weapon' ? createGame(state.classId).hero.equipment.weapon : SHOP.find(i => i.id === item.baseId);
    if (!base || base.slot !== item.slot || !item.bonus || typeof item.bonus !== 'object') return false;
    return JSON.stringify(item.bonus) === JSON.stringify(base.bonus);
  };
  if (!h.equipment || typeof h.equipment !== 'object' || Object.keys(h.equipment).some(k => !['weapon', 'armor', 'charm'].includes(k)) || !Array.isArray(h.inventory) || h.inventory.length > 60 || h.inventory.some(i => !itemValid(i))) fail('invalid inventory.');
  for (const [slot, item] of Object.entries(h.equipment)) if (item !== null && (!itemValid(item) || item.slot !== slot)) fail('invalid equipped item.');
  const allItems = [...h.inventory, ...Object.values(h.equipment).filter(Boolean)];
  if (new Set(allItems.map(i => i.id)).size !== allItems.length) fail('duplicate items.');
  const s = stats(state);
  if (!finite(h.hp, 0, s.maxHp) || !finite(h.mana, 0, s.maxMana)) fail('health or mana exceeds maximum.');
  if (!Array.isArray(state.walls) || state.walls.length > 50 || state.walls.some(p => !point(p)) || new Set(state.walls.map(p => key(p.x, p.y))).size !== state.walls.length) fail('invalid walls.');
  if (!Array.isArray(state.enemies) || state.enemies.length > 20) fail('invalid enemies.');
  const occupied = new Set(state.walls.map(p => key(p.x, p.y)));
  if (occupied.has(key(h.x, h.y))) fail('hero is inside a wall.');
  occupied.add(key(h.x, h.y));
  for (const e of state.enemies) {
    if (!point(e) || typeof e.type !== 'string' || !Object.hasOwn(ENEMY_TYPES, e.type) || typeof e.id !== 'string' || e.id.length > 80 || typeof e.name !== 'string' || e.name.length > 100 || !int(e.maxHp, 1, 5000) || !int(e.hp, 0, e.maxHp) || !int(e.damage, 0, 1000) || !int(e.movement, 1, 10) || !int(e.range, 1, 10) || !int(e.xp, 0, 10000) || !int(e.gold, 0, 10000) || !int(e.stunned, 0, 10) || !int(e.slowed, 0, 10)) fail('invalid enemy values.');
    if (e.hp > 0) { const k = key(e.x, e.y); if (occupied.has(k)) fail('units overlap.'); occupied.add(k); }
  }
  if (new Set(state.enemies.map(e => e.id)).size !== state.enemies.length) fail('duplicate enemies.');
  if (state.status === 'cleared' && alive(state).length) fail('uncleared dungeon.');
  if (state.status === 'combat' && (!alive(state).length || h.hp <= 0)) fail('invalid encounter.');
  if (state.status === 'dead' && h.hp !== 0) fail('invalid death state.');
  if (state.status === 'victory' && (state.floor !== 9 || alive(state).length)) fail('invalid victory state.');
  if (typeof state.merchant !== 'boolean' || state.merchant !== (state.floor >= 4 && state.floor % 3 === 1)) fail('invalid merchant state.');
  if (state.reward !== null && (!state.reward || typeof state.reward.boss !== 'string' || state.reward.boss.length > 100 || !Array.isArray(state.reward.choices) || !state.reward.choices.length || state.reward.choices.length > 3 || state.reward.choices.some(id => typeof id !== 'string' || !Object.hasOwn(ABILITIES, id) || h.abilities.includes(id)))) fail('invalid boss reward.');
  if (!Array.isArray(state.log) || state.log.length > 60 || state.log.some(l => !l || typeof l.text !== 'string' || l.text.length > 1000 || typeof l.type !== 'string' || l.type.length > 30 || !int(l.turn, 1, state.turn))) fail('invalid journal.');
  for (const k of ['kills', 'bossesDefeated', 'goldEarned']) if (!int(state[k], 0, 10000000)) fail('invalid progress counters.');
  if (!int(state.deepestFloor, state.floor, 9)) fail('invalid deepest floor.');
  state.guarding = state.guarding === true;
  return state;
}
