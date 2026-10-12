import assert from 'node:assert/strict';
import { frameScheduler } from '../src/parameter-controls.js';

const frames=[], updates=[];
const schedule=frameScheduler(preview=>updates.push(preview),callback=>frames.push(callback));
schedule(true);schedule(true);schedule(true);
assert.equal(frames.length,1,'Pointer inputs share a frame');
frames.shift()();assert.deepEqual(updates,[true],'Preview updates before release');
schedule(true);frames.shift()();assert.deepEqual(updates,[true,true],'Dragging continues to update');
schedule(true);schedule(false);schedule(true);
frames.shift()();assert.equal(updates.at(-1),false,'Final quality update cannot be overwritten by a pending preview');
schedule(false);frames.shift()();assert.equal(updates.at(-1),false);
console.log('PASS live frame updates, event coalescing, final geometry quality');
