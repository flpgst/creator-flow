# Angular Templates Skill

Read this file when editing HTML templates, lists, conditionals, empty states, loading states, or view logic.

## Main Principle

Use Angular modern control flow.

For new code, prefer:

- `@if`
- `@for`
- `@switch`
- `@empty`

Avoid legacy syntax:

- `*ngIf`
- `*ngFor`
- `[ngSwitch]`

---

## Conditional Rendering

Use `@if`.

```html
@if (isLoading()) {
  <app-loading-state />
} @else if (error()) {
  <app-error-state [message]="error()" />
} @else {
  <app-content />
}
```

Avoid:

```html
<div *ngIf="isLoading"></div>
```

---

## Lists

Use `@for` and always provide `track`.

```html
@for (comment of comments(); track comment.id) {
  <app-comment-card [comment]="comment" />
} @empty {
  <app-empty-state message="No comments found." />
}
```

Rules:

- Always use `track`.
- Prefer stable unique IDs.
- Use `@empty` for empty lists.
- Avoid using `$index` as track unless there is no stable ID and the list is static.

---

## Switches

Use `@switch`.

```html
@switch (status()) {
  @case ('loading') {
    <app-loading-state />
  }
  @case ('error') {
    <app-error-state message="Something went wrong." />
  }
  @default {
    <app-content />
  }
}
```

---

## Template Logic

Templates should be simple.

Avoid:

```html
@if (comments().filter(comment => comment.isFavorite).length > 0) {
  ...
}
```

Prefer a computed value in TypeScript:

```ts
readonly favoriteComments = computed(() =>
  this.comments().filter((comment) => comment.isFavorite)
);
```

Then use:

```html
@if (favoriteComments().length > 0) {
  ...
}
```

---

## Signals in Templates

When using signals, call them in templates:

```html
<p>{{ userName() }}</p>
```

For input signals:

```html
<h3>{{ comment().authorName }}</h3>
```

---

## Loading, Error, and Empty States

Every async screen should handle:

- Loading
- Error
- Empty
- Success

Example:

```html
@if (loading()) {
  <app-loading-state />
} @else if (error()) {
  <app-error-state [message]="error()" />
} @else {
  @for (item of items(); track item.id) {
    <app-item-card [item]="item" />
  } @empty {
    <app-empty-state message="No items found." />
  }
}
```

---

## Template Rules

- Avoid heavy function calls.
- Avoid complex expressions.
- Avoid nested conditionals when extracting a component would be clearer.
- Keep accessibility in mind.
- Use semantic HTML when possible.
- Bind only what the component needs.
