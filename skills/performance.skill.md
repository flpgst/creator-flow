# Performance Skill

Read this file when improving bundle size, rendering performance, list rendering, lazy loading, or query efficiency.

## Angular Performance Rules

- Use `ChangeDetectionStrategy.OnPush`.
- Use standalone lazy-loaded routes.
- Use `@for` with `track`.
- Avoid heavy functions in templates.
- Avoid unnecessary subscriptions.
- Use `computed` for derived state.
- Split large pages into smaller components.
- Use deferrable views when useful.
- Avoid loading large features in the initial bundle.

---

## List Rendering

Always use `track`.

```html
@for (comment of comments(); track comment.id) {
  <app-comment-card [comment]="comment" />
}
```

Avoid:

```html
@for (comment of comments(); track $index) {
  ...
}
```

Use `$index` only for static lists with no stable identifier.

---

## Lazy Loading

Prefer lazy-loaded route components.

```ts
{
  path: 'dashboard',
  loadComponent: () =>
    import('./features/dashboard/pages/dashboard-page/dashboard-page.component')
      .then((m) => m.DashboardPageComponent),
}
```

---

## Deferrable Views

Use `@defer` for non-critical or heavy UI sections.

```html
@defer {
  <app-heavy-chart />
} @placeholder {
  <app-loading-state />
}
```

Use when:

- The component is heavy.
- The content is below the fold.
- The content is not immediately needed.

Do not use `@defer` everywhere without a reason.

---

## Supabase Query Performance

Prefer explicit columns.

```ts
.select('id, title, created_at')
```

Avoid unnecessary:

```ts
.select('*')
```

Use pagination for large lists.

Use database indexes for frequent filters and sorting fields.

Examples of fields that often need indexes:

- `user_id`
- `created_at`
- `status`
- foreign keys
- fields used in search filters

---

## Async UI Performance

Every async screen should avoid unnecessary reloads.

Prefer:

- Cache feature state when appropriate.
- Reload only changed data when possible.
- Use optimistic updates carefully.
- Avoid calling the same query from multiple components.

---

## Template Performance

Avoid this:

```html
@for (item of getFilteredItems(); track item.id) {
  ...
}
```

Prefer:

```ts
readonly filteredItems = computed(() => {
  return this.items().filter((item) => item.active);
});
```

Then:

```html
@for (item of filteredItems(); track item.id) {
  ...
}
```

---

## Bundle Rules

- Keep feature dependencies inside feature boundaries.
- Avoid importing large libraries globally.
- Prefer native browser APIs when appropriate.
- Review heavy UI dependencies before adding them.
