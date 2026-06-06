# Supabase Skill

Read this file when querying, inserting, updating, deleting, paginating, using Storage, Realtime, or Edge Functions.

## Main Principle

Supabase is the backend/API layer, but the frontend must not be trusted for authorization.

Use Supabase from services, not directly from presentational components.

## Supabase config

Supabase initial security configuration:

- Enable data api = true
- Automatically expose new tables = false
- Enable Automatic RLS = ture

---

## Supabase Client

Create a central client service.

```ts
import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabasePublishableKey);
}
```

---

## Environment Variables

Do not hardcode Supabase configuration inside services.

Use environment files:

```ts
export const environment = {
  production: false,
  supabaseUrl: "https://your-project.supabase.co",
  supabasePublishableKey: "your-public-publishable-key",
};
```

Allowed in frontend:

- Supabase URL
- Supabase publishable key

Never expose in frontend:

- Service role key
- Private API keys
- Database passwords
- Provider secrets
- Admin tokens

---

## Typed Database

Prefer generated Supabase database types.

Recommended location:

```txt
src/app/core/supabase/database.types.ts
```

Example:

```ts
import { Database } from "../../../core/supabase/database.types";

export type Comment = Database["public"]["Tables"]["comments"]["Row"];
export type CreateCommentDto = Database["public"]["Tables"]["comments"]["Insert"];
export type UpdateCommentDto = Database["public"]["Tables"]["comments"]["Update"];
```

Rules:

- Use `Row` for data returned by the database.
- Use `Insert` for creation payloads.
- Use `Update` for update payloads.
- Create ViewModels only when the UI needs a different shape.

---

## Select

Prefer explicit columns over `*`.

```ts
const { data, error } = await this.supabaseService.client.from("comments").select("id, content, author_name, created_at, is_favorite").order("created_at", { ascending: false });

if (error) {
  throw new Error(error.message);
}

return data ?? [];
```

Avoid:

```ts
const { data } = await this.supabaseService.client.from("comments").select("*");
```

---

## Insert

```ts
const { data, error } = await this.supabaseService.client
  .from("scripts")
  .insert({
    title: payload.title,
    user_id: userId,
  })
  .select()
  .single();

if (error) {
  throw new Error(error.message);
}

return data;
```

---

## Update

```ts
const { error } = await this.supabaseService.client.from("comments").update({ is_favorite: true }).eq("id", commentId);

if (error) {
  throw new Error(error.message);
}
```

---

## Delete

```ts
const { error } = await this.supabaseService.client.from("comments").delete().eq("id", commentId);

if (error) {
  throw new Error(error.message);
}
```

---

## Error Handling

Always check `error`.

Do not silently ignore failed Supabase operations.

Good:

```ts
if (error) {
  throw new Error(error.message);
}
```

Better for production:

```ts
if (error) {
  throw new AppError("Unable to load comments.", error);
}
```

Use the project error-handling pattern if one already exists.

---

## Pagination

Use pagination for large lists.

```ts
const from = page * pageSize;
const to = from + pageSize - 1;

const { data, error, count } = await this.supabaseService.client.from("comments").select("id, content, created_at", { count: "exact" }).range(from, to).order("created_at", { ascending: false });

if (error) {
  throw new Error(error.message);
}

return {
  data: data ?? [],
  count: count ?? 0,
};
```

---

## Realtime

Use Realtime only when the UI really needs live updates.

```ts
const channel = this.supabaseService.client
  .channel("comments-changes")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "comments",
    },
    () => {
      void this.loadComments();
    },
  )
  .subscribe();
```

Always clean up:

```ts
await this.supabaseService.client.removeChannel(channel);
```

---

## Storage

Use Supabase Storage for user-uploaded files.

Rules:

- Validate file type in the UI for UX.
- Enforce real permissions using Storage policies.
- Avoid public buckets for private user data.
- Store file metadata in the database when needed.
- Do not trust only frontend file validation.

---

## Edge Functions

Use Edge Functions when:

- Secrets are required
- External APIs need private credentials
- Admin operations are needed
- Business rules must not be exposed
- A privileged server-side operation is required

Do not implement sensitive operations directly in Angular.

---

## Supabase Service Rules

- Services should return typed data.
- Services should not mutate UI state directly.
- Services should not know about component-specific loading states.
- Services should handle Supabase errors.
- Services should not expose low-level query details to components unless necessary.
