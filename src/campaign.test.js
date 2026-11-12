import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, act, stats, reachable, validTargets, ABILITIES, canLearn, validateSave,
} from './engine.js';

const copy = value => JSON.parse(JSON.stringify(value));
const offensive = ability => !['heal', 'blink'].includes(ability.kind);
const nearestEnemy = (state, position) => Math.min(...state.enemies
  .filter(enemy => enemy.hp > 0)
  .map(enemy => Math.abs(enemy.x - position.x) + Math.abs(enemy.y - position.y)));

// This small player policy exercises a whole campaign through the public API.
// It chooses attacks, moves, talents, loot, healing and boss rewards without
// changing the actual game state outside act(). Every action must leave a save
// that can be exported and imported, including all generated dungeon floors.
function chooseAction(state) {
  const hero = state.hero;
  if (state.reward) {
    return {
      type: 'learn',
      id: state.reward.choices.find(id => ['fireball', 'heal'].includes(id)) || state.reward.choices[0],
    };
  }

  const talentPriority = state.classId === 'shaman'
    ? ['spark', 'overcharge', 'renewingSpirit', 'spiritWard', 'tempest', 'vitality', 'ironSkin']
    : ['sharpEdge', 'executioner', 'ironSkin', 'bulwark', 'vitality', 'spiritWard'];
  const talent = talentPriority.find(id => canLearn(state, id));
  if (talent) return { type: 'talent', id: talent };

  if (state.status === 'cleared') {
    const weights = {
      damage: state.classId === 'shaman' ? 1 : 2,
      spellDamage: state.classId === 'shaman' ? 2 : 1,
      armor: 8, maxHp: 0.3, maxMana: 0.1, manaRegen: 3, movement: 3,
    };
    const itemScore = item => Object.entries(item?.bonus || {})
      .reduce((score, [key, value]) => score + value * (weights[key] || 0), 0);
    const improvement = hero.inventory.find(item => itemScore(item) > itemScore(hero.equipment[item.slot]));
    return improvement ? { type: 'equip', itemId: improvement.id } : { type: 'descend' };
  }

  const attributes = stats(state);
  if (hero.hp < attributes.maxHp - 40 && hero.potions > 0 && state.ap > 0) return { type: 'potion' };
  if (hero.hp < attributes.maxHp - 30 && hero.abilities.includes('heal') && hero.mana >= 10 && state.ap > 0) {
    return { type: 'ability', id: 'heal' };
  }

  const usableAbilities = hero.abilities.filter(id => {
    const ability = ABILITIES[id];
    return offensive(ability) && ability.ap <= state.ap && ability.mana <= hero.mana;
  });
  const attacks = usableAbilities.flatMap(id => {
    const ability = ABILITIES[id];
    const damage = ability.damage + (ability.kind === 'spell' ? attributes.spellDamage : attributes.damage)
      + (hero.level - 1) * 2;
    return validTargets(state, id).map(enemy => ({
      id, targetId: enemy.id, cost: ability.mana,
      score: Math.min(enemy.hp, damage) / ability.ap + (enemy.hp <= damage ? 10 : 0)
        + (enemy.type === 'archer' ? 2 : 0),
    }));
  });
  attacks.sort((a, b) => b.score - a.score || a.cost - b.cost);
  if (attacks.length) return { type: 'ability', id: attacks[0].id, targetId: attacks[0].targetId };

  if (state.movement > 0 && state.ap > 0) {
    const destinations = reachable(state).map(position => {
      const hypothetical = copy(state);
      hypothetical.hero.x = position.x;
      hypothetical.hero.y = position.y;
      let damage = 0;
      for (const id of usableAbilities) {
        const ability = ABILITIES[id];
        if (validTargets(hypothetical, id).length) {
          damage = Math.max(damage, (ability.damage
            + (ability.kind === 'spell' ? attributes.spellDamage : attributes.damage)) / ability.ap);
        }
      }
      return { ...position, score: damage * 5 - nearestEnemy(state, position) };
    });
    destinations.sort((a, b) => b.score - a.score || a.cost - b.cost);
    if (destinations.length && destinations[0].score > -nearestEnemy(state, hero)) {
      return { type: 'move', x: destinations[0].x, y: destinations[0].y };
    }
  }

  if (state.ap > 0 && hero.mana < 10 && hero.manaPotions > 0) return { type: 'manaPotion' };
  if (state.ap > 0 && !state.guarding) return { type: 'guard' };
  return { type: 'endTurn' };
}

for (const classId of ['shaman', 'hunter', 'knight']) {
  test(`${classId} can complete all nine floors with legal actions and importable progress`, () => {
    const state = createGame(classId);
    let steps = 0;
    while (!['dead', 'victory'].includes(state.status) && steps < 1500) {
      const action = chooseAction(state);
      const outcome = act(state, action);
      assert.equal(outcome.ok, true, `Floor ${state.floor}: ${JSON.stringify(action)}: ${outcome.message}`);
      assert.doesNotThrow(() => validateSave(copy(state)), `Invalid save after ${JSON.stringify(action)}`);
      steps++;
    }
    assert.equal(state.status, 'victory', `Campaign stopped at floor ${state.floor} after ${steps} actions`);
    assert.equal(state.floor, 9);
    assert.equal(state.bossesDefeated, 3);
    assert.equal(state.kills, 27);
    assert.ok(state.hero.hp > 0);
  });
}
