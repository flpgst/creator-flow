import { Routes } from '@angular/router';

import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./public/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./public/pages/privacy-page/privacy-page.component').then(
        (m) => m.PrivacyPageComponent,
      ),
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./public/pages/terms-page/terms-page.component').then(
        (m) => m.TermsPageComponent,
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
        path: 'scripts',
        loadComponent: () =>
          import('./scripts/pages/scripts-list-page.component').then(
            (m) => m.ScriptsListPageComponent,
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
