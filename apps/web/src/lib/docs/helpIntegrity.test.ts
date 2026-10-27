import { describe, expect, it } from 'vitest';
import { getDoc, listDocIds } from './registry.ts';
import { HELP_TASKS } from '../helpTasks.ts';

describe('published help', () => {
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
