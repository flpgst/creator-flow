# Angular State Skill

Read this file when managing state with Signals, stores, computed values, loading states, or feature state.

## Main Principle

Use the smallest state scope possible.

- Component-only state belongs in the component.
- Feature state belongs in a feature store.
- App-wide state belongs in `core`.

Do not create global state unless the state is truly shared across multiple features.

---

## Local State

Use `signal` for local UI state.

```ts
readonly isOpen = signal(false);
readonly selectedId = signal<string | null>(null);
```

---

## Derived State

Use `computed` for values derived from other signals.

```ts
readonly favoriteComments = computed(() =>
  this.comments().filter((comment) => comment.isFavorite)
);
```

Do not store derived values manually unless there is a clear reason.

---

## Feature Store

Use a small injectable store for feature state.

```ts
import { computed, Injectable, signal } from '@angular/core';
import { Comment } from '../types/comment.type';

@Injectable({
  providedIn: 'root',
})
export class CommentsStore {
  private readonly commentsState = signal<Comment[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly comments = this.commentsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly totalComments = computed(() => this.commentsState().length);

  setComments(comments: Comment[]): void {
    this.commentsState.set(comments);
  }

  setLoading(loading: boolean): void {
    this.loadingState.set(loading);
  }

  setError(error: string | null): void {
    this.errorState.set(error);
  }

  reset(): void {
    this.commentsState.set([]);
    this.loadingState.set(false);
    this.errorState.set(null);
  }
}
```

---

## Store Rules

- Do not expose writable signals directly.
- Expose readonly signals.
- Keep mutations explicit.
- Keep stores focused on one feature.
- Do not put Supabase query code inside stores unless the project intentionally uses that pattern.
- Prefer services for external calls and stores for state.
- Avoid stores becoming giant application services.

---

## Loading and Error State

Async UI operations should expose loading and error states.

```ts
async loadComments(): Promise<void> {
  this.store.setLoading(true);
  this.store.setError(null);

  try {
    const comments = await this.service.findAll();
    this.store.setComments(comments);
  } catch {
    this.store.setError('Unable to load comments.');
  } finally {
    this.store.setLoading(false);
  }
}
```

---

## When to Use RxJS

Use RxJS when the flow is naturally stream-based:

- Debounced searches
- Realtime updates
- WebSocket events
- Combining multiple async sources
- Cancellation
- Form value changes

For simple one-shot Supabase calls, `async/await` is usually enough.

---

## Effects

Use `effect` carefully.

Good uses:

- Syncing a signal with local storage
- Logging development state
- Triggering a clearly defined side effect

Avoid effects for complex data loading chains when explicit methods are clearer.

---

## State Rules

- Keep state minimal.
- Keep state close to where it is used.
- Use `computed` instead of manually syncing derived state.
- Reset feature state when needed.
- Avoid global mutable singleton state for screen-specific behavior.
