import {
  assertEquals,
  assertExists,
  createMockSupabaseClient,
  encryptTokenForTest,
  importEdgeFunction,
  installDenoServeMock,
  type QueryCall,
  resetFunctionEnv,
  setFunctionEnv,
} from "./edge-test-helpers.ts";

const userId = "00000000-0000-4000-8000-000000000001";
const connectionId = "10000000-0000-4000-8000-000000000001";
const jobId = "20000000-0000-4000-8000-000000000001";

Deno.test("youtube-sync-comments imports paginated comments with mocked YouTube APIs", async () => {
  setFunctionEnv();
  const serve = installDenoServeMock();
  const calls: QueryCall[] = [];
  const upsertedComments: unknown[] = [];
  const jobUpdates: Array<Record<string, unknown>> = [];
  const encryptedAccessToken = await encryptTokenForTest(
    "youtube-access-token",
  );
  const encryptedRefreshToken = await encryptTokenForTest(
    "youtube-refresh-token",
  );

  (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch =
    ((input) => {
      const url = input instanceof URL || typeof input === "string"
        ? new URL(input)
        : new URL(input.url);

      if (url.pathname === "/youtube/v3/commentThreads") {
        const pageToken = url.searchParams.get("pageToken");

        return Promise.resolve(Response.json(
          pageToken === "page-2"
            ? {
              items: [
                commentThread("comment-2", "video-2", "Second comment", 7),
              ],
            }
            : {
              nextPageToken: "page-2",
              items: [
                commentThread("comment-1", "video-1", "First comment", 3),
              ],
            },
        ));
      }

      if (url.pathname === "/youtube/v3/videos") {
        const ids = url.searchParams.get("id")?.split(",") ?? [];
        return Promise.resolve(Response.json({
          items: ids.map((id) => ({
            id,
            snippet: {
              title: `Video ${id}`,
              publishedAt: "2026-01-01T00:00:00.000Z",
              thumbnails: {
                high: {
                  url: `https://img.youtube.com/${id}.jpg`,
                },
              },
            },
          })),
        }));
      }

      return Promise.resolve(new Response("{}", { status: 404 }));
    }) as typeof fetch;

  (globalThis as typeof globalThis & { __supabaseMock?: unknown })
    .__supabaseMock = {
      createClient: (_url: string, key: string) =>
        createMockSupabaseClient({
          userId,
          calls,
          handler: (query) => {
            if (key === "anon-key") {
              return { data: null, error: null };
            }

            if (
              query.table === "youtube_connections" && query.action === "select"
            ) {
              return {
                data: {
                  id: connectionId,
                  user_id: userId,
                  channel_id: "channel-1",
                  status: "active",
                  encrypted_refresh_token: encryptedRefreshToken,
                  encrypted_access_token: encryptedAccessToken,
                  access_token_expires_at: "2999-01-01T00:00:00.000Z",
                },
                error: null,
              };
            }

            if (
              query.table === "youtube_sync_jobs" && query.action === "insert"
            ) {
              return {
                data: syncJob("running", 0, 0, 0, null, null),
                error: null,
              };
            }

            if (query.table === "youtube_videos" && query.action === "upsert") {
              return { data: null, error: null };
            }

            if (query.table === "youtube_videos" && query.action === "select") {
              const ids = (query.filters.find((filter) =>
                filter.method === "in"
              )?.args[1] ?? []) as string[];
              return {
                data: ids.map((id, index) => ({
                  id: `video-row-${id}-${index}`,
                  youtube_video_id: id,
                })),
                error: null,
              };
            }

            if (query.table === "comments" && query.action === "select") {
              return { data: [], error: null };
            }

            if (query.table === "comments" && query.action === "upsert") {
              upsertedComments.push(...query.values as unknown[]);
              return { data: null, error: null };
            }

            if (
              query.table === "youtube_sync_jobs" && query.action === "update"
            ) {
              jobUpdates.push(query.values as Record<string, unknown>);
              const lastUpdate = query.values as Record<string, unknown>;

              return {
                data: syncJob(
                  lastUpdate["status"] as "running" | "completed" | undefined ??
                    "running",
                  Number(lastUpdate["imported_count"] ?? 2),
                  Number(lastUpdate["updated_count"] ?? 0),
                  Number(lastUpdate["processed_count"] ?? 2),
                  lastUpdate["page_token"] as string | null | undefined ?? null,
                  null,
                ),
                error: null,
              };
            }

            return { data: null, error: null };
          },
        }),
    };

  await importEdgeFunction("../youtube-sync-comments/index.ts");

  const response = await serve.getHandler()(
    new Request("http://localhost/functions/v1/youtube-sync-comments", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-user-token",
      },
    }),
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.job.status, "completed");
  assertEquals(body.job.importedCount, 2);
  assertEquals(body.job.processedCount, 2);
  assertEquals(upsertedComments.length, 2);
  assertEquals(
    jobUpdates.some((update) => update["page_token"] === "page-2"),
    true,
  );
  assertEquals(
    jobUpdates.some((update) => update["status"] === "completed"),
    true,
  );
  assertEquals(
    calls.some((call) => call.table === "comments" && call.action === "upsert"),
    true,
  );
  resetFunctionEnv();
});

