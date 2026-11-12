/** Data shared by the rules engine and presentation layer. All bonuses apply per rank. */
export const GRID = Object.freeze({ width: 11, height: 9 });

export const CLASSES = {
  shaman: {
    id: 'shaman', name: 'Shaman', subtitle: 'Keeper of the storm',
    description: 'A resilient spellcaster who channels lightning through an ancient staff.',
    weapon: 'staff', skill: 'lightning', hp: 90, mana: 48, movement: 3,
    color: '#93c7b1', icon: '✦',
  },
  hunter: {
    id: 'hunter', name: 'Hunter', subtitle: 'Eyes of the wild',
    description: 'A mobile archer who keeps enemies at a distance with precise, powerful shots.',
    weapon: 'bow', skill: 'steadyShot', hp: 82, mana: 30, movement: 4,
    color: '#b2bd8c', icon: '➶',
  },
  knight: {
    id: 'knight', name: 'Knight', subtitle: 'Oath of iron',
    description: 'An armored fighter who holds the front line and cuts through nearby foes.',
    weapon: 'sword', skill: 'cleave', hp: 110, mana: 24, movement: 2,
    color: '#d4b78b', icon: '⚔',
  },
};

export const ABILITIES = {
  staff: { id: 'staff', name: 'Staff strike', description: 'Strike an adjacent enemy with your staff.', icon: '♜', range: 1, damage: 9, mana: 0, ap: 1, kind: 'attack' },
  bow: { id: 'bow', name: 'Bow shot', description: 'Loose an arrow at a distant enemy. Requires a clear line of sight.', icon: '➶', range: 5, damage: 8, mana: 0, ap: 1, kind: 'attack' },
  sword: { id: 'sword', name: 'Sword slash', description: 'Slash an adjacent enemy with your blade.', icon: '⚔', range: 1, damage: 10, mana: 0, ap: 1, kind: 'attack' },
  axe: { id: 'axe', name: 'Axe strike', description: 'Deliver a heavy blow to an adjacent enemy.', icon: '⚒', range: 1, damage: 13, mana: 0, ap: 1, kind: 'attack' },
  wand: { id: 'wand', name: 'Wand spark', description: 'Send a small arcane spark toward an enemy. Requires a clear line of sight.', icon: '✧', range: 4, damage: 8, mana: 0, ap: 1, kind: 'attack' },
  lightning: { id: 'lightning', name: 'Lightning Bolt', description: 'Call down lightning on a single enemy.', icon: 'ϟ', range: 4, damage: 17, mana: 7, ap: 1, kind: 'spell' },
  steadyShot: { id: 'steadyShot', name: 'Steady Shot', description: 'Focus your aim to deal heavy ranged damage.', icon: '◎', range: 6, damage: 17, mana: 5, ap: 1, kind: 'attack' },
  cleave: { id: 'cleave', name: 'Cleave', description: 'Sweep your sword through the target and nearby enemies.', icon: '⚔', range: 1, damage: 14, mana: 4, ap: 1, kind: 'attack', effect: 'splash' },
  fireball: { id: 'fireball', name: 'Fireball', description: 'Hurl a blazing sphere that also burns enemies beside the target.', icon: '♨', range: 4, damage: 21, mana: 10, ap: 1, kind: 'spell', effect: 'splash' },
  frostNova: { id: 'frostNova', name: 'Frost Nova', description: 'Blast the target with frost and slow its next movement.', icon: '❄', range: 3, damage: 18, mana: 9, ap: 1, kind: 'spell', effect: 'slow' },
  chainLightning: { id: 'chainLightning', name: 'Chain Lightning', description: 'A powerful lightning arc jumps to nearby enemies.', icon: 'ϟ', range: 5, damage: 29, mana: 14, ap: 2, kind: 'spell', effect: 'chain' },
  heal: { id: 'heal', name: 'Renewal', description: 'Restore 30 health to yourself.', icon: '✚', range: 0, damage: 30, mana: 10, ap: 1, kind: 'heal' },
  blink: { id: 'blink', name: 'Blink', description: 'Teleport to an empty tile within four grid steps, passing through walls.', icon: '◇', range: 4, damage: 0, mana: 7, ap: 1, kind: 'blink' },
  whirlwind: { id: 'whirlwind', name: 'Whirlwind', description: 'A devastating spinning strike damages enemies around your target.', icon: '✺', range: 1, damage: 30, mana: 10, ap: 2, kind: 'attack', effect: 'splash' },
};

