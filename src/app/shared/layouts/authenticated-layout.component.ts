import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-authenticated-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.css',
})
export class AuthenticatedLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.authService.user;
  readonly loading = this.authService.loading;
  readonly authError = this.authService.error;

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      await this.router.navigateByUrl('/login');
    } catch {
      // Error state is exposed by AuthService for the template.
    }
  }
}
