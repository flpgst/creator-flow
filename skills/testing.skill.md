# Testing Skill

Read this file when writing or updating tests for services, stores, components, guards, or utility functions.

## Main Principle

Test behavior, not implementation details.

Prioritize tests for:

- Services
- Stores
- Guards
- Utility functions
- Components with meaningful logic
- Critical user flows

---

## Store Test Example

```ts
import { CommentsStore } from './comments.store';
import { Comment } from '../types/comment.type';

describe('CommentsStore', () => {
  it('should calculate total comments', () => {
    const store = new CommentsStore();

    store.setComments([
      { id: '1', content: 'First' },
      { id: '2', content: 'Second' },
    ] as Comment[]);

    expect(store.totalComments()).toBe(2);
  });
});
```

---

## Service Tests

Mock Supabase instead of calling the real network.

Test:

- Successful response
- Error response
- Payload shape
- Query behavior when relevant

Do not depend on a real Supabase project in unit tests.

---

## Component Tests

Test visible behavior.

Examples:

- Loading state is shown.
- Empty state is shown.
- Error state is shown.
- Event is emitted after button click.
- Submit is blocked when form is invalid.

Avoid testing internal private methods directly.

---

## Guard Tests

Test:

- Authenticated user can access.
- Unauthenticated user is redirected.
- Guard does not expose protected pages.

Remember that guards are not a replacement for Supabase RLS.

---

## Test Rules

- Keep tests clear.
- Use meaningful test names.
- Avoid brittle tests tied to implementation details.
- Mock external services.
- Avoid real network calls.
- Use typed test data builders when repeated setup grows.
