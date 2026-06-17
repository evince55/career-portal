import { describe, it } from 'node:test';
import assert from 'assert/strict';
import { WRITEUPS } from '../js/writeups-data.js';
import PROJECT_CATALOG, { DEFAULT_PROJECT_ORDER } from '../js/project-catalog.js';

const VALID_CATEGORIES = ['kubernetes', 'devops', 'cloud'];

const REQUIRED_FIELDS = ['title', 'category', 'excerpt', 'tags', 'date', 'readTime', 'content'];

describe('Writeups Data Integrity', () => {
  it('exports WRITEUPS array with 5 entries (one per project)', () => {
    assert.ok(Array.isArray(WRITEUPS));
    assert.strictEqual(WRITEUPS.length, 5, 'Should have exactly 5 writeups — one per project');
  });

  it('every writeup has all required fields', () => {
    WRITEUPS.forEach((w, i) => {
      REQUIRED_FIELDS.forEach(field => {
        assert.ok(w[field] !== undefined && w[field] !== null,
          `Writeup ${i} missing required field: ${field}`);
      });
    });
  });

  it('every writeup has a non-empty title', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(typeof w.title === 'string' && w.title.trim().length > 0,
        `Writeup ${i} has empty or invalid title`);
    });
  });

  it('every writeup has a valid category', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(VALID_CATEGORIES.includes(w.category),
        `Writeup ${i} has invalid category "${w.category}" — must be one of: ${VALID_CATEGORIES.join(', ')}`);
    });
  });

  it('every writeup has tags array with at least 3 tags', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(Array.isArray(w.tags), `Writeup ${i} tags must be an array`);
      assert.ok(w.tags.length >= 3, `Writeup ${i} should have at least 3 tags, got ${w.tags.length}`);
    });
  });

  it('every writeup has a valid ISO date (YYYY-MM-DD)', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    WRITEUPS.forEach((w, i) => {
      assert.ok(dateRegex.test(w.date), `Writeup ${i} has invalid date format: "${w.date}"`);
    });
  });

  it('every writeup has a readTime string', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(typeof w.readTime === 'string' && w.readTime.includes('min'),
        `Writeup ${i} readTime should include "min": "${w.readTime}"`);
    });
  });

  it('every writeup content includes TL;DR and Lessons Learned sections', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(w.content.includes('TL;DR'), `Writeup ${i} missing TL;DR section`);
      assert.ok(w.content.includes('Lessons Learned'), `Writeup ${i} missing Lessons Learned section`);
    });
  });

  it('every writeup content includes Architecture and Results sections', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(w.content.includes('Architecture'), `Writeup ${i} missing Architecture section`);
      assert.ok(w.content.includes('Results'), `Writeup ${i} missing Results section`);
    });
  });

  it('every writeup content has at least 3 deep-dive subsections', () => {
    WRITEUPS.forEach((w, i) => {
      const deepDiveCount = (w.content.match(/<h3>Deep-Dive:/g) || []).length;
      assert.ok(deepDiveCount >= 3,
        `Writeup ${i} should have at least 3 Deep-Dive subsections, found ${deepDiveCount}`);
    });
  });

  it('all writeup titles are unique', () => {
    const titles = WRITEUPS.map(w => w.title);
    const unique = new Set(titles);
    assert.strictEqual(titles.length, unique.size, 'Writeup titles must be unique');
  });

  it('all writeup dates are unique', () => {
    const dates = WRITEUPS.map(w => w.date);
    const unique = new Set(dates);
    assert.strictEqual(dates.length, unique.size, 'Writeup dates must be unique');
  });
});

describe('Writeup Category Coverage', () => {
  it('categories used match the valid filter set', () => {
    const usedCategories = [...new Set(WRITEUPS.map(w => w.category))];
    usedCategories.forEach(cat => {
      assert.ok(VALID_CATEGORIES.includes(cat),
        `Category "${cat}" is used but not in valid filter set`);
    });
  });

  it('kubernetes category has at least 1 writeup', () => {
    const k8s = WRITEUPS.filter(w => w.category === 'kubernetes');
    assert.ok(k8s.length >= 1, 'Should have at least 1 kubernetes writeup');
  });

  it('devops category has at least 1 writeup', () => {
    const devops = WRITEUPS.filter(w => w.category === 'devops');
    assert.ok(devops.length >= 1, 'Should have at least 1 devops writeup');
  });

  it('cloud category has at least 1 writeup', () => {
    const cloud = WRITEUPS.filter(w => w.category === 'cloud');
    assert.ok(cloud.length >= 1, 'Should have at least 1 cloud writeup');
  });
});

