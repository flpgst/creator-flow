import {
  assert,
  assertEquals,
  assertExists,
  assertNoTokenLeak,
  assertRedirect,
  createMockSupabaseClient,
  importEdgeFunction,
  installDenoServeMock,
  type QueryCall,
  resetFunctionEnv,
  setFunctionEnv,
  sha256Hex,
} from "./edge-test-helpers.ts";

Deno.test("youtube-oauth-callback rejects invalid or expired state before calling Google", async () => {
  setFunctionEnv();
  const serve = installDenoServeMock();
  let googleWasCalled = false;

  (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (() => {
    googleWasCalled = true;
    return Promise.resolve(new Response("{}"));
  }) as typeof fetch;

  (globalThis as typeof globalThis & { __supabaseMock?: unknown })
    .__supabaseMock = {
      createClient: () =>
        createMockSupabaseClient({
          handler: () => ({ data: null, error: null }),
        }),
    };

  await importEdgeFunction("../youtube-oauth-callback/index.ts");

  const response = await serve.getHandler()(
    new Request(
      "http://localhost/functions/v1/youtube-oauth-callback?code=code-1&state=bad-state",
    ),
  );

  assertRedirect(response, {
    youtubeConnection: "error",
    error: "invalid_or_expired_state",
  });
  assertEquals(googleWasCalled, false);
  resetFunctionEnv();
});

Deno.test("youtube-oauth-callback validates state and never returns refresh token to frontend", async () => {
  setFunctionEnv();
  const serve = installDenoServeMock();
  const calls: QueryCall[] = [];
  const rawAccessToken = "raw-google-access-token";
  const rawRefreshToken = "raw-google-refresh-token";
  const state = "valid-state";
  const stateHash = await sha256Hex(state);
  let upsertedConnection: unknown = null;

  (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch =
    ((input) => {
      const url = input instanceof URL || typeof input === "string"
        ? new URL(input)
        : new URL(input.url);

      if (url.hostname === "oauth2.googleapis.com") {
        return Promise.resolve(Response.json({
          access_token: rawAccessToken,
          expires_in: 3600,
          refresh_token: rawRefreshToken,
          scope:
            "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl",
        }));
      }

      if (
        url.hostname === "www.googleapis.com" &&
        url.pathname === "/youtube/v3/channels"
      ) {
        return Promise.resolve(Response.json({
          items: [
            {
              id: "channel-1",
              snippet: {
                title: "Creator Channel",
              },
            },
          ],
        }));
      }

      return Promise.resolve(new Response("{}", { status: 404 }));
    }) as typeof fetch;

  (globalThis as typeof globalThis & { __supabaseMock?: unknown })
    .__supabaseMock = {
      createClient: () =>
        createMockSupabaseClient({
          calls,
          handler: (query) => {
            if (
              query.table === "youtube_oauth_states" &&
              query.action === "update"
            ) {
              assert(
                query.filters.some((filter) =>
                  filter.method === "eq" && filter.args[1] === stateHash
                ),
              );
              return {
                data: { id: "oauth-state-id", user_id: "user-1" },
                error: null,
              };
            }

            if (
              query.table === "youtube_connections" && query.action === "select"
            ) {
              return { data: null, error: null };
            }

            if (
              query.table === "youtube_connections" && query.action === "upsert"
            ) {
              upsertedConnection = query.values as Record<string, unknown>;
              return { data: null, error: null };
            }

            return { data: null, error: null };
          },
        }),
    };

  await importEdgeFunction("../youtube-oauth-callback/index.ts");

  const response = await serve.getHandler()(
    new Request(
      `http://localhost/functions/v1/youtube-oauth-callback?code=code-1&state=${state}`,
    ),
  );
  const redirectUrl = assertRedirect(response, {
    youtubeConnection: "success",
  });

  assertNoTokenLeak(redirectUrl, [rawAccessToken, rawRefreshToken]);
  assertExists(upsertedConnection);
  const connection = upsertedConnection as Record<string, unknown>;
  assertEquals(connection["user_id"], "user-1");
  assertEquals(connection["channel_id"], "channel-1");
  assertEquals(
    (connection["encrypted_refresh_token"] as string).includes(rawRefreshToken),
    false,
  );
  assertEquals(
    (connection["encrypted_access_token"] as string).includes(rawAccessToken),
    false,
  );
  assertEquals(
    calls.some((call) =>
      call.table === "youtube_connections" && call.action === "upsert"
    ),
    true,
  );
  resetFunctionEnv();
});
