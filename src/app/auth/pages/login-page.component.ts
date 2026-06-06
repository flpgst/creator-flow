import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SessionStateService } from '../../shared/session/session-state.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  private readonly router = inject(Router);
  private readonly sessionState = inject(SessionStateService);

  continueDemo(): void {
    this.sessionState.signInDemo();
    void this.router.navigateByUrl('/comments');
  }
}
