# AGENTS.md

## Project Context

This is a modern Angular application using Supabase as the backend/API layer.

Supabase may be used for:

- Authentication
- PostgreSQL database access
- Storage
- Realtime updates
- Edge Functions for sensitive or server-side logic

The Angular codebase should follow modern community standards:

- Standalone components
- Standalone routing
- Modern template control flow: `@if`, `@for`, `@switch`
- Signals for local and feature state
- Lazy loading by route
- Strong TypeScript typing
- Feature-based architecture
- Supabase security through Row Level Security policies

Avoid legacy Angular patterns.

---

## How to Use These Instructions

This file is intentionally short.

Before changing code, read only the skill files relevant to the task.

For example:

- Working on project structure? Read `skills/architecture.skill.md`
- Creating Angular components? Read `skills/angular-components.skill.md`
- Editing templates? Read `skills/angular-templates.skill.md`
- Working with Signals/state? Read `skills/angular-state.skill.md`
- Calling Supabase? Read `skills/supabase.skill.md`
- Working on auth/security? Read `skills/auth-security.skill.md`
- Creating routes? Read `skills/routing.skill.md`
- Creating forms? Read `skills/forms.skill.md`
- Improving performance? Read `skills/performance.skill.md`
- Writing tests? Read `skills/testing.skill.md`
- Reviewing code style? Read `skills/code-style.skill.md`

---

## Skill Index

### Architecture

Read when creating folders, moving files, defining boundaries, or adding new features.

`skills/architecture.skill.md`

### Angular Components

Read when creating or modifying Angular components, pages, presentational components, inputs, outputs, or lifecycle logic.

`skills/angular-components.skill.md`

### Angular Templates

Read when editing HTML templates, lists, conditionals, empty states, loading states, or view logic.

`skills/angular-templates.skill.md`

### Project Design Instructions

Read when creating or changing UI components.

`skills/layout-design.skill.md`

### Angular State

Read when managing state with Signals, stores, computed values, loading states, or feature state.

`skills/angular-state.skill.md`

### Supabase

Read when querying, inserting, updating, deleting, paginating, using Storage, Realtime, or Edge Functions.

`skills/supabase.skill.md`

### Authentication and Security

Read when working with login, logout, guards, user sessions, RLS, permissions, authorization, or secrets.

`skills/auth-security.skill.md`

### Routing

Read when creating routes, lazy-loaded pages, guards, redirects, or route-level structure.

`skills/routing.skill.md`

### Forms

Read when creating or editing forms, validations, submit flows, or Reactive Forms.

`skills/forms.skill.md`

### Performance

Read when improving bundle size, rendering performance, list rendering, lazy loading, or query efficiency.

`skills/performance.skill.md`

### Testing

Read when writing or updating tests for services, stores, components, guards, or utility functions.

`skills/testing.skill.md`

### Code Style

Read when reviewing naming, formatting, file conventions, TypeScript quality, or general cleanup.

`skills/code-style.skill.md`

---

## Global Rules

These rules always apply.

1. Prefer modern Angular APIs.
2. Prefer standalone components and standalone routing.
3. Use `@if`, `@for`, and `@switch` instead of `*ngIf`, `*ngFor`, and `ngSwitch` for new code.
4. Always use `track` in `@for`.
5. Prefer Signals for local and feature state.
6. Use RxJS when streams, cancellation, debouncing, or realtime flows are a better fit.
7. Do not expose Supabase service role keys in the frontend.
8. Do not rely on frontend checks for real authorization.
9. Handle Supabase errors explicitly.
10. Avoid `any` unless there is a clear and documented reason.
11. Keep components small and focused.
12. Keep sensitive logic in Supabase policies or Edge Functions.
13. Preserve existing project conventions when they are reasonable.
14. Do not introduce unnecessary abstraction.
15. Write production-ready code, not throwaway examples.

---

## UI Global Rules

- Prefer layouts with top navigation, sidebar, content grid and creator-dashboard patterns.
- Use red only for primary actions, active states and important video-related controls.
- Use cards, filter chips, comment cards and badges according to `docs/DESIGN.md`.
- Do not copy YouTube branding directly or use official YouTube logos unless explicitly required and compliant with brand guidelines.

---

## Default Task Checklist

Before finishing a task, verify:

- The code compiles.
- The component is standalone when applicable.
- New templates use modern control flow.
- Every `@for` has a `track`.
- Supabase calls handle `error`.
- No secret is exposed in frontend code.
- Types are clear and specific.
- Loading and error states exist for async UI operations.
- Files are placed in the correct feature folder.
- The solution is simple, maintainable, and testable.
