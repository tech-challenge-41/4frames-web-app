import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL, ApiError, apiFetch, UNAUTHORIZED_EVENT } from './http';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the API base URL and sends the token as Bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/videos', { method: 'GET' }, 'token-123');

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_URL}/videos`);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-123');
  });

  it('keeps the caller headers and sends no Authorization without a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, {}));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' } });

    const headers = new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.has('Authorization')).toBe(false);
  });

  it('throws ApiError with the status and the message field of the error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Video job not found' })));

    const error = await apiFetch('/videos/x').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'Video job not found' });
  });

  it('falls back to the error field of the body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Authorization header is missing' })));

    await expect(apiFetch('/videos')).rejects.toMatchObject({
      status: 401,
      message: 'Authorization header is missing'
    });
  });

  it('announces an expired session when an authenticated call gets 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Invalid token' })));
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    try {
      await expect(apiFetch('/videos', {}, 'expired-token')).rejects.toBeInstanceOf(ApiError);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, listener);
    }
  });

  it('does not announce anything on a 401 without token, like a wrong password', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Invalid credentials' })));
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener);

    try {
      await expect(apiFetch('/auth/login', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
      expect(listener).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, listener);
    }
  });

  it('uses a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })));

    await expect(apiFetch('/videos')).rejects.toMatchObject({ status: 502, message: 'Request failed' });
  });
});