export const TALENTS = [
  { id: 'sharpEdge', name: 'Sharp Edge', tree: 'damage', description: '+2 weapon damage per rank.', maxRank: 3, requires: [], level: 1, bonus: { damage: 2 } },
  { id: 'spark', name: 'Gathering Storm', tree: 'damage', description: '+3 spell damage per rank.', maxRank: 3, requires: [], level: 1, bonus: { spellDamage: 3 } },
  { id: 'keenEye', name: 'Keen Eye', tree: 'damage', description: '+5% critical strike chance per rank.', maxRank: 2, requires: [], level: 1, bonus: { crit: 0.05 } },
  { id: 'executioner', name: 'Executioner', tree: 'damage', description: '+4 weapon damage per rank.', maxRank: 2, requires: ['sharpEdge'], level: 3, bonus: { damage: 4 } },
  { id: 'overcharge', name: 'Overcharge', tree: 'damage', description: '+5 spell damage per rank.', maxRank: 2, requires: ['spark'], level: 3, bonus: { spellDamage: 5 } },
  { id: 'deadlyFocus', name: 'Deadly Focus', tree: 'damage', description: '+8% critical strike chance per rank.', maxRank: 2, requires: ['keenEye'], level: 3, bonus: { crit: 0.08 } },
  { id: 'bloodthirst', name: 'Bloodthirst', tree: 'damage', description: 'Restore 2 health whenever you deal damage, per rank.', maxRank: 2, requires: ['executioner'], level: 5, bonus: { lifesteal: 2 } },
  { id: 'tempest', name: 'Tempest', tree: 'damage', description: '+8 spell damage and +5 maximum mana.', maxRank: 1, requires: ['overcharge'], level: 5, bonus: { spellDamage: 8, maxMana: 5 } },
  { id: 'avatar', name: 'Avatar of War', tree: 'damage', description: '+8 weapon damage, +8 spell damage and +10% critical chance.', maxRank: 1, requires: ['bloodthirst', 'tempest'], level: 7, bonus: { damage: 8, spellDamage: 8, crit: 0.1 } },

  { id: 'vitality', name: 'Vitality', tree: 'defense', description: '+12 maximum health per rank.', maxRank: 3, requires: [], level: 1, bonus: { maxHp: 12 } },
  { id: 'ironSkin', name: 'Iron Skin', tree: 'defense', description: 'Reduce incoming damage by 1 per rank.', maxRank: 3, requires: [], level: 1, bonus: { armor: 1 } },
  { id: 'spiritWard', name: 'Spirit Ward', tree: 'defense', description: '+6 maximum health and +4 maximum mana per rank.', maxRank: 2, requires: [], level: 1, bonus: { maxHp: 6, maxMana: 4 } },
  { id: 'endurance', name: 'Endurance', tree: 'defense', description: '+18 maximum health per rank.', maxRank: 2, requires: ['vitality'], level: 3, bonus: { maxHp: 18 } },
  { id: 'bulwark', name: 'Bulwark', tree: 'defense', description: 'Reduce incoming damage by 2 per rank.', maxRank: 2, requires: ['ironSkin'], level: 3, bonus: { armor: 2 } },
  { id: 'renewingSpirit', name: 'Renewing Spirit', tree: 'defense', description: '+2 mana regeneration and +10 maximum health.', maxRank: 1, requires: ['spiritWard'], level: 3, bonus: { manaRegen: 2, maxHp: 10 } },
  { id: 'unbreakable', name: 'Unbreakable', tree: 'defense', description: '+25 maximum health and 2 armor.', maxRank: 1, requires: ['endurance', 'bulwark'], level: 5, bonus: { maxHp: 25, armor: 2 } },
  { id: 'livingArmor', name: 'Living Armor', tree: 'defense', description: '+2 armor and restore 2 health when dealing damage.', maxRank: 1, requires: ['renewingSpirit'], level: 5, bonus: { armor: 2, lifesteal: 2 } },
  { id: 'immortal', name: 'Mountain Heart', tree: 'defense', description: '+40 maximum health and 4 armor.', maxRank: 1, requires: ['unbreakable', 'livingArmor'], level: 7, bonus: { maxHp: 40, armor: 4 } },

  { id: 'deepWells', name: 'Deep Wells', tree: 'misc', description: '+8 maximum mana per rank.', maxRank: 3, requires: [], level: 1, bonus: { maxMana: 8 } },
  { id: 'scavenger', name: 'Scavenger', tree: 'misc', description: 'Earn 10% more gold per rank.', maxRank: 3, requires: [], level: 1, bonus: { gold: 0.1 } },
  { id: 'student', name: 'Quick Study', tree: 'misc', description: 'Earn 10% more experience per rank.', maxRank: 2, requires: [], level: 1, bonus: { xp: 0.1 } },
  { id: 'meditation', name: 'Meditation', tree: 'misc', description: 'Regenerate 2 additional mana each turn, per rank.', maxRank: 2, requires: ['deepWells'], level: 3, bonus: { manaRegen: 2 } },
  { id: 'fleetFoot', name: 'Fleet Foot', tree: 'misc', description: '+1 movement per turn.', maxRank: 1, requires: ['scavenger'], level: 3, bonus: { movement: 1 } },
  { id: 'scholar', name: 'Dungeon Scholar', tree: 'misc', description: 'Earn 20% more experience and gain 6 maximum mana.', maxRank: 1, requires: ['student'], level: 3, bonus: { xp: 0.2, maxMana: 6 } },
  { id: 'overflow', name: 'Overflow', tree: 'misc', description: '+15 maximum mana and +3 mana regeneration.', maxRank: 1, requires: ['meditation'], level: 5, bonus: { maxMana: 15, manaRegen: 3 } },
  { id: 'trailblazer', name: 'Trailblazer', tree: 'misc', description: '+1 movement and 20% more gold.', maxRank: 1, requires: ['fleetFoot', 'scholar'], level: 5, bonus: { movement: 1, gold: 0.2 } },
  { id: 'wanderer', name: 'Planar Wanderer', tree: 'misc', description: '+1 movement, +20 maximum mana and +2 mana regeneration.', maxRank: 1, requires: ['overflow', 'trailblazer'], level: 7, bonus: { movement: 1, maxMana: 20, manaRegen: 2 } },
];

