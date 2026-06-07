import { describe, it } from 'node:test';
import assert from 'assert/strict';
import AIAssistant from '../js/ai-assistant.js';

describe('AI Assistant Module', () => {
  it('instantiates without error', () => {
    const assistant = new AIAssistant();
    assert.ok(assistant);
    assert.strictEqual(assistant.AZURE_AGENT_BASE, '/api/agent');
    assert.ok(typeof assistant.query === 'function');
    assert.ok(typeof assistant.getStatus === 'function');
  });

  it('_getCachedAnswer returns answers for known topics', async () => {
    const assistant = new AIAssistant();
    
    const answer = assistant._getCachedAnswer('What does MeshWatch do?');
    assert.ok(answer.includes('MeshWatch'));
    assert.ok(answer.length > 50);
  });

  it('_getCachedAnswer handles unknown questions gracefully', async () => {
    const assistant = new AIAssistant();
    const answer = assistant._getCachedAnswer('xyz random unknown question abc');
    assert.ok(answer.includes('I can provide detailed answers'));
  });

  it('getStatus returns correct configuration', () => {
    const assistant = new AIAssistant();
    const status = assistant.getStatus();
    
    assert.strictEqual(status.model, 'phi-3');
    assert.ok(status.tailscaleOllama.startsWith('http'));
    assert.ok(status.azureProxy !== undefined);
  });

  it('_getCachedAnswer covers all major topics', async () => {
    const assistant = new AIAssistant();
    const topics = [
      'meshwatch', 'kubernetes', 'cost', 'ollama', 'minecraft',
      'azure', 'skills', 'education', 'experience', 'contact'
    ];

    for (const topic of topics) {
      const answer = assistant._getCachedAnswer(`Tell me about ${topic}`);
      assert.ok(answer.length > 30, `Answer for "${topic}" should be substantive`);
    }
  });
});
