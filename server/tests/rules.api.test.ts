import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database/index.js';
import type { Rule } from '../src/models/rule.model.js';

/**
 * End-to-end over the real Express app and a real SQLite database — in memory,
 * so there is no file to clean up and no test can see another's rows.
 *
 * `createApp` taking the connection as an argument is what makes this possible
 * without a running server or a fixture file (plan §4.1).
 */

const db = createDatabase(':memory:');
let server: Server;
let base: string;

interface Response<T> {
  status: number;
  body: T;
}

const call = async <T = unknown>(path: string, init?: RequestInit): Promise<Response<T>> => {
  const response = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  return {
    status: response.status,
    body: (response.status === 204 ? null : await response.json()) as T,
  };
};

const post = <T = unknown>(path: string, body: unknown) =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body) });

const URGENT = {
  keyword: 'urgent',
  matchType: 'contains',
  actionType: 'highlight',
  color: '#ef4444',
} as const;

beforeAll(async () => {
  server = createApp(db).listen(0);
  await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterAll(() => {
  server.close();
  db.close();
});

beforeEach(() => {
  db.exec('DELETE FROM rules');
});

describe('GET /health', () => {
  it('reports ok', async () => {
    const { status, body } = await call<{ status: string }>('/health');

    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });
});

describe('rules CRUD', () => {
  it('creates a rule and reads it back', async () => {
    const created = await post<Rule>('/rules', URGENT);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ keyword: 'urgent', color: '#ef4444', isEnabled: true });

    const listed = await call<Rule[]>('/rules');

    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]?.id).toBe(created.body.id);
  });

  it('persists to the database, not to memory', async () => {
    await post('/rules', URGENT);

    const row = db.prepare('SELECT keyword, action_type FROM rules').get();

    expect(row).toEqual({ keyword: 'urgent', action_type: 'highlight' });
  });

  it('orders by priority desc, then id asc', async () => {
    await post('/rules', { ...URGENT, keyword: 'low', priority: 1 });
    await post('/rules', { ...URGENT, keyword: 'high', priority: 9 });

    const { body } = await call<Rule[]>('/rules');

    expect(body.map((rule) => rule.keyword)).toEqual(['high', 'low']);
  });

  it('rejects a tooltip rule with no label, naming the field', async () => {
    const { status, body } = await post<{ error: string; details: Record<string, string> }>(
      '/rules',
      { keyword: 'deadline', matchType: 'contains', actionType: 'tooltip' },
    );

    expect(status).toBe(400);
    expect(body.error).toBe('Validation failed');
    expect(body.details.label).toBe('Enter a label to show on hover');
  });

  it('replaces a rule on PUT', async () => {
    const { body: created } = await post<Rule>('/rules', URGENT);

    const { status, body } = await call<Rule>(`/rules/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        keyword: 'deadline',
        matchType: 'exact',
        actionType: 'tooltip',
        label: 'IMPORTANT',
      }),
    });

    expect(status).toBe(200);
    expect(body).toMatchObject({ keyword: 'deadline', label: 'IMPORTANT', matchType: 'exact' });
    // Switching action type clears the field the old one used.
    expect(body.color).toBeNull();
  });

  it('toggles isEnabled on PATCH', async () => {
    const { body: created } = await post<Rule>('/rules', URGENT);

    const { status, body } = await call<Rule>(`/rules/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: false }),
    });

    expect(status).toBe(200);
    expect(body.isEnabled).toBe(false);
  });

  it('deletes a rule, and 404s the second time', async () => {
    const { body: created } = await post<Rule>('/rules', URGENT);

    expect((await call(`/rules/${created.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await call(`/rules/${created.id}`, { method: 'DELETE' })).status).toBe(404);
  });

  it('404s an unknown id rather than reporting success', async () => {
    const { status, body } = await call<{ error: string }>('/rules/9999', {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: false }),
    });

    expect(status).toBe(404);
    expect(body.error).toBe('Rule not found');
  });

  it('404s an unknown route in the same error shape', async () => {
    const { status, body } = await call<{ error: string }>('/nope');

    expect(status).toBe(404);
    expect(body).toHaveProperty('error');
  });
});

describe('POST /process', () => {
  it("reproduces the brief's example from the seeded rules", async () => {
    const seeded = await post<Rule[]>('/rules/examples', {});
    expect(seeded.status).toBe(201);
    expect(seeded.body).toHaveLength(3);

    const { status, body } = await post<{
      segments: Array<{ text: string; highlight: string | null; labels: string[] }>;
      summary: Array<{ keyword: string; matchCount: number }>;
    }>('/process', {
      text: 'The meeting with the finance team is tomorrow. The deadline is urgent.',
    });

    expect(status).toBe(200);
    expect(body.segments).toEqual([
      { text: 'The ', rules: [], highlight: null, labels: [] },
      { text: 'meeting', rules: [expect.any(Number)], highlight: '#3b82f6', labels: [] },
      { text: ' with the finance team is tomorrow. The ', rules: [], highlight: null, labels: [] },
      { text: 'deadline', rules: [expect.any(Number)], highlight: null, labels: ['IMPORTANT'] },
      { text: ' is ', rules: [], highlight: null, labels: [] },
      { text: 'urgent', rules: [expect.any(Number)], highlight: '#ef4444', labels: [] },
      { text: '.', rules: [], highlight: null, labels: [] },
    ]);
    expect(body.summary.map((entry) => entry.matchCount)).toEqual([1, 1, 1]);
  });

  it('reads the rules from the database, not from the request', async () => {
    await post('/rules', URGENT);
    // No rules in the body: the server must still find the stored one.
    const { body } = await post<{ segments: Array<{ text: string; highlight: string | null }> }>(
      '/process',
      { text: 'this is urgent' },
    );

    expect(body.segments.find((s) => s.text === 'urgent')?.highlight).toBe('#ef4444');
  });

  it('leaves disabled rules out', async () => {
    const { body: created } = await post<Rule>('/rules', URGENT);
    await call(`/rules/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isEnabled: false }),
    });

    const { body } = await post<{ segments: Array<{ text: string }> }>('/process', {
      text: 'this is urgent',
    });

    expect(body.segments).toEqual([
      { text: 'this is urgent', rules: [], highlight: null, labels: [] },
    ]);
  });

  it('previews a draft rule without saving it', async () => {
    const { body } = await post<{ segments: Array<{ text: string; isDraft?: boolean }> }>(
      '/process',
      { text: 'this is urgent', draftRule: { ...URGENT, id: -1, priority: 9999 } },
    );

    expect(body.segments.find((s) => s.text === 'urgent')?.isDraft).toBe(true);
    expect((await call<Rule[]>('/rules')).body).toEqual([]);
  });

  it('rejects a malformed draft rule', async () => {
    const { status } = await post('/process', {
      text: 'this is urgent',
      draftRule: { ...URGENT, color: 'not-a-colour' },
    });

    expect(status).toBe(400);
  });
});
