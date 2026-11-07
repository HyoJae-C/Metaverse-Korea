import test from 'node:test';
import assert from 'node:assert/strict';
import { BagUI } from '../src/ui/bag-ui.js';

// The B key and the Space "act" check both read BagUI.open.
test('BagUI.open follows hide()', () => {
  const root = { hidden: true };
  const ui = new BagUI({ root, bag: { onChange() {} } });
  assert.equal(ui.open, false);
  root.hidden = false;
  assert.equal(ui.open, true);
  ui.hide();
  assert.equal(ui.open, false);
});
