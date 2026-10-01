import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import axios from 'axios';
import api from './api.js';

const storage = new Map();
globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
};
globalThis.window = { location: { pathname: '/', href: '/' } };

const ok = (config, data = {}) => ({ config, data, status: 200, headers: {}, statusText: 'OK' });
const unauthorized = (config) => new axios.AxiosError(
    'Unauthorized', 'ERR_BAD_REQUEST', config, null,
    { config, status: 401, data: {}, headers: {} },
);

beforeEach(() => {
    storage.clear();
    localStorage.setItem('accessToken', 'access-token');
    localStorage.setItem('refreshToken', 'refresh-token');
    delete api.defaults.headers.common.Authorization;
    api.defaults.adapter = async (config) => ok(config);
});

test('admin enquiry reads and master-data writes retain authorization', async () => {
    for (const [method, url] of [
        ['get', '/api/enquiryform/'], ['get', '/api/holiday-form/'],
        ['get', '/api/business-journey-registrations/'], ['delete', '/api/cities/1/'],
        ['get', '/api/global-horizons-srilanka/'], ['patch', '/api/global-horizons-srilanka/1/'],
        ['delete', '/api/global-horizons-srilanka/1/'],
        ['patch', '/api/airports/2/'], ['post', '/api/pickup-point-masters/'],
    ]) {
        const response = await api.request({ method, url });
        assert.equal(response.config.headers.Authorization, 'Bearer access-token', `${method} ${url}`);
    }
});

test('public requests remove inherited credentials, including after refresh', async () => {
    api.defaults.headers.common.Authorization = 'Bearer stale-token';
    for (const request of [
        { method: 'get', url: '/api/cities/?country_id=1' },
        { method: 'get', url: '/api/visas/?is_popular=true' },
        { method: 'get', url: '/api/packages/' },
        { method: 'get', url: '/api/goimomi-products/1/' },
        { method: 'post', url: '/api/enquiryform/' },
        { method: 'post', url: '/api/global-horizons-srilanka/' },
        { method: 'post', url: '/api/token/' },
        { method: 'get', url: '/api/packages/', skipAuth: true },
    ]) {
        const response = await api.request(request);
        assert.equal(response.config.headers.Authorization, undefined);
    }
});

test('admin catalogue queries and writes retain authorization', async () => {
    for (const request of [
        { method: 'get', url: '/api/visas/?all=true' },
        { method: 'get', url: '/api/packages/', params: { all: true } },
        { method: 'patch', url: '/api/visas/1/' },
        { method: 'post', url: '/api/goimomi-products/' },
    ]) {
        const response = await api.request(request);
        assert.equal(response.config.headers.Authorization, 'Bearer access-token');
    }
});

test('public visa reads never attempt to refresh an expired admin session', async () => {
    let refreshes = 0;
    axios.defaults.adapter = async (config) => { refreshes++; return ok(config); };
    api.defaults.adapter = async (config) => {
        assert.equal(config.headers.Authorization, undefined);
        return ok(config, []);
    };
    await api.get('/api/visas/?is_popular=true');
    assert.equal(refreshes, 0);
});

test('a logged-out request cannot reuse an old default bearer token', async () => {
    storage.clear();
    api.defaults.headers.common.Authorization = 'Bearer stale-token';
    const response = await api.get('/api/users/');
    assert.equal(response.config.headers.Authorization, undefined);
});

test('simultaneous expired-token responses share one refresh request', async () => {
    let refreshes = 0;
    axios.defaults.adapter = async (config) => {
        refreshes++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ok(config, { access: 'new-access-token' });
    };
    api.defaults.adapter = async (config) => {
        if (config.headers.Authorization !== 'Bearer new-access-token') throw unauthorized(config);
        return ok(config);
    };
    await Promise.all([api.get('/api/users/'), api.get('/api/cab-bookings/')]);
    assert.equal(refreshes, 1);
    assert.equal(localStorage.getItem('accessToken'), 'new-access-token');
    assert.equal(api.defaults.headers.common.Authorization, undefined);
});

test('skipAuth requests never trigger token refresh', async () => {
    let refreshes = 0;
    axios.defaults.adapter = async (config) => { refreshes++; return ok(config, { access: 'new' }); };
    api.defaults.adapter = async (config) => { throw unauthorized(config); };
    await assert.rejects(api.get('/api/packages/', { skipAuth: true }));
    assert.equal(refreshes, 0);
});

test('a failed refresh clears expired credentials', async () => {
    axios.defaults.adapter = async (config) => { throw unauthorized(config); };
    api.defaults.adapter = async (config) => { throw unauthorized(config); };
    await assert.rejects(api.get('/api/users/'));
    assert.equal(localStorage.getItem('accessToken'), null);
    assert.equal(localStorage.getItem('refreshToken'), null);
});

test('an old refresh response cannot overwrite or clear a newer login', async () => {
    let finishRefresh;
    let startedRefresh;
    const started = new Promise((resolve) => { startedRefresh = resolve; });
    axios.defaults.adapter = async (config) => {
        startedRefresh();
        await new Promise((resolve) => { finishRefresh = resolve; });
        return ok(config, { access: 'old-session-access' });
    };
    api.defaults.adapter = async (config) => { throw unauthorized(config); };
    const request = assert.rejects(api.get('/api/users/'));
    await started;
    localStorage.setItem('refreshToken', 'new-session-refresh');
    localStorage.setItem('accessToken', 'new-session-access');
    finishRefresh();
    await request;
    assert.equal(localStorage.getItem('accessToken'), 'new-session-access');
    assert.equal(localStorage.getItem('refreshToken'), 'new-session-refresh');
});
