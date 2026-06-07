import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { AuthenticatedLayoutComponent } from './authenticated-layout.component';

describe('AuthenticatedLayoutComponent', () => {
  let fixture: ComponentFixture<AuthenticatedLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthenticatedLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 'user-1', email: 'user@test.local' }).asReadonly(),
            loading: signal(false).asReadonly(),
            error: signal<string | null>(null).asReadonly(),
            signOut: jasmine.createSpy('signOut').and.resolveTo(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthenticatedLayoutComponent);
  });

  it('shows scripts in the main menu without the direct new script link', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navText = compiled.querySelector('nav')?.textContent ?? '';
    const scriptsLink = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('nav a'))
      .find((link) => link.textContent?.trim() === 'Roteiros');

    expect(navText).toContain('Roteiros');
    expect(navText).not.toContain('Novo roteiro');
    expect(scriptsLink?.getAttribute('href')).toBe('/scripts');
  });
});
