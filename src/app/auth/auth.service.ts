import { computed, Injectable, inject, signal } from '@angular/core';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { SupabaseService } from '../shared/services/supabase.service';

type AuthCredentials = {
  email: string;
  password: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly sessionState = signal<Session | null>(null);
  private readonly initializedState = signal(false);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private initialSessionPromise: Promise<Session | null> | null = null;

  readonly session = this.sessionState.asReadonly();
  readonly initialized = this.initializedState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  constructor() {
    this.listenForAuthChanges();
    void this.loadInitialSession();
  }

  async waitForInitialSession(): Promise<Session | null> {
    return this.loadInitialSession();
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.loadInitialSession();

    if (!session) {
      return null;
    }

    const { data, error } = await this.supabaseService.client.auth.getUser();

    if (error) {
      this.sessionState.set(null);
      return null;
    }

    return data.user;
  }

  async signInWithPassword(credentials: AuthCredentials): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } =
        await this.supabaseService.client.auth.signInWithPassword(credentials);

      if (error) {
        throw new Error(error.message);
      }

      this.sessionState.set(data.session);
    } catch (error) {
      this.errorState.set(this.toAuthErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  async signUpWithPassword(credentials: AuthCredentials): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { data, error } =
        await this.supabaseService.client.auth.signUp(credentials);

      if (error) {
        throw new Error(error.message);
      }

      this.sessionState.set(data.session);
    } catch (error) {
      this.errorState.set(this.toAuthErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  async signOut(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const { error } = await this.supabaseService.client.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      this.sessionState.set(null);
    } catch (error) {
      this.errorState.set(this.toAuthErrorMessage(error));
      throw error;
    } finally {
      this.loadingState.set(false);
    }
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private loadInitialSession(): Promise<Session | null> {
    if (this.initialSessionPromise) {
      return this.initialSessionPromise;
    }

    this.loadingState.set(true);

    this.initialSessionPromise = this.supabaseService.client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          this.errorState.set(this.toAuthErrorMessage(error));
          this.sessionState.set(null);
          return null;
        }

        this.sessionState.set(data.session);
        return data.session;
      })
      .finally(() => {
        this.initializedState.set(true);
        this.loadingState.set(false);
      });

    return this.initialSessionPromise;
  }

  private listenForAuthChanges(): void {
    this.supabaseService.client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        this.sessionState.set(session);
        this.initializedState.set(true);
      },
    );
  }

  private toAuthErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Nao foi possivel concluir a autenticacao.';
  }
}