export const SHOP = [
  { id: 'hpPotion', name: 'Health Potion', description: 'Restore 40 health. Drinking uses one action in combat.', slot: 'consumable', rarity: 'common', price: 25, bonus: {}, icon: '✚' },
  { id: 'manaPotion', name: 'Mana Potion', description: 'Restore 25 mana. Drinking uses one action in combat.', slot: 'consumable', rarity: 'common', price: 20, bonus: {}, icon: '◈' },
  { id: 'ironWeapon', name: 'Ironbound Weapon', description: 'A trusted weapon balanced for a practiced hand.', slot: 'weapon', rarity: 'common', price: 55, bonus: { damage: 3 }, icon: '⚔' },
  { id: 'leatherArmor', name: 'Warden’s Leathers', description: 'Flexible leather reinforced with iron rings.', slot: 'armor', rarity: 'common', price: 50, bonus: { armor: 1, maxHp: 8 }, icon: '♜' },
  { id: 'spiritCharm', name: 'Spirit Amulet', description: 'A smooth jade stone that holds a little of the old magic.', slot: 'charm', rarity: 'common', price: 45, bonus: { maxMana: 10 }, icon: '◇' },
  { id: 'stormWeapon', name: 'Stormforged Weapon', description: 'Lightning sleeps beneath the surface of this unusual weapon.', slot: 'weapon', rarity: 'rare', price: 120, bonus: { damage: 6, spellDamage: 4 }, icon: 'ϟ' },
  { id: 'runicArmor', name: 'Runic Vestments', description: 'Protective runes flicker across weathered fabric.', slot: 'armor', rarity: 'rare', price: 110, bonus: { armor: 3, maxHp: 16 }, icon: '♜' },
  { id: 'moonCharm', name: 'Moonlit Talisman', description: 'A silver token that hums in rhythm with your footsteps.', slot: 'charm', rarity: 'rare', price: 100, bonus: { maxMana: 16, movement: 1 }, icon: '☽' },
  { id: 'voidWeapon', name: 'Edge of the Abyss', description: 'A boss relic that strikes at flesh and spirit alike.', slot: 'weapon', rarity: 'epic', price: 240, bonus: { damage: 11, spellDamage: 9 }, icon: '⚔' },
  { id: 'crownArmor', name: 'Sovereign’s Mantle', description: 'The fallen sovereign’s mantle is almost impossibly light.', slot: 'armor', rarity: 'epic', price: 220, bonus: { armor: 5, maxHp: 28 }, icon: '♛' },
  { id: 'eternalCharm', name: 'Heart of Eternity', description: 'A warm crystal found only in the deepest dark.', slot: 'charm', rarity: 'epic', price: 210, bonus: { maxMana: 24, manaRegen: 2, maxHp: 12 }, icon: '◈' },
];

export const ENEMY_TYPES = {
  slime: { name: 'Mire Slime', hp: 18, damage: 5, movement: 2, range: 1, xp: 25, gold: 12, icon: '●', color: '#82a88a', description: 'Slow-moving ooze. Closes in to strike at adjacent targets.' },
  skeleton: { name: 'Crypt Guard', hp: 24, damage: 7, movement: 2, range: 1, xp: 35, gold: 16, icon: '♟', color: '#c6bba3', description: 'A restless guard with a rusted blade and a stubborn will.' },
  archer: { name: 'Hollow Archer', hp: 17, damage: 6, movement: 3, range: 4, xp: 35, gold: 18, icon: '➶', color: '#b6ac92', description: 'A fragile ranged foe. Walls block its line of fire.' },
  shade: { name: 'Ashen Shade', hp: 22, damage: 8, movement: 4, range: 2, xp: 45, gold: 22, icon: '◊', color: '#9c91b2', description: 'A swift shadow that darts across the chamber to attack.' },
  boss: { name: 'The Hollow King', hp: 80, damage: 12, movement: 2, range: 3, xp: 130, gold: 85, icon: '♛', color: '#d19c6e', description: 'An ancient dungeon lord. Defeat it to claim an epic relic and learn a new spell or weapon ability.' },
};

export const FLOOR_NAMES = ['The Forgotten Crypt', 'Whispering Halls', 'Throne of Ash', 'Sunken Archives', 'The Veiled Market', 'The Frostbound Sanctum', 'Obsidian Passage', 'The Last Bazaar', 'Heart of the Abyss'];
