# Routing Skill

Read this file when creating routes, lazy-loaded pages, guards, redirects, or route-level structure.

## Main Principle

Use standalone routing and lazy-loaded route components.

---

## App Routes

Example:

```ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'comments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/comments/pages/comments-page/comments-page.component')
        .then((m) => m.CommentsPageComponent),
  },
  {
    path: 'scripts',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/scripts/pages/scripts-page/scripts-page.component')
        .then((m) => m.ScriptsPageComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'comments',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found-page/not-found-page.component')
        .then((m) => m.NotFoundPageComponent),
  },
];
```

---

## Route Rules

- Use `loadComponent` for standalone page components.
- Use lazy loading for feature pages.
- Use guards for protected pages.
- Keep route definitions simple.
- Use redirects for default paths.
- Add a not-found route when appropriate.

---

## Feature Routes

For larger features, use feature route files.

```txt
features/comments/comments.routes.ts
```

Example:

```ts
import { Routes } from '@angular/router';

export const commentsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/comments-page/comments-page.component')
        .then((m) => m.CommentsPageComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/comment-detail-page/comment-detail-page.component')
        .then((m) => m.CommentDetailPageComponent),
  },
];
```

Then in app routes:

```ts
{
  path: 'comments',
  loadChildren: () =>
    import('./features/comments/comments.routes')
      .then((m) => m.commentsRoutes),
}
```

---

## Route Parameters

Read route params in page components, not presentational components.

Keep route parsing close to route-level components.

---

## Guards

Prefer functional guards.

Use guards for:

- Authentication
- Authorization
- Unsaved changes
- Feature access

Do not rely only on guards for real data security. Supabase RLS must enforce access.
