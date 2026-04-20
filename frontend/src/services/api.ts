/// <reference types="vite/client" />

// Base API configuration with axios-like fetch wrapper

const API_BASE_URL = "/api";

type UnauthorizedHandler = (error: ApiError) => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedHandled = false;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
  unauthorizedHandled = false;
}

async function notifyUnauthorized(error: ApiError, hasToken: boolean): Promise<void> {
  if (!hasToken || !unauthorizedHandler || unauthorizedHandled) {
    return;
  }

  unauthorizedHandled = true;
  await unauthorizedHandler(error);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: any
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  private buildUrl(endpoint: string): URL {
    return new URL(`${this.baseURL}${endpoint}`, window.location.origin);
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, headers, ...restConfig } = config;

    // Build URL with query params
    let url = this.buildUrl(endpoint).toString();
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Add auth token if available
    const token = this.getAuthToken();
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    };

    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...restConfig,
      headers: requestHeaders,
    });

    // Handle non-JSON responses (like 204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new ApiError(response.status, response.statusText, data);

      if (response.status === 401) {
        await notifyUnauthorized(error, !!token);
      }

      throw error;
    }

    unauthorizedHandled = false;

    return data as T;
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: "DELETE" });
  }

  // Server-Sent Events for streaming
  createEventSource(endpoint: string, body?: any): EventSource {
    const token = this.getAuthToken();
      const url = this.buildUrl(endpoint);
    
    if (token) {
      url.searchParams.append("token", token);
    }
    
    if (body) {
      Object.entries(body).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return new EventSource(url.toString());
  }

  /**
   * POST request with streaming response (SSE via fetch)
   * Returns a Response object with readable body for streaming
   */
  async fetchStream(endpoint: string, body?: any): Promise<Response> {
    const token = this.getAuthToken();
    const url = this.buildUrl(endpoint).toString();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new ApiError(response.status, response.statusText, data);

      if (response.status === 401) {
        await notifyUnauthorized(error, !!token);
      }

      throw error;
    }

    unauthorizedHandled = false;

    return response;
  }
}

export const api = new ApiClient(API_BASE_URL);
