type Handler = (request: Request) => Response | Promise<Response>;

type QueryState = {
  table: string;
  action: string;
  values?: unknown;
  options?: unknown;
  filters: Array<{ method: string; args: unknown[] }>;
  selectedColumns?: string;
};

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

type QueryHandler = (state: QueryState) => QueryResult | Promise<QueryResult>;

export type QueryCall = QueryState;

export function assert(
  condition: unknown,
  message = "Expected condition to be truthy.",
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals<T>(
  actual: T,
  expected: T,
  message?: string,
): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      message ?? `Expected ${String(actual)} to equal ${String(expected)}.`,
    );
  }
}

export function assertExists<T>(
  value: T | null | undefined,
  message = "Expected value to exist.",
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export class MockQueryBuilder implements PromiseLike<QueryResult> {
  private readonly state: QueryState;

  constructor(
    table: string,
    action: string,
    private readonly handler: QueryHandler,
    values?: unknown,
    options?: unknown,
  ) {
    this.state = {
      table,
      action,
      values,
      options,
      filters: [],
    };
  }

  select(columns?: string): this {
    this.state.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.state.filters.push({ method: "eq", args: [column, value] });
    return this;
  }

  is(column: string, value: unknown): this {
    this.state.filters.push({ method: "is", args: [column, value] });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.state.filters.push({ method: "gt", args: [column, value] });
    return this;
  }

  in(column: string, value: unknown[]): this {
    this.state.filters.push({ method: "in", args: [column, value] });
    return this;
  }

  returns<T>(): Promise<QueryResult & { data?: T }> {
    return this.execute() as Promise<QueryResult & { data?: T }>;
  }

  maybeSingle<T>(): Promise<QueryResult & { data?: T | null }> {
    return this.execute() as Promise<QueryResult & { data?: T | null }>;
  }

  single<T>(): Promise<QueryResult & { data?: T }> {
    return this.execute() as Promise<QueryResult & { data?: T }>;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private execute(): Promise<QueryResult> {
    return Promise.resolve(this.handler(this.state));
  }
}

export function createMockSupabaseClient(params: {
  userId?: string;
  calls?: QueryCall[];
  handler?: QueryHandler;
}) {
  const handler = params.handler ?? (() => ({ data: null, error: null }));

  return {
    auth: {
      getUser: (token: string) =>
        Promise.resolve({
          data: {
            user: token === "valid-user-token" && params.userId
              ? { id: params.userId }
              : null,
          },
          error: token === "valid-user-token"
            ? null
            : { message: "invalid token" },
        }),
    },
    from: (table: string) => ({
      select: (columns?: string) => {
        const builder = new MockQueryBuilder(table, "select", recordAndHandle);
        return builder.select(columns);
      },
      insert: (values: unknown) =>
        new MockQueryBuilder(table, "insert", recordAndHandle, values),
      update: (values: unknown) =>
        new MockQueryBuilder(table, "update", recordAndHandle, values),
      upsert: (values: unknown, options?: unknown) =>
        new MockQueryBuilder(table, "upsert", recordAndHandle, values, options),
    }),
  };

  function recordAndHandle(
    state: QueryState,
  ): QueryResult | Promise<QueryResult> {
    params.calls?.push({
      ...state,
      filters: [...state.filters],
    });

    return handler(state);
  }
}

export function installDenoServeMock(): { getHandler: () => Handler } {
  let handler: Handler | null = null;

  Object.defineProperty(Deno, "serve", {
    configurable: true,
    value: (registeredHandler: Handler) => {
      handler = registeredHandler;
      return {
        finished: Promise.resolve(),
        shutdown: () => undefined,
      };
    },
  });

  return {
    getHandler: () => {
      assertExists(
        handler,
        "Edge Function did not register a Deno.serve handler.",
      );
      return handler;
    },
  };
}

export async function importEdgeFunction(path: string): Promise<void> {
  await import(`${path}?test=${crypto.randomUUID()}`);
}

export function setFunctionEnv(): void {
  Deno.env.set("SUPABASE_URL", "http://supabase.test");
  Deno.env.set("SUPABASE_ANON_KEY", "anon-key");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  Deno.env.set("GOOGLE_CLIENT_ID", "google-client-id");
  Deno.env.set("GOOGLE_CLIENT_SECRET", "google-client-secret");
  Deno.env.set(
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost/functions/v1/youtube-oauth-callback",
  );
  Deno.env.set(
    "YOUTUBE_TOKEN_ENCRYPTION_KEY",
    "0123456789abcdef0123456789abcdef",
  );
  Deno.env.set("APP_URL", "http://localhost:4200");
}

export function resetFunctionEnv(): void {
  for (
    const name of [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_OAUTH_REDIRECT_URI",
      "YOUTUBE_TOKEN_ENCRYPTION_KEY",
      "APP_URL",
    ]
  ) {
    Deno.env.delete(name);
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function assertRedirect(
  response: Response,
  expectedSearch: Record<string, string>,
): URL {
  assertEquals(response.status, 303);
  const location = response.headers.get("location");
  assertExists(location);
  const url = new URL(location);

  for (const [key, value] of Object.entries(expectedSearch)) {
    assertEquals(url.searchParams.get(key), value);
  }

  return url;
}

export function assertNoTokenLeak(url: URL, rawTokens: string[]): void {
  const serializedUrl = url.toString();

  for (const token of rawTokens) {
    assert(
      !serializedUrl.includes(token),
      `Redirect URL leaked raw token ${token}.`,
    );
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256Bytes(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

export async function encryptTokenForTest(token: string): Promise<string> {
  const keyMaterial = await sha256Bytes("0123456789abcdef0123456789abcdef");
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    new TextEncoder().encode(token),
  );

  return [
    "aes-gcm-v1",
    base64UrlEncode(iv),
    base64UrlEncode(new Uint8Array(ciphertext)),
  ].join(":");
}
