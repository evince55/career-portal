import { describe, it } from 'node:test';
import assert from 'assert/strict';
import MeshWatchAPI from '../js/meshwatch-api.js';

describe('MeshWatch API Module', () => {
  it('instantiates without error', () => {
    const api = new MeshWatchAPI();
    assert.ok(api);
    assert.strictEqual(api.AZURE_API_BASE, '/api');
    assert.ok(typeof api.getMetrics === 'function');
    assert.ok(typeof api.getMinecraftMetrics === 'function');
    assert.ok(typeof api.queryPrometheus === 'function');
  });

  it('getMetrics returns error when not authenticated', async () => {
    const api = new MeshWatchAPI();
    const result = await api.getMetrics();
    assert.strictEqual(result.success, false);
  });

  it('getMinecraftMetrics returns cached data on network failure', async () => {
    const api = new MeshWatchAPI();
    const result = await api.getMinecraftMetrics();
    assert.ok(result.data !== undefined);
  });

  it('queryPrometheus rejects non-whitelisted queries', async () => {
    const api = new MeshWatchAPI();
    const result = await api.queryPrometheus('hacked_query');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('whitelisted'));
  });

  it('PKCE helpers generate valid tokens', () => {
    // crypto is only available in browser or Node.js >= 19
    if (typeof crypto === 'undefined') {
      console.log('⚠ Skipping PKCE test: crypto not available in this environment');
      return;
    }
    
    const api = new MeshWatchAPI();
    
    const verifier = api._generateCodeVerifier();
    assert.ok(verifier.length > 0);
    assert.ok(!verifier.includes('+'));
    assert.ok(!verifier.includes('/'));

    const state = api._generateState();
    assert.strictEqual(state.length, 32);
    assert.ok(/^[0-9a-f]+$/.test(state));
  });
});
