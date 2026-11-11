import assert from 'node:assert/strict';
import { fingerprint, similarity, DUPLICATE_THRESHOLD } from '../src/utils/fingerprint';

const a = fingerprint('SkyJet Airlines', 'Round-trip flights for 4 — Lisbon team offsite');
const b = fingerprint('skyjet airlines, Inc.', 'Lisbon team offsite: round trip flight for 4');
const c = fingerprint('Hamilton Supply Co.', 'Team welcome kits and printed materials');

assert.equal(a, b, 'case/punctuation/plural/stopword differences normalize to the same fingerprint');
assert.equal(similarity(a, b), 1);
assert.ok(similarity(a, c) < DUPLICATE_THRESHOLD);
assert.equal(similarity('', a), 0);
console.log('fingerprint tests passed');
