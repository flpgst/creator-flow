import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../auth.service';

type LoginMode = 'sign-in' | 'sign-up';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly mode = signal<LoginMode>('sign-in');
  readonly loading = this.authService.loading;
  readonly authError = this.authService.error;
  readonly submitLabel = computed(() =>
    this.mode() === 'sign-in' ? 'Entrar' : 'Criar conta',
  );
  readonly secondaryActionLabel = computed(() =>
    this.mode() === 'sign-in' ? 'Criar uma conta' : 'Ja tenho conta',
  );

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    await this.authService.waitForInitialSession();

    if (this.authService.isAuthenticated()) {
      await this.router.navigateByUrl('/comments');
    }
  }

  toggleMode(): void {
    this.mode.update((mode) => (mode === 'sign-in' ? 'sign-up' : 'sign-in'));
    this.authService.clearError();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const credentials = this.form.getRawValue();

    try {
      if (this.mode() === 'sign-in') {
        await this.authService.signInWithPassword(credentials);
      } else {
        await this.authService.signUpWithPassword(credentials);
      }

      await this.router.navigateByUrl(this.getReturnUrl());
    } catch {
      this.form.controls.password.reset();
    }
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return '/comments';
    }

    return returnUrl;
  }
}
