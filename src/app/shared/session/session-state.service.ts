import { Injectable, signal } from '@angular/core';

const DEMO_SESSION_KEY = 'creator-flow.demo-session';

@Injectable({
  providedIn: 'root',
})
export class SessionStateService {
  private readonly authenticated = signal(
    globalThis.localStorage?.getItem(DEMO_SESSION_KEY) === 'authenticated',
  );

  readonly isAuthenticated = this.authenticated.asReadonly();

  signInDemo(): void {
    globalThis.localStorage?.setItem(DEMO_SESSION_KEY, 'authenticated');
    this.authenticated.set(true);
  }

  signOutDemo(): void {
    globalThis.localStorage?.removeItem(DEMO_SESSION_KEY);
    this.authenticated.set(false);
  }
}
