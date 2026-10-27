import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDoc, listDocIds } from './registry.ts';
import { HELP_TASKS, HELP_TOPICS } from '../helpTasks.ts';

describe('published help', () => {
  it('resolves static article references in UI components and pages', () => {
    const scan = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) scan(path);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          const source = readFileSync(path, 'utf8');
          for (const match of source.matchAll(/(?:docId|helpDocId|infoDocId|topic)\s*(?:=|:)\s*["']([^"']+)["']/g)) {
            expect(getDoc(match[1]), `${path}: ${match[1]}`).not.toBeNull();
          }
        }
      }
    };
    scan(join(process.cwd(), 'src/components'));
    scan(join(process.cwd(), 'src/pages'));
  });
  it('provides a published contextual article for every main screen', () => {
    for (const [tab, id] of Object.entries(HELP_TOPICS)) expect(getDoc(id), tab).not.toBeNull();
  });
  it('provides search metadata and readable content for every article', () => {
    for (const id of listDocIds()) {
      const doc = getDoc(id)!;
      expect(doc.frontmatter.title, id).toBeTruthy();
      expect(doc.frontmatter.summary, id).toBeTruthy();
      expect(doc.frontmatter.keywords, id).toBeTruthy();
      expect(doc.frontmatter.updated, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.body.trim().length, id).toBeGreaterThan(100);
    }
  });
  it('resolves every common question to a published article', () => {
    for (const task of HELP_TASKS) expect(getDoc(task.docId), task.question).not.toBeNull();
  });
  it('has no broken internal article links', () => {
    for (const id of listDocIds()) {
      for (const match of getDoc(id)!.body.matchAll(/\]\(doc:([^\s)]+)\)/g)) {
        expect(getDoc(match[1]), `${id} links to ${match[1]}`).not.toBeNull();
      }
    }
  });
});
