import { test } from 'node:test';
import assert from 'node:assert/strict';
import { netKey } from './store.js';

test('netKey: IPv4 as is, IPv6 by /64, mapped IPv4 unwrapped', () => {
  assert.equal(netKey('203.0.113.7'), '203.0.113.7');
  assert.equal(netKey('::ffff:203.0.113.7'), '203.0.113.7');
  assert.equal(netKey('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(netKey('2001:db8:1:2:ffff::9'), '2001:db8:1:2::/64'); // same /64, same bucket
  assert.equal(netKey('2001:0DB8::1'), '2001:db8:0:0::/64');
  assert.equal(netKey('::1'), '0:0:0:0::/64');
  assert.equal(netKey('unknown'), 'unknown');
});
