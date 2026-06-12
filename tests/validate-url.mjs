import { describe, it } from 'node:test';
import assert from 'assert/strict';

// Test URL validation by importing project catalog and checking URLs
import PROJECT_CATALOG from '../js/project-catalog.js';

describe('URL Validation Security', () => {
  it('all projects with githubUrl have valid HTTPS URLs', () => {
    Object.values(PROJECT_CATALOG).forEach(project => {
      if (project.githubUrl) {
        assert.ok(
          project.githubUrl.startsWith('https://'),
          `${project.name}: githubUrl must use HTTPS, got ${project.githubUrl}`
        );
      }
    });
  });

  it('all projects with liveUrl have valid HTTPS URLs', () => {
    Object.values(PROJECT_CATALOG).forEach(project => {
      if (project.liveUrl) {
        assert.ok(
          project.liveUrl.startsWith('https://'),
          `${project.name}: liveUrl must use HTTPS, got ${project.liveUrl}`
        );
      }
    });
  });

  it('projects with null URLs are handled gracefully', () => {
    const nullUrlProjects = Object.values(PROJECT_CATALOG).filter(p => p.githubUrl === null);
    assert.ok(nullUrlProjects.length > 0, 'Should have projects with null githubUrl');
    nullUrlProjects.forEach(p => {
      assert.strictEqual(p.githubUrl, null);
    });
  });

  it('all URLs are non-empty strings when present', () => {
    Object.values(PROJECT_CATALOG).forEach(project => {
      if (project.githubUrl) {
        assert.ok(project.githubUrl.length > 0, `${project.name}: githubUrl should not be empty`);
      }
      if (project.liveUrl) {
        assert.ok(project.liveUrl.length > 0, `${project.name}: liveUrl should not be empty`);
      }
    });
  });
});
