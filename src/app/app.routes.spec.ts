import { Type } from '@angular/core';

import { routes } from './app.routes';
import { ScriptsListPageComponent } from './scripts/pages/scripts-list-page.component';

describe('app routes', () => {
  it('loads the scripts list at /scripts before script detail routes', async () => {
    const authenticatedRoute = routes.find((route) => route.children);
    const scriptsIndex = authenticatedRoute?.children?.findIndex(
      (route) => route.path === 'scripts',
    );
    const scriptDetailIndex = authenticatedRoute?.children?.findIndex(
      (route) => route.path === 'scripts/:id',
    );
    const scriptsRoute = authenticatedRoute?.children?.[scriptsIndex ?? -1];
    const loadedComponent = (await scriptsRoute?.loadComponent?.()) as Type<unknown>;

    expect(scriptsIndex).toBeGreaterThanOrEqual(0);
    expect(scriptDetailIndex).toBeGreaterThanOrEqual(0);
    expect(scriptsIndex).toBeLessThan(scriptDetailIndex ?? Number.MAX_SAFE_INTEGER);
    expect(loadedComponent).toBe(ScriptsListPageComponent);
  });
});
