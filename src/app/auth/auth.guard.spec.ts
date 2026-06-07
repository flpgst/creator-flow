import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('allows an authenticated user to activate the route', async () => {
    authService.getCurrentUser.and.resolveTo({ id: 'user-1' } as never);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/comments' } as never),
    );

    expect(result).toBeTrue();
  });

  it('redirects an anonymous user to login with the returnUrl', async () => {
    authService.getCurrentUser.and.resolveTo(null);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/comments' } as never),
    );
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fcomments');
  });
});
