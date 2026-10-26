export const API_BASE = typeof window !== 'undefined' 
  ? '/api/v1' 
  : (process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000') + '/api/v1';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && !endpoint.startsWith('/auth/')) window.dispatchEvent(new Event('arise:session-expired'));
    let errorMsg = `API Error ${response.status}`;
    let errorCode: string | undefined;
    try {
      const errData = await response.json();
      errorCode = errData.detail?.code;
      errorMsg = Array.isArray(errData.detail) ? errData.detail.map((e: any) => e.msg).join("; ") : String(errData.detail?.message || errData.detail || errData.message || "Request failed");
    } catch {
      // fallback
    }
    throw new ApiError(errorMsg, response.status, errorCode);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

