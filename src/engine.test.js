import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, act, stats, reachable, validTargets, hasLineOfSight, validateSave, nextLevelXp, canLearn, shopItems, TALENTS, CLASSES } from './engine.js';

const copy = o => JSON.parse(JSON.stringify(o));
const oneEnemy = s => { s.walls = []; s.enemies = [s.enemies[0]]; s.enemies[0].x = s.hero.x + 1; s.enemies[0].y = s.hero.y; return s.enemies[0]; };

test('class presets retain distinct weapons, skills, movement and resource pools', () => {
  const classes = Object.keys(CLASSES).map(id => createGame(id));
  assert.equal(new Set(classes.map(s => stats(s).movement)).size, 3);
  for (const s of classes) {
    assert.deepEqual(s.hero.abilities, [CLASSES[s.classId].weapon, CLASSES[s.classId].skill]);
    assert.equal(validateSave(copy(s)).classId, s.classId);
  }
});

test('movement follows traversable paths, consumes allowance, and never consumes AP', () => {
  const s = createGame(); s.walls = [{x: 3, y: 6}];
  const cells = reachable(s);
  assert.equal(cells.some(p => p.x === 3 && p.y === 6), false);
  assert.equal(cells.some(p => p.x === 4 && p.y === 6), false, 'Manhattan distance cannot bypass a wall');
  assert.equal(act(s, {type: 'move', x: 2, y: 4}).ok, true);
  assert.equal(s.movement, 1); assert.equal(s.ap, 2);
  const before = copy(s);
  assert.equal(act(s, {type: 'move', x: 10, y: 8}).ok, false);
  assert.deepEqual(s, before);
});

test('ranged attacks obey walls and reject diagonal corner shooting', () => {
  const s = createGame('hunter'); s.walls = [{x: 3, y: 6}];
  const e = s.enemies[0]; e.x = 4; e.y = 6;
  assert.equal(validTargets(s, 'bow').some(p => p.id === e.id), false);
  assert.equal(hasLineOfSight(s, {x: 2, y: 6}, {x: 3, y: 7}), false);
  assert.equal(act(s, {type: 'ability', id: 'bow', targetId: e.id}).ok, false);
  assert.equal(s.ap, 2);
});

test('spells cost AP and mana while basic attacks only cost AP', () => {
  const s = createGame(); const e = oneEnemy(s); e.hp = e.maxHp = 100;
  const mana = s.hero.mana;
  assert.equal(act(s, {type: 'ability', id: 'staff', targetId: e.id}).ok, true);
  assert.equal(s.hero.mana, mana); assert.equal(s.ap, 1);
  assert.equal(act(s, {type: 'ability', id: 'lightning', targetId: e.id}).ok, true);
  assert.equal(s.hero.mana, mana - 7); assert.equal(s.ap, 0);
  const hp = e.hp;
  assert.equal(act(s, {type: 'ability', id: 'staff', targetId: e.id}).ok, false);
  assert.equal(e.hp, hp);
  assert.equal(act(s, {type: 'endTurn'}).ok, true);
  assert.equal(s.turn, 2); assert.equal(s.ap, 2); assert.equal(s.movement, 3);
  assert.equal(s.hero.mana, mana - 4);
});

test('defeating a floor awards experience, gold, a talent point and permits descent', () => {
  const s = createGame(); const e = oneEnemy(s); e.hp = 1;
  s.hero.xp = nextLevelXp(1) - e.xp;
  assert.equal(act(s, {type: 'ability', id: 'staff', targetId: e.id}).ok, true);
  assert.equal(s.status, 'cleared'); assert.equal(s.hero.level, 2); assert.equal(s.hero.talentPoints, 1);
  const t = TALENTS.find(t => t.requires.length === 0 && t.level === 1);
  assert.equal(canLearn(s, t.id), true);
  assert.equal(act(s, {type: 'talent', id: t.id}).ok, true);
  assert.equal(s.hero.talentPoints, 0); assert.equal(s.hero.talents[t.id], 1);
  assert.equal(act(s, {type: 'descend'}).ok, true);
  assert.equal(s.floor, 2); assert.equal(s.status, 'combat');
  assert.equal(validateSave(copy(s)).floor, 2);
});

