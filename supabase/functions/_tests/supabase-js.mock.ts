type SupabaseMock = {
  createClient: (...args: unknown[]) => unknown;
};

export function createClient(...args: unknown[]): unknown {
  const mock =
    (globalThis as typeof globalThis & { __supabaseMock?: SupabaseMock })
      .__supabaseMock;

  if (!mock) {
    throw new Error("Supabase mock was not configured.");
  }

  return mock.createClient(...args);
}
