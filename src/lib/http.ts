export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/**
 * Disparado em `window` quando uma chamada autenticada volta 401 (token vencido ou inválido). O AuthProvider
 * escuta, encerra a sessão, e o ProtectedRoute leva ao login. Um login com senha errada também volta 401, mas
 * vai sem token e não dispara o evento.
 */
export const UNAUTHORIZED_EVENT = '4frames:unauthorized';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, token?: string | null): Promise<Response> {
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    if (response.status === 401 && token) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    const data = await response.json().catch(() => ({}));
    throw new ApiError(data?.message ?? data?.error ?? 'Request failed', response.status);
  }

  return response;
}