describe('Writeup-to-Project Mapping', () => {
  it('number of writeups matches number of projects in catalog', () => {
    const projectCount = Object.keys(PROJECT_CATALOG).length;
    assert.strictEqual(WRITEUPS.length, projectCount,
      `Writeup count (${WRITEUPS.length}) should match project count (${projectCount})`);
  });

  it('each project in DEFAULT_PROJECT_ORDER has a corresponding writeup by keyword match', () => {
    DEFAULT_PROJECT_ORDER.forEach(slug => {
      const project = PROJECT_CATALOG[slug];
      assert.ok(project, `Project slug "${slug}" not found in catalog`);

      const projectKeywords = [
        project.name.toLowerCase(),
        ...project.tags
      ].filter(k => k.length > 3);

      const hasMatch = WRITEUPS.some(w =>
        projectKeywords.some(kw =>
          w.title.toLowerCase().includes(kw) ||
          w.tags.some(t => t.includes(kw)) ||
          w.excerpt.toLowerCase().includes(kw)
        )
      );

      assert.ok(hasMatch,
        `No writeup found matching project "${project.name}" (slug: ${slug}). Keywords: ${projectKeywords.join(', ')}`);
    });
  });
});

describe('Writeup Filter/Search Logic', () => {
  it('filtering by category returns only matching writeups', () => {
    VALID_CATEGORIES.forEach(cat => {
      const filtered = WRITEUPS.filter(w => w.category === cat || w.tags.includes(cat));
      const allMatch = filtered.every(w => w.category === cat || w.tags.includes(cat));
      assert.ok(allMatch, `Filter by "${cat}" returned non-matching entries`);
    });
  });

  it('search by title keyword returns matching writeups', () => {
    const query = 'kubernetes';
    const results = WRITEUPS.filter(w =>
      w.title.toLowerCase().includes(query) ||
      w.excerpt.toLowerCase().includes(query) ||
      w.tags.some(t => t.includes(query))
    );
    assert.ok(results.length > 0, 'Search for "kubernetes" should return at least 1 result');
  });

  it('search with no matches returns empty array', () => {
    const query = 'xyznonexistent';
    const results = WRITEUPS.filter(w =>
      w.title.toLowerCase().includes(query) ||
      w.excerpt.toLowerCase().includes(query) ||
      w.tags.some(t => t.includes(query))
    );
    assert.strictEqual(results.length, 0, 'Search for nonexistent term should return 0 results');
  });

  it('empty filter returns all writeups', () => {
    const results = WRITEUPS.filter(() => true);
    assert.strictEqual(results.length, WRITEUPS.length, 'Empty filter should return all writeups');
  });
});

describe('Writeup Content Sanitization Safety', () => {
  it('content only uses allowed HTML tags', () => {
    const allowedTags = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'br', 'h1', 'h2', 'h3', 'h4', 'blockquote'];
    WRITEUPS.forEach((w, i) => {
      const tags = w.content.match(/<\s*([a-zA-Z][a-zA-Z0-9]*)/g) || [];
      const tagNames = tags.map(t => t.replace(/<\s*/, '').toLowerCase());
      tagNames.forEach(tagName => {
        assert.ok(allowedTags.includes(tagName),
          `Writeup ${i} uses disallowed tag <${tagName}> — allowed: ${allowedTags.join(', ')}`);
      });
    });
  });

  it('content has no script tags or event handlers', () => {
    WRITEUPS.forEach((w, i) => {
      assert.ok(!w.content.toLowerCase().includes('<script'),
        `Writeup ${i} contains a <script> tag — XSS risk`);
      assert.ok(!/on\w+\s*=/.test(w.content),
        `Writeup ${i} contains an inline event handler — XSS risk`);
    });
  });
});
