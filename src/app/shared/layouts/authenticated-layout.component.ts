import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SessionStateService } from '../session/session-state.service';

@Component({
  selector: 'app-authenticated-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.css',
})
export class AuthenticatedLayoutComponent {
  private readonly router = inject(Router);
  private readonly sessionState = inject(SessionStateService);

  signOut(): void {
    this.sessionState.signOutDemo();
    void this.router.navigateByUrl('/login');
  }
}
