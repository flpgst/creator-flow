# Authentication and Security Skill

Read this file when working with login, logout, guards, user sessions, RLS, permissions, authorization, or secrets.

## Main Principle

Frontend authentication improves UX. Real authorization must be enforced by Supabase Row Level Security and backend-side rules.

Never trust frontend-only checks for protecting data.

---

## Auth Structure

Recommended location:

```txt
src/app/core/auth/
  auth.service.ts
  auth.store.ts
  auth.guard.ts
```

---

## Auth Service

Keep Supabase auth operations centralized.

```ts
import { Injectable, inject } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabaseService = inject(SupabaseService);

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await this.supabaseService.client.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabaseService.client.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }
}
```

---

## Auth Guard

Prefer functional guards for new code.

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await authService.getCurrentUser();

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  return true;
};
```

---

## Row Level Security

For every table exposed to the frontend:

- Enable RLS.
- Create explicit policies.
- Test policies with authenticated and unauthenticated users.
- Do not assume hidden UI means protected data.
- Do not rely only on frontend filtering.

Example concept:

```sql
alter table comments enable row level security;
```

Policies should match the application rules.

---

## Secrets

Never expose these in Angular:

- Supabase service role key
- Private API keys
- OAuth provider secrets
- Database passwords
- Admin tokens
- Webhook signing secrets

Use Supabase Edge Functions for operations requiring secrets.

---

## Authorization Rules

The frontend may:

- Show or hide UI elements.
- Redirect unauthenticated users.
- Display permission-based states.
- Improve UX.

The backend/database must:

- Enforce who can read data.
- Enforce who can insert data.
- Enforce who can update data.
- Enforce who can delete data.
- Enforce ownership rules.

---

## User ID

Do not blindly trust a user ID sent from the frontend.

Prefer deriving user identity from the authenticated Supabase session and RLS policies.

---

## Security Checklist

Before completing auth/security work, verify:

- RLS is enabled for exposed tables.
- Policies match the intended permissions.
- No private key is present in Angular.
- Guards exist for protected routes.
- Unauthorized users cannot access data directly.
- Sensitive operations run through Edge Functions or database policies.
- Error messages do not leak sensitive information.
