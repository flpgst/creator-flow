import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./shared/routing/home-redirect.component').then(
        (m) => m.HomeRedirectComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/pages/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/layouts/authenticated-layout.component').then(
        (m) => m.AuthenticatedLayoutComponent,
      ),
    children: [
      {
        path: 'connect-youtube',
        loadComponent: () =>
          import('./youtube/pages/connect-youtube-page.component').then(
            (m) => m.ConnectYoutubePageComponent,
          ),
      },
      {
        path: 'comments',
        loadComponent: () =>
          import('./comments/pages/comments-page.component').then(
            (m) => m.CommentsPageComponent,
          ),
      },
      {
        path: 'scripts/new',
        loadComponent: () =>
          import('./scripts/pages/new-script-page.component').then(
            (m) => m.NewScriptPageComponent,
          ),
      },
      {
        path: 'scripts/:id',
        loadComponent: () =>
          import('./scripts/pages/script-detail-page.component').then(
            (m) => m.ScriptDetailPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
