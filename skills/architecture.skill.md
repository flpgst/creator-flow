# Architecture Skill

Read this file when creating folders, moving files, defining boundaries, or adding new features.

## Main Principle

Use a feature-based architecture.

Prefer this:

```txt
src/
  app/
    core/
    shared/
    features/
      comments/
      scripts/
      dashboard/
```

Avoid placing all files globally by technical type:

```txt
src/
  app/
    components/
    services/
    models/
    pages/
```

That structure becomes harder to scale as the application grows.

---

## Recommended Structure

```txt
src/
  app/
    core/
      auth/
      config/
      guards/
      interceptors/
      layout/
      supabase/
    shared/
      components/
      directives/
      pipes/
      utils/
      types/
    features/
      feature-name/
        components/
        pages/
        services/
        stores/
        types/
    app.component.ts
    app.config.ts
    app.routes.ts
  environments/
    environment.ts
    environment.development.ts
```

---

## `core/`

Use `core/` for application-wide infrastructure.

Examples:

```txt
core/auth/
core/supabase/
core/guards/
core/layout/
core/config/
```

Good candidates for `core/`:

- Supabase client
- Auth service
- Auth store
- Global guards
- Global layout components
- App configuration
- Interceptors

Do not put feature-specific business logic in `core/`.

---

## `shared/`

Use `shared/` for reusable code that does not depend on a specific business feature.

Examples:

```txt
shared/components/loading-state/
shared/components/empty-state/
shared/components/error-state/
shared/pipes/
shared/directives/
shared/utils/
shared/types/
```

Good candidates for `shared/`:

- Generic UI components
- Generic pipes
- Generic directives
- Utility functions
- Generic TypeScript helpers

Avoid putting feature services in `shared/`.

---

## `features/`

Each business domain should have its own folder.

Example:

```txt
features/comments/
  components/
  pages/
  services/
  stores/
  types/
```

Use:

- `pages/` for route-level components
- `components/` for smaller UI pieces
- `services/` for external communication and use-case operations
- `stores/` for feature state
- `types/` for feature-specific types

---

## File Placement Rules

A file belongs in a feature when it only makes sense for that feature.

A file belongs in `shared/` when it is reusable and business-agnostic.

A file belongs in `core/` when it configures or supports the entire application.

When unsure, keep the file closer to the feature first. Move to `shared/` only after there is real reuse.

---

## Example Feature

```txt
features/comments/
  components/
    comment-card/
      comment-card.component.ts
      comment-card.component.html
      comment-card.component.css
    comments-list/
      comments-list.component.ts
      comments-list.component.html
      comments-list.component.css
  pages/
    comments-page/
      comments-page.component.ts
      comments-page.component.html
      comments-page.component.css
  services/
    comments.service.ts
  stores/
    comments.store.ts
  types/
    comment.type.ts
```

---

## Architecture Rules

- Keep features independent when possible.
- Avoid circular dependencies.
- Avoid importing from one feature into another unless there is a clear relationship.
- Prefer shared abstractions only after repeated use.
- Do not create generic abstractions before they are needed.
- Keep domain logic out of components when it starts to grow.
- Keep UI state close to the component unless it must be shared.
