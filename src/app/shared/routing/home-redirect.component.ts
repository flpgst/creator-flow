import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SessionStateService } from '../session/session-state.service';

@Component({
  selector: 'app-home-redirect',
  templateUrl: './home-redirect.component.html',
  styleUrl: './home-redirect.component.css',
})
export class HomeRedirectComponent {
  private readonly router = inject(Router);
  private readonly sessionState = inject(SessionStateService);

  constructor() {
    void this.router.navigateByUrl(
      this.sessionState.isAuthenticated() ? '/comments' : '/login',
    );
  }
}
