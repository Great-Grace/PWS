import * as assert from 'node:assert/strict';
import { getDefaultSlot } from '../src/utils/formulas';

assert.equal(getDefaultSlot(5), 'evening');
assert.equal(getDefaultSlot(6), 'morning');
assert.equal(getDefaultSlot(9), 'morning');
assert.equal(getDefaultSlot(10), 'afternoon');
assert.equal(getDefaultSlot(17), 'afternoon');
assert.equal(getDefaultSlot(18), 'evening');
assert.equal(getDefaultSlot(22), 'evening');
assert.equal(getDefaultSlot(4), 'evening');

console.log('formulas test passed');