test('bosses guarantee epic loot and offer a single permanent learned choice', () => {
  const s = createGame(); s.floor = 3; s.deepestFloor = 3;
  const e = oneEnemy(s); e.boss = true; e.hp = 1; e.name = 'Test Warden';
  act(s, {type: 'ability', id: 'staff', targetId: e.id});
  assert.equal(s.hero.inventory.some(i => i.rarity === 'epic'), true);
  assert.ok(s.reward.choices.length >= 2);
  const id = s.reward.choices[0];
  assert.equal(act(s, {type: 'descend'}).ok, false);
  assert.equal(act(s, {type: 'learn', id}).ok, true);
  assert.equal(s.reward, null); assert.equal(s.hero.abilities.includes(id), true);
  assert.equal(act(s, {type: 'learn', id}).ok, false);
});

test('town shop purchases, equipment swaps and selling preserve gold and item identity', () => {
  const s = createGame();
  assert.equal(shopItems(s).length, 0);
  act(s, {type: 'town'});
  assert.equal(s.hero.hp, stats(s).maxHp);
  const item = shopItems(s).find(i => i.slot === 'weapon' && i.rarity === 'common');
  const gold = s.hero.gold;
  assert.equal(act(s, {type: 'buy', itemId: item.id}).ok, true);
  assert.equal(s.hero.gold, gold - item.price);
  const bought = s.hero.inventory[0];
  assert.notEqual(bought.id, item.id);
  assert.equal(act(s, {type: 'equip', itemId: bought.id}).ok, true);
  assert.equal(s.hero.equipment.weapon.id, bought.id);
  const original = s.hero.inventory[0];
  assert.equal(act(s, {type: 'sell', itemId: original.id}).ok, true);
  assert.equal(s.hero.inventory.length, 0);
  assert.equal(validateSave(copy(s)).hero.equipment.weapon.id, bought.id);
});

test('deep merchant sells epic equipment after floor combat is cleared', () => {
  const s = createGame(); s.floor = 4; s.deepestFloor = 4; s.merchant = true;
  assert.equal(shopItems(s).length, 0);
  s.status = 'cleared'; s.enemies.forEach(e => e.hp = 0);
  assert.ok(shopItems(s).some(i => i.rarity === 'epic'));
});

test('import rejects corrupt ranges, false prerequisites and duplicate or forged inventory', () => {
  const s = createGame();
  const cases = [
    v => v.hero.hp = 100000,
    v => v.hero.x = -1,
    v => v.hero.talents = { avatar: 1 },
    v => v.hero.abilities = ['javascript:alert(1)'],
    v => v.enemies[0].range = 999,
    v => v.hero.equipment.weapon.bonus = { damage: 9000 },
    v => v.hero.inventory.push(copy(v.hero.equipment.weapon)),
    v => v.enemies[0].x = v.hero.x,
    v => v.version = 999,
  ];
  for (const mutate of cases) {
    const broken = copy(s); mutate(broken);
    if (broken.enemies[0].x === broken.hero.x) broken.enemies[0].y = broken.hero.y;
    assert.throws(() => validateSave(broken), /Invalid save:/);
  }
  const imported = validateSave(copy(s)); imported.hero.gold++;
  assert.notEqual(imported.hero.gold, s.hero.gold, 'import returns an independent state');
});

test('splash damage affects adjacent enemies and leaves distant foes unharmed', () => {
  const s = createGame(); s.walls = []; s.hero.abilities.push('fireball');
  const [a,b,c] = s.enemies;
  Object.assign(a,{x:4,y:6,hp:100,maxHp:100});
  Object.assign(b,{x:4,y:5,hp:100,maxHp:100});
  Object.assign(c,{x:9,y:2,hp:100,maxHp:100});
  assert.equal(act(s,{type:'ability',id:'fireball',targetId:a.id}).ok,true);
  assert.ok(a.hp<100); assert.ok(b.hp<100); assert.equal(c.hp,100);
});

test('every generated floor has valid, distinct spawn positions for every class', () => {
  for (const classId of Object.keys(CLASSES)) {
    const s = createGame(classId);
    for (let floor = 1; floor <= 9; floor++) {
      s.floor = floor; s.deepestFloor = floor; s.status = 'town';
      assert.equal(act(s, {type:'enterDungeon'}).ok, true);
      assert.doesNotThrow(() => validateSave(copy(s)), `${classId} floor ${floor}`);
    }
  }
});

test('prototype property names cannot masquerade as class or ability ids', () => {
  assert.equal(createGame('__proto__').classId, 'shaman');
  for (const id of ['constructor', '__proto__', 'toString']) {
    const s = createGame(); s.hero.abilities = [id];
    assert.throws(() => validateSave(s), /Invalid save/);
    const a = createGame(); a.classId = id;
    assert.throws(() => validateSave(a), /Invalid save/);
  }
});
