import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ScriptsService } from '../scripts.service';
import { ScriptsListPageComponent } from './scripts-list-page.component';
import type { ScriptListItem } from '../../shared/models/view-models';

function makeScriptItem(id: string, title: string, commentCount: number): ScriptListItem {
  return {
    script: {
      id,
      userId: 'user-1',
      title,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    commentCount,
  };
}

function textContent(element: Element): string {
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('ScriptsListPageComponent', () => {
  let fixture: ComponentFixture<ScriptsListPageComponent>;
  let scriptsService: Pick<
    ScriptsService,
    'loading' | 'error' | 'loadScripts' | 'deleteScript'
  > & {
    loadScripts: jasmine.Spy;
    deleteScript: jasmine.Spy;
  };

  beforeEach(async () => {
    scriptsService = {
      loading: signal(false).asReadonly(),
      error: signal<string | null>(null).asReadonly(),
      loadScripts: jasmine.createSpy('loadScripts').and.resolveTo([
        makeScriptItem('script-1', 'Roteiro um', 2),
        makeScriptItem('script-2', 'Roteiro dois', 1),
      ]),
      deleteScript: jasmine.createSpy('deleteScript').and.resolveTo(),
    };

    await TestBed.configureTestingModule({
      imports: [ScriptsListPageComponent],
      providers: [
        provideRouter([]),
        { provide: ScriptsService, useValue: scriptsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScriptsListPageComponent);
  });

  it('loads and renders scripts returned by the service', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const renderedText = textContent(compiled);

    expect(scriptsService.loadScripts).toHaveBeenCalled();
    expect(renderedText).toContain('Roteiro um');
    expect(renderedText).toContain('2 comentários');
    expect(renderedText).toContain('Roteiro dois');
    expect(renderedText).toContain('1 comentário');
  });

  it('renders the open action pointing to the script detail route', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const openLink = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => textContent(link) === 'Abrir',
    );

    expect(openLink?.getAttribute('href')).toBe('/scripts/script-1');
  });

  it('opens the custom delete modal and cancels without calling the service', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const deleteButton = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => textContent(button) === 'Deletar');
    deleteButton?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('[role="dialog"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Roteiro um');

    const cancelButton = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => textContent(button) === 'Cancelar');
    cancelButton?.click();
    fixture.detectChanges();

    expect(scriptsService.deleteScript).not.toHaveBeenCalled();
    expect(compiled.querySelector('[role="dialog"]')).toBeNull();
  });

  it('confirms deletion and removes the script from the local list', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const deleteButton = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => textContent(button) === 'Deletar');
    deleteButton?.click();
    fixture.detectChanges();

    const confirmButton = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => textContent(button) === 'Deletar roteiro');
    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(scriptsService.deleteScript).toHaveBeenCalledOnceWith('script-1');
    expect(compiled.textContent).not.toContain('Roteiro um');
    expect(compiled.textContent).toContain('Roteiro dois');
    expect(compiled.querySelector('[role="dialog"]')).toBeNull();
  });
});
