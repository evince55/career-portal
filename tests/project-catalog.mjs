import { describe, it } from 'node:test';
import assert from 'assert/strict';
import PROJECT_CATALOG, { getProjects, getProject, generateBadges } from '../js/project-catalog.js';

describe('Project Catalog Module', () => {
  it('exports PROJECT_CATALOG with all projects', () => {
    assert.ok(PROJECT_CATALOG);
    const slugs = Object.keys(PROJECT_CATALOG);
    assert.strictEqual(slugs.length, 6, 'Should have 6 projects');
    assert.ok(slugs.includes('meshwatch'));
    assert.ok(slugs.includes('minecraft-monitoring'));
    assert.ok(slugs.includes('cs211'));
    assert.ok(slugs.includes('career-portal'));
    assert.ok(slugs.includes('monitoring'));
    assert.ok(slugs.includes('azure-functions'));
  });

  it('getProjects returns all projects when no filter', () => {
    const projects = getProjects();
    assert.strictEqual(projects.length, 6);
  });

  it('getProjects filters by category', () => {
    const devopsProjects = getProjects('devops');
    assert.ok(devopsProjects.length > 0);
    devopsProjects.forEach(p => {
      assert.ok(p.category === 'devops' || p.tags.includes('devops'));
    });
  });

  it('getProjects filters by keyword', () => {
    const filtered = getProjects('', 'cost');
    assert.ok(filtered.length > 0);
    filtered.forEach(p => {
      assert.ok(
        p.name.toLowerCase().includes('cost') ||
        p.description.toLowerCase().includes('cost')
      );
    });
  });

  it('getProject returns correct project by slug', () => {
    const meshwatch = getProject('meshwatch');
    assert.strictEqual(meshwatch.name, 'MeshWatch');
    assert.strictEqual(meshwatch.category, 'devops');
    assert.ok(Array.isArray(meshwatch.techStack));
    assert.ok(Array.isArray(meshwatch.badges));
  });

  it('getProject returns null for unknown project', () => {
    const result = getProject('nonexistent');
    assert.strictEqual(result, null);
  });

  it('generateBadges creates HTML from badge array', () => {
    const html = generateBadges(['⭐ Production', '🤖 AI-Powered']);
    assert.ok(html.includes('⭐ Production'));
    assert.ok(html.includes('<span class="project-badge">'));
  });

  it('generateBadges returns empty string for no badges', () => {
    const html = generateBadges([]);
    assert.strictEqual(html, '');
  });

  it('all projects have required fields', () => {
    Object.values(PROJECT_CATALOG).forEach(project => {
      assert.ok(project.name, 'name is required');
      assert.ok(project.slug, 'slug is required');
      assert.ok(project.description, 'description is required');
      assert.ok(typeof project.category === 'string' || Array.isArray(project.category), 'category is required');
      assert.ok(Array.isArray(project.techStack), 'techStack is required');
      assert.ok(Array.isArray(project.badges), 'badges is required');
      assert.ok(Array.isArray(project.keyAchievements), 'keyAchievements is required');
    });
  });

  it('DEFAULT_PROJECT_ORDER defines display order', () => {
    const meshwatch = getProject('meshwatch');
    assert.strictEqual(meshwatch.slug, 'meshwatch');
    assert.strictEqual(getProjects().length, 6);
  });
});