Deno.test("youtube-sync-comments records quota/API errors on the sync job", async () => {
  setFunctionEnv();
  const serve = installDenoServeMock();
  const encryptedAccessToken = await encryptTokenForTest(
    "youtube-access-token",
  );
  const encryptedRefreshToken = await encryptTokenForTest(
    "youtube-refresh-token",
  );
  let failedJobUpdate: unknown = null;
  const originalConsoleError = console.error;
  console.error = () => undefined;

  (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch =
    ((input) => {
      const url = input instanceof URL || typeof input === "string"
        ? new URL(input)
        : new URL(input.url);

      if (url.pathname === "/youtube/v3/commentThreads") {
        return Promise.resolve(Response.json({
          error: {
            message: "Quota exceeded.",
            errors: [
              {
                reason: "quotaExceeded",
                message: "Quota exceeded.",
              },
            ],
          },
        }, { status: 403 }));
      }

      return Promise.resolve(new Response("{}", { status: 404 }));
    }) as typeof fetch;

  (globalThis as typeof globalThis & { __supabaseMock?: unknown })
    .__supabaseMock = {
      createClient: (_url: string, key: string) =>
        createMockSupabaseClient({
          userId,
          handler: (query) => {
            if (key === "anon-key") {
              return { data: null, error: null };
            }

            if (
              query.table === "youtube_connections" && query.action === "select"
            ) {
              return {
                data: {
                  id: connectionId,
                  user_id: userId,
                  channel_id: "channel-1",
                  status: "active",
                  encrypted_refresh_token: encryptedRefreshToken,
                  encrypted_access_token: encryptedAccessToken,
                  access_token_expires_at: "2999-01-01T00:00:00.000Z",
                },
                error: null,
              };
            }

            if (
              query.table === "youtube_sync_jobs" && query.action === "insert"
            ) {
              return {
                data: syncJob("running", 0, 0, 0, null, null),
                error: null,
              };
            }

            if (
              query.table === "youtube_sync_jobs" && query.action === "update"
            ) {
              const update = query.values as Record<string, unknown>;

              if (update["status"] === "failed") {
                failedJobUpdate = update;
                return {
                  data: syncJob(
                    "failed",
                    0,
                    0,
                    0,
                    null,
                    update["error_message"] as string,
                  ),
                  error: null,
                };
              }
            }

            return { data: null, error: null };
          },
        }),
    };

  try {
    await importEdgeFunction("../youtube-sync-comments/index.ts");

    const response = await serve.getHandler()(
      new Request("http://localhost/functions/v1/youtube-sync-comments", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-user-token",
        },
      }),
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.job.status, "failed");
    assertEquals(body.job.errorMessage, "quotaExceeded: Quota exceeded.");
    assertExists(failedJobUpdate);
    const failedUpdate = failedJobUpdate as Record<string, unknown>;
    assertEquals(failedUpdate["status"], "failed");
    assertEquals(
      failedUpdate["error_message"],
      "quotaExceeded: Quota exceeded.",
    );
  } finally {
    console.error = originalConsoleError;
    resetFunctionEnv();
  }
});

function commentThread(
  commentId: string,
  videoId: string,
  text: string,
  likeCount: number,
) {
  return {
    id: `thread-${commentId}`,
    snippet: {
      videoId,
      topLevelComment: {
        id: commentId,
        snippet: {
          videoId,
          authorDisplayName: "Viewer",
          authorChannelUrl: "https://youtube.com/@viewer",
          textOriginal: text,
          likeCount,
          publishedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
  };
}

function syncJob(
  status: "running" | "completed" | "failed",
  importedCount: number,
  updatedCount: number,
  processedCount: number,
  pageToken: string | null,
  errorMessage: string | null,
) {
  return {
    id: jobId,
    status,
    imported_count: importedCount,
    updated_count: updatedCount,
    processed_count: processedCount,
    page_token: pageToken,
    error_message: errorMessage,
  };
}
