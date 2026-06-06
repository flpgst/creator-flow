# Code Style Skill

Read this file when reviewing naming, formatting, file conventions, TypeScript quality, or general cleanup.

## Naming

### Files

Use kebab-case.

```txt
comment-card.component.ts
comments.service.ts
comments.store.ts
comment.type.ts
```

### Classes

Use PascalCase.

```ts
CommentsService
CommentsStore
CommentCardComponent
```

### Variables and Methods

Use camelCase.

```ts
selectedCommentId
findAllComments()
markAsFavorite()
```

### Types

Use clear names.

```ts
Comment
CreateCommentDto
UpdateCommentDto
CommentViewModel
```

---

## TypeScript Rules

- Avoid `any`.
- Prefer `unknown` when the type is truly unknown.
- Prefer precise union types.
- Avoid magic strings when a union type is clearer.
- Keep public APIs typed.
- Avoid returning raw untyped Supabase responses from services.

Example:

```ts
type CommentStatus = 'new' | 'favorite' | 'used';
```

Avoid:

```ts
type CommentStatus = string;
```

---

## Function Rules

- Use descriptive names.
- Keep functions small.
- Avoid hidden side effects.
- Return typed values.
- Prefer early returns for invalid states.

Example:

```ts
async findCommentById(id: string): Promise<Comment | null> {
  ...
}
```

Avoid:

```ts
async getData(id: any): Promise<any> {
  ...
}
```

---

## Component Style

- Use `readonly` for injected dependencies and immutable fields.
- Use `private readonly` for internal dependencies.
- Keep component APIs clear.
- Avoid large methods in components.
- Extract helpers when logic grows.

---

## Import Style

- Keep imports clean.
- Remove unused imports.
- Avoid barrel files if they create circular dependencies.
- Prefer direct imports when it improves clarity.

---

## Error Messages

User-facing error messages should be clear but not leak sensitive details.

Good:

```txt
Unable to load comments.
```

Avoid exposing raw database details in the UI.

Developer logs may include more detail if the project has a safe logging strategy.

---

## General Cleanup Checklist

Before finishing code cleanup:

- Remove unused code.
- Remove unused imports.
- Remove console logs unless intentionally needed.
- Replace `any` with specific types.
- Check file names.
- Check folder placement.
- Check formatting.
- Keep changes focused on the requested task.
