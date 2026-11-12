import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { reachable, validateSave } from './engine.js';

// Exercise the actual entry point and delegated UI events without a browser runtime.
const listeners={};
const elements=Object.fromEntries(['#app','#toast','#import-file'].map(selector=>[selector,{innerHTML:'',textContent:'',classList:{add(){},remove(){}},addEventListener(type,fn){listeners[selector+type]=fn;},click(){},focus(){}}]));
const store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
globalThis.document={querySelector:selector=>elements[selector]||null,addEventListener:(type,fn)=>{listeners['document'+type]??=[];listeners['document'+type].push(fn);}};
globalThis.window={};
await import('./app.js');
const html=()=>elements['#app'].innerHTML;
const state=()=>JSON.parse(store.get('dungeon-run-save-v1'));
const click=(action,extra={})=>listeners['#appclick']({target:{dataset:{},closest:()=>({dataset:{action,...extra}})}});

test('entry point renders board, heroes, resources and all static image paths exist',async()=>{
  assert.equal((html().match(/class="tile /g)||[]).length,99);
  assert.ok(html().includes('Lightning Bolt'));
  assert.ok(html().includes('manaPotion'));
  for(const path of new Set([...html().matchAll(/src="([^"]+)"/g)].map(m=>m[1])))await access(new URL('../'+path,import.meta.url));
});
test('delegated UI moves the hero and casts spells using actual game state',()=>{
  const target=reachable(state())[0];
  click('tile',{x:String(target.x),y:String(target.y)});
  assert.deepEqual([state().hero.x,state().hero.y],[target.x,target.y]);
  const priorMana=state().hero.mana;
  click('select',{id:'lightning'});
  click('enemy',{id:state().enemies[0].id});
  assert.ok(state().hero.mana<priorMana);
  validateSave(state());
});
test('all panels open and class restart requires its explicit confirmation',()=>{
  for(const id of ['inventory','talents','journal','town','settings','spellbook','help']){
    click('panel',{id});assert.ok(html().includes('role="dialog"'));assert.ok(!html().includes('[object Object]'));
  }
  click('newGame',{id:'hunter'});assert.equal(state().classId,'shaman');
  assert.ok(html().includes('Begin a new adventure as a Hunter?'));
  click('confirmNew');assert.equal(state().classId,'hunter');
  assert.ok(!html().includes('role="dialog"'));
  validateSave(state());
});
test('town purchase/equipment UI updates a valid persistent save',()=>{
  click('town');assert.equal(state().status,'town');
  click('buy',{id:'ironWeapon'});assert.equal(state().hero.inventory.length,1);
  click('equip',{id:state().hero.inventory[0].id});
  assert.equal(state().hero.equipment.weapon.baseId,'ironWeapon');
  click('enterDungeon');assert.equal(state().status,'combat');
  validateSave(state());
});
test('JSON import handler accepts a valid hero and rejects corrupt files without losing progress',async()=>{
  const valid=state();
  const before=JSON.stringify(valid);
  await listeners['#import-filechange']({target:{files:[{size:100,text:async()=>'{"version":999}'}]}});
  assert.equal(JSON.stringify(state()),before);
  assert.ok(elements['#toast'].textContent.includes('Invalid save'));
  await listeners['#import-filechange']({target:{files:[{size:100,text:async()=>JSON.stringify(valid)}]}});
  assert.equal(JSON.stringify(state()),before);assert.ok(elements['#toast'].textContent.includes('Welcome back'));
});
