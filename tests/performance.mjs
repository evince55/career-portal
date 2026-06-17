import { describe, it } from 'node:test';
import assert from 'assert/strict';
import PerformanceMonitor from '../js/performance.js';

describe('PerformanceMonitor', () => {
  it('exports a class', () => {
    assert.strictEqual(typeof PerformanceMonitor, 'function');
  });

  it('instantiates without crashing when performance is undefined', () => {
    const pm = new PerformanceMonitor();
    assert.ok(pm instanceof PerformanceMonitor);
  });

  it('has metrics as a Map', () => {
    const pm = new PerformanceMonitor();
    assert.ok(pm.metrics instanceof Map);
    // In Node.js without Navigation Timing API, metrics should be empty
    assert.strictEqual(pm.metrics.size, 0);
  });

  it('reportMetrics does not throw without console', () => {
    const pm = new PerformanceMonitor();
    assert.doesNotThrow(() => pm.reportMetrics());
  });

  it('init does not throw', () => {
    const pm = new PerformanceMonitor();
    assert.doesNotThrow(() => pm.init());
    // Calling init twice should be safe
    assert.doesNotThrow(() => pm.init());
  });
});
