import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as leadsGet } from '../app/api/admin/leads/route';
import { GET as leadDetailGet } from '../app/api/admin/leads/[id]/route';
import { GET as userDetailsGet } from '../app/api/user-details/route';

describe('Admin Leads API Route & Validation Tests', () => {
  it('should return 403 Forbidden for /api/user-details', async () => {
    const req = new NextRequest('http://localhost:3000/api/user-details');
    const res = await userDetailsGet(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it('should validate query parameters and reject invalid pagination on /api/admin/leads', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/leads?limit=999');
    const res = await leadsGet(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('Invalid query parameters'));
  });

  it('should reject invalid ObjectId format on /api/admin/leads/[id]', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/leads/invalid-id');
    const res = await leadDetailGet(req, { params: Promise.resolve({ id: 'invalid-id' }) });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.message.includes('Invalid lead ID format'));
  });

  it('should include strict private cache prevention headers on /api/admin/leads responses', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/leads');
    const res = await leadsGet(req);
    assert.ok(res.headers.get('cache-control')?.includes('no-store'));
    assert.ok(res.headers.get('cache-control')?.includes('no-cache'));
  });
});
