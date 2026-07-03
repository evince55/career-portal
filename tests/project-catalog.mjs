import { describe, it } from 'node:test';
import assert from 'assert/strict';
import PROJECT_CATALOG, { DEFAULT_PROJECT_ORDER, getProjects, getProject, generateBadges } from '../js/project-catalog.js';

const EXPECTED_SLUGS = [
  'meshwatch',
  'minecraft-monitoring',
  'career-portal',
  'monitoring-stack',
  'azure-functions'
];

describe('Project Catalog Module', () => {
  it('exports PROJECT_CATALOG with all projects', () => {
    assert.ok(PROJECT_CATALOG);
    const slugs = Object.keys(PROJECT_CATALOG);
    assert.strictEqual(slugs.length, 5, 'Should have 5 projects');
    for (const slug of EXPECTED_SLUGS) {
      assert.ok(slugs.includes(slug), `catalog missing key "${slug}"`);
    }
  });

  it('getProjects returns all projects when no filter', () => {
    const projects = getProjects();
    assert.strictEqual(projects.length, 5);
  });

  it('getProjects filters by category', () => {
    const devopsProjects = getProjects('devops');
    assert.ok(devopsProjects.length > 0);
    devopsProjects.forEach(p => {
      assert.ok(p.category === 'devops' || p.tags.includes('devops'));
    });
  });

  it('getProjects covers all four filter-chip categories', () => {
    for (const cat of ['cloud', 'devops', 'iot', 'web']) {
      assert.ok(getProjects(cat).length > 0, `no projects for category "${cat}"`);
    }
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

  it('getProjects keyword search matches tech stack names', () => {
    const filtered = getProjects('', 'grafana');
    assert.ok(filtered.length > 0, 'searching a stack name should match');
    filtered.forEach(p => {
      assert.ok(p.techStack.some(t => t.name.toLowerCase().includes('grafana')));
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
    assert.strictEqual(getProjects().length, 5);
  });

  it('normalizeSlug preserves hyphens for hyphenated slugs', () => {
    const minecraft = getProject('minecraft-monitoring');
    assert.ok(minecraft, 'Should find project with hyphenated slug');
    assert.strictEqual(minecraft.slug, 'minecraft-monitoring');

    const azure = getProject('azure-functions');
    assert.ok(azure, 'Should find project with hyphenated slug');
    assert.strictEqual(azure.slug, 'azure-functions');
  });
});

describe('Project Catalog v2 fields (slug/outcome/caseStudyUrl)', () => {
  it('every project has a kebab-case slug matching its catalog key', () => {
    for (const [key, project] of Object.entries(PROJECT_CATALOG)) {
      assert.match(project.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${project.name}: slug must be kebab-case`);
      assert.strictEqual(project.slug, key, `${project.name}: slug should match catalog key`);
    }
  });

  it('slugs are exactly the five expected case-study slugs', () => {
    const slugs = Object.values(PROJECT_CATALOG).map(p => p.slug).sort();
    assert.deepStrictEqual(slugs, [...EXPECTED_SLUGS].sort());
  });

  it('every project has a non-empty one-line outcome', () => {
    for (const project of Object.values(PROJECT_CATALOG)) {
      assert.strictEqual(typeof project.outcome, 'string', `${project.name}: outcome is required`);
      assert.ok(project.outcome.trim().length > 0, `${project.name}: outcome must not be empty`);
      assert.ok(!project.outcome.includes('\n'), `${project.name}: outcome must be a single line`);
    }
  });

  it('every project caseStudyUrl points at /projects/<slug>.html', () => {
    for (const project of Object.values(PROJECT_CATALOG)) {
      assert.strictEqual(
        project.caseStudyUrl,
        `/projects/${project.slug}.html`,
        `${project.name}: caseStudyUrl must match slug`
      );
    }
  });

  it('DEFAULT_PROJECT_ORDER references only valid slugs and covers all projects', () => {
    assert.strictEqual(DEFAULT_PROJECT_ORDER.length, 5);
    for (const slug of DEFAULT_PROJECT_ORDER) {
      assert.ok(PROJECT_CATALOG[slug], `order entry "${slug}" not in catalog`);
    }
  });

  it('getProject resolves the renamed monitoring-stack slug', () => {
    const stack = getProject('monitoring-stack');
    assert.ok(stack, 'monitoring-stack should resolve');
    assert.strictEqual(stack.name, 'Monitoring Stack');
    assert.strictEqual(stack.caseStudyUrl, '/projects/monitoring-stack.html');
  });
});
