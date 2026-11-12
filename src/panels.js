import { TALENTS, SHOP, ABILITIES, CLASSES } from './data.js';
import { stats, canLearn, nextLevelXp, shopItems } from './engine.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const icons = {
  weapon: '<path d="m7 17 10-10 3-1-1 3L9 19M6 15l5 5M4 21l3-3"/>',
  armor: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="M12 7v10M8 12h8"/>',
  charm: '<path d="m12 3 5 7-5 11-5-11zM7 10h10"/>',
  gold: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 4 16 4 16 0V6M4 12v5c0 4 16 4 16 0"/>',
  heart: '<path d="M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 8 15 8 15S25 10 20 5Z"/>',
  mana: '<path d="M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
  spark: '<path d="m14 2-9 12h7l-2 8 9-12h-7z"/>',
  move: '<path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
  book: '<path d="M12 5v16M3 3c4 0 7 0 9 2 2-2 5-2 9-2v15c-4 0-7 0-9 3-2-3-5-3-9-3Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  camp: '<path d="m3 21 9-18 9 18H3Zm5 0 4-8 4 8M4 3l4 4M20 3l-4 4"/>',
};
const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const button = (label, action, id = '', disabled = false, secondary = false) => `<button class="button ${secondary ? 'button-secondary' : 'button-primary'}" data-action="${escape(action)}"${id ? ` data-id="${escape(id)}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
const heading = (eyebrow, title, description, extra = '') => `<div class="panel-heading"><div><span class="panel-eyebrow">${eyebrow}</span><h2 class="panel-title">${title}</h2><p class="panel-intro">${description}</p></div>${extra}</div>`;
const empty = (title, detail) => `<div class="panel-empty">${icon('charm', 32)}<h3>${title}</h3><p>${detail}</p></div>`;
const labels = { maxHp: 'health', maxMana: 'mana', damage: 'weapon damage', spellDamage: 'spell damage', armor: 'armor', movement: 'movement', manaRegen: 'mana / turn', crit: 'critical chance', gold: 'gold found', xp: 'experience', lifesteal: 'life steal', range: 'range' };
function bonusText(bonus = {}) {
  return Object.entries(bonus).map(([key, value]) => `+${Number.isInteger(value) ? value : Math.round(value * 100) + '%'} ${labels[key] || key}`).join(' · ') || 'An adventurer’s essential';
}
function itemIcon(item) {
  const raw = String(item?.icon || '');
  const asset = /bow|hunter/.test(raw) ? 'bow' : /staff|wand/.test(raw) ? 'staff' : /potion/.test(raw) ? 'potion' : /sword|axe/.test(raw) ? 'sword' : /crystal/.test(raw) ? 'crystal' : null;
  return `<span class="item-icon rarity-${escape(item?.rarity || 'common')}">${asset ? `<img src="./assets/${asset}.svg" alt="" width="40" height="40">` : icon(item?.slot || 'charm', 27)}</span>`;
}
function itemCard(item, controls = '') {
  return `<article class="item-card rarity-${escape(item.rarity || 'common')}">${itemIcon(item)}<div class="item-copy"><span class="item-rarity">${escape(item.rarity || 'common')} ${escape(item.slot || 'item')}</span><h3>${escape(item.name)}</h3><p>${escape(item.description || bonusText(item.bonus))}</p>${item.description && item.bonus ? `<span class="item-stat">${escape(bonusText(item.bonus))}</span>` : ''}</div>${controls}</article>`;
}
function inventory(state) {
  const hero = state.hero;
  const equipped = hero.equipment || {};
  const equipmentIds = Object.values(equipped).filter(Boolean).map(item => item.id);
  const items = (hero.inventory || []).filter(item => !equipmentIds.includes(item.id));
  const heroStats = stats(state);
  return heading('YOUR ADVENTURER', 'Inventory', 'A well-chosen relic can change the course of a run.', `<span class="panel-currency">${icon('gold')} ${hero.gold} <small>gold</small></span>`) +
    `<div class="inventory-layout"><div class="inventory-main"><div class="panel-section-heading"><h3>Equipped gear</h3><span>3 equipment slots</span></div><div class="equipment-grid">${['weapon', 'armor', 'charm'].map(slot => `<div class="equipment-slot"><span class="slot-label">${escape(slot)}</span>${equipped[slot] ? itemCard(equipped[slot], `<span class="equipped-label">${icon('check', 14)} Equipped</span>`) : `<div class="empty-slot">${icon(slot, 32)}<span>No ${slot} equipped</span></div>`}</div>`).join('')}</div><div class="panel-section-heading"><h3>Backpack</h3><span>${items.length} item${items.length === 1 ? '' : 's'}</span></div><div class="backpack-grid">${items.length ? items.map(item => itemCard(item, `<div class="item-actions">${item.slot === 'consumable' ? '' : button(state.status === 'combat' ? 'Equip · 1 AP' : 'Equip', 'equip', item.id, state.status === 'dead' || !!state.reward || (state.status === 'combat' && state.ap < 1), true)}${(state.status === 'town' || (state.status === 'cleared' && state.merchant)) ? button(`Sell · ${Math.floor((item.price || 20) / 2)}g`, 'sell', item.id, false, true) : ''}</div>`)).join('') : empty('Room for the extraordinary', 'Defeat enemies and bosses to find your next upgrade.')}</div>${state.status === 'combat' ? '<p class="panel-note">Changing equipment during combat uses 1 action point. Equipping in town or between encounters is free.</p>' : ''}</div><aside class="character-stats"><span class="panel-eyebrow">COMBAT STATS</span><h3>${escape(hero.name)}</h3><dl>${[['maxHp', 'heart'], ['maxMana', 'mana'], ['damage', 'weapon'], ['spellDamage', 'spark'], ['armor', 'armor'], ['movement', 'move']].map(([key, symbol]) => `<div><dt>${icon(symbol, 16)}${escape(labels[key])}</dt><dd>${escape(heroStats[key] ?? 0)}</dd></div>`).join('')}</dl><p class="panel-note">Stats include equipped gear and learned talents.</p></aside></div>`;
}
function talents(state) {
  const hero = state.hero;
  const descriptions = { damage: ['Destruction', 'Hit harder. Cast stronger.', 'weapon'], defense: ['Resilience', 'Stand your ground.', 'armor'], misc: ['Versatility', 'Find your own advantage.', 'charm'] };
  return heading('SHAPE YOUR PLAYSTYLE', 'Talent trees', 'Every level earns a talent point. Follow a path, or make your own.', `<span class="talent-points">${icon('spark')} ${hero.talentPoints} <small>point${hero.talentPoints === 1 ? '' : 's'} available</small></span>`) +
    `<div class="talent-trees">${Object.entries(descriptions).map(([tree, [name, description, symbol]]) => `<section class="talent-tree talent-${tree}"><header><span class="tree-emblem">${icon(symbol, 25)}</span><h3>${name}</h3><p>${description}</p><span class="tree-points">${TALENTS.filter(talent => talent.tree === tree).reduce((sum, talent) => sum + (hero.talents[talent.id] || 0), 0)} points invested</span></header><div class="talent-branches">${TALENTS.filter(talent => talent.tree === tree).map((talent, index) => {
      const rank = hero.talents[talent.id] || 0;
      const maxed = rank >= talent.maxRank;
      const eligible = canLearn(state, talent.id);
      const prerequisites = (talent.requires || []).map(id => TALENTS.find(other => other.id === id)?.name || id);
      const unmet = (talent.requires || []).filter(id => !(hero.talents[id] > 0));
      const lockedReason = hero.level < talent.level ? `Requires level ${talent.level}` : unmet.length ? `Requires ${unmet.map(id => TALENTS.find(other => other.id === id)?.name || id).join(', ')}` : hero.talentPoints < 1 ? 'Earn a point by leveling up' : '';
      return `${index ? '<div class="talent-connector" aria-hidden="true"></div>' : ''}<button class="talent-node ${rank ? 'is-learned' : ''} ${maxed ? 'is-maxed' : ''} ${!eligible && !rank ? 'is-locked' : ''}" data-action="talent" data-id="${escape(talent.id)}" ${!eligible ? 'disabled' : ''} title="${escape(maxed ? 'Talent mastered' : lockedReason || 'Spend 1 talent point')}" aria-label="${escape(talent.name)}, rank ${rank} of ${talent.maxRank}. ${escape(talent.description)} ${escape(maxed ? 'Mastered' : lockedReason)}"><div class="talent-node-top"><span class="talent-symbol">${icon(maxed ? 'check' : !eligible && !rank ? 'lock' : symbol, 18)}</span><h4>${escape(talent.name)}</h4><span class="talent-rank">${rank}<span>/${talent.maxRank}</span></span></div><p>${escape(talent.description)}</p><small>${maxed ? 'Mastered' : lockedReason || (prerequisites.length ? `Follows ${prerequisites.join(', ')}` : 'Foundation talent')}</small></button>`;
    }).join('')}</div></section>`).join('')}</div><p class="panel-note">Unlock connected talents with at least one rank in each prerequisite. Some talents require a higher hero level.</p>`;
}
function journal(state) {
  const hero = state.hero;
  return heading('THE STORY SO FAR', 'Run journal', 'Every descent leaves its mark.') + `<div class="journal-summary"><div><span>Current depth</span><strong>${String(state.floor).padStart(2, '0')}</strong></div><div><span>Hero level</span><strong>${hero.level}</strong></div><div><span>Experience</span><strong>${hero.xp} <small>/ ${nextLevelXp(hero.level)}</small></strong></div><div><span>Turns survived</span><strong>${state.turn}</strong></div></div><div class="panel-section-heading"><h3>Adventure log</h3><span>Most recent first</span></div><ol class="journal-log">${[...(state.log || [])].reverse().map(entry => `<li class="log-${escape(entry.type || 'info')}"><span class="journal-turn">${entry.turn != null ? `T${String(entry.turn).padStart(2, '0')}` : '—'}</span><span>${escape(entry.text)}</span></li>`).join('') || '<li>Your adventure is just beginning.</li>'}</ol>`;
}
function town(state) {
  const deepMerchant = state.status === 'cleared' && state.merchant;
  const available = state.status === 'town' || deepMerchant;
  const stock = available ? shopItems(state) : SHOP.filter(item => item.rarity !== 'epic');
  return heading(deepMerchant ? 'A RARE ENCOUNTER' : 'A MOMENT OF RESPITE', deepMerchant ? 'The mystery merchant' : 'Emberfall town', deepMerchant ? 'Strange wares, fair prices. Some things are only found in the deep.' : 'Rest, resupply, and prepare for the next descent.', `<span class="panel-currency">${icon('gold')} ${state.hero.gold} <small>gold</small></span>`) + `<div class="town-banner"><span class="town-banner-icon">${icon(deepMerchant ? 'charm' : 'camp', 40)}</span><div><span class="panel-eyebrow">${deepMerchant ? 'THE WANDERER’S COLLECTION' : 'THE WAYFARER’S INN'}</span><h3>${deepMerchant ? 'Fortune favors the curious.' : 'A warm fire. A fresh start.'}</h3><p>${deepMerchant ? 'Rare and epic equipment for the road ahead.' : 'Rest to restore your health and mana before returning to the dungeon.'}</p></div>${!deepMerchant ? `<div class="town-banner-actions">${available ? button('Rest & recover', 'rest', '', false, true) + button(`Enter floor ${state.floor}`, 'enterDungeon') : button('Return to town', 'town')}</div>` : ''}</div><div class="panel-section-heading"><h3>${deepMerchant ? 'Treasures from the deep' : 'The outfitter'}</h3><span>${stock.length} wares</span></div><div class="shop-grid">${stock.map(item => itemCard(item, `<div class="shop-item-bottom"><span class="item-price">${icon('gold', 14)} ${item.price}</span>${button('Purchase', 'buy', item.id, !available || state.hero.gold < item.price, true)}</div>`)).join('')}</div>${!available ? '<p class="panel-note">Return to town to visit the outfitter.</p>' : ''}`;
}
function spellbook(state) {
  return heading('KNOWLEDGE IS POWER', 'Spellbook', 'Skills are earned. Defeat a boss to learn a spell or weapon discipline from its pool.') + `<div class="spellbook-grid">${(state.hero.abilities || []).map(id => {
    const ability = ABILITIES[id];
    return ability ? `<article class="spell-card"><span class="spell-icon">${icon('spark', 28)}</span><span class="panel-eyebrow">${escape(ability.type || 'ABILITY')}</span><h3>${escape(ability.name)}</h3><p>${escape(ability.description || '')}</p><div class="spell-details"><span>${ability.ap ?? ability.cost ?? 1} AP</span><span>${ability.mana || 0} mana</span><span>Range ${ability.range ?? 1}</span></div></article>` : '';
  }).join('')}</div><p class="panel-note">Choose a spell in the action bar, then select a highlighted enemy. Distance uses orthogonal grid spaces and solid walls block line of sight.</p>`;
}
function help() {
  const steps = [
    ['01', 'Choose your moment', 'Every turn starts with 2 action points and your class’s movement allowance. Move along highlighted tiles without spending action points.'],
    ['02', 'Make it count', 'Attacks and abilities spend action points. Spells also cost mana. Select an ability, then a highlighted enemy within range and line of sight.'],
    ['03', 'Watch their intent', 'Enemies move and attack after you end your turn. Each monster has its own movement, range, and damage. Hover over a foe to plan your next move.'],
    ['04', 'Claim your spoils', 'Defeating enemies earns gold, experience, and occasional equipment. Every third floor has a boss with powerful gear and a choice of new skills.'],
    ['05', 'Build your legend', 'Spend a talent point every level. Gear up in town, or find a mystery merchant deeper in the dungeon. Your progress saves automatically in this browser.'],
  ];
  return heading('A FIELD GUIDE', 'How to play', 'A little preparation goes a long way underground.') + `<div class="help-steps">${steps.map(([number, name, text]) => `<article><span class="help-step-number">${number}</span><div><h3>${name}</h3><p>${text}</p></div></article>`).join('')}</div><div class="keyboard-hints"><span><kbd>1</kbd>–<kbd>9</kbd> Select action</span><span><kbd>Space</kbd> / <kbd>E</kbd> End turn</span><span><kbd>M</kbd> Move</span><span><kbd>Esc</kbd> Close panel</span></div>`;
}
function settings(state) {
  return heading('YOUR ADVENTURE, YOUR WAY', 'Game settings', 'Keep a copy of your journey, or begin a new one.') + `<section class="settings-section"><div><h3>Save &amp; load</h3><p>Progress autosaves in this browser. Export a JSON backup to continue on another device.</p></div><div class="settings-actions">${button(`${icon('download', 16)} Export save`, 'export', '', false, true)}${button(`${icon('upload', 16)} Import save`, 'import', '', false, true)}</div></section><section class="settings-section"><div><h3>Begin a new adventure</h3><p>Choose a class preset. Starting a new adventure replaces your current browser save; export it first if you want to keep it.</p></div><div class="class-preset-grid">${Object.entries(CLASSES).map(([id, heroClass]) => `<article class="class-preset ${id === state.classId ? 'current-class' : ''}"><img src="./assets/hero-${escape(id)}.svg" alt="" width="64" height="64"><h3>${escape(heroClass.name || id)}</h3><p>${escape(heroClass.description || (id === 'shaman' ? 'Harness the storm with a staff and Lightning Bolt.' : id === 'hunter' ? 'Keep your distance with a bow and Steady Shot.' : 'Hold the line with a sword and a powerful strike.'))}</p>${button(`Play ${escape(heroClass.name || id)}`, 'newGame', id, false, true)}</article>`).join('')}</div></section><p class="panel-note">Dungeon Run · An independent, turn-based dungeon adventure · MIT licensed</p>`;
}

export function renderPanel(state, tab) {
  switch (String(tab).toLowerCase()) {
    case 'bag':
    case 'inventory': return inventory(state);
    case 'talents': return talents(state);
    case 'journal': return journal(state);
    case 'town':
    case 'shop': return town(state);
    case 'spellbook':
    case 'spells': return spellbook(state);
    case 'help': return help();
    case 'settings': return settings(state);
    default: return help();
  }
}
