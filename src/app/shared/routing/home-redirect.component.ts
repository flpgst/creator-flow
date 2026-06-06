import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-home-redirect',
  templateUrl: './home-redirect.component.html',
  styleUrl: './home-redirect.component.css',
})
export class HomeRedirectComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    void this.redirectBySession();
  }

  private async redirectBySession(): Promise<void> {
    await this.authService.waitForInitialSession();
    await this.router.navigateByUrl(
      this.authService.isAuthenticated() ? '/comments' : '/login',
    );
  }
}
