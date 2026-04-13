import { URLSearchParams } from "node:url";
import { AppError } from "../../errors/app-error";

const REQUEST_TIMEOUT_MS = 10_000;

const withQuery = (path: string, query?: Record<string, string | undefined>): string => {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value);
    }
  });

  const suffix = params.toString();
  return suffix.length > 0 ? `${path}?${suffix}` : path;
};

export class SupabaseRestClient {
  public constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  public async select<T>(table: string, query?: Record<string, string | undefined>): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${table}`, { method: "GET", query });
  }

  public async insert<T>(table: string, rows: T[], prefer = "return=representation"): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${table}`, {
      method: "POST",
      body: rows,
      headers: { Prefer: prefer },
    });
  }

  public async upsert<T>(table: string, rows: T[], onConflict: string): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${table}`, {
      method: "POST",
      query: { on_conflict: onConflict },
      body: rows,
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    });
  }

  public async patch<T>(table: string, query: Record<string, string>, patch: Record<string, unknown>): Promise<T[]> {
    return this.request<T[]>(`/rest/v1/${table}`, {
      method: "PATCH",
      query,
      body: patch,
      headers: { Prefer: "return=representation" },
    });
  }

  public async delete(table: string, query: Record<string, string>): Promise<void> {
    await this.request(`/rest/v1/${table}`, { method: "DELETE", query });
  }

  private async request<T>(
    path: string,
    options: { method: "GET" | "POST" | "PATCH" | "DELETE"; query?: Record<string, string | undefined>; body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(`${this.baseUrl}${withQuery(path, options.query)}`, {
      method: options.method,
      headers: {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new AppError({
        statusCode: response.status,
        code: "SUPABASE_REST_FAILED",
        message: `Supabase REST call failed: ${options.method} ${path}`,
        details: { body: await response.text() },
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (text.length === 0) {
      return [] as T;
    }

    return JSON.parse(text) as T;
  }
}

