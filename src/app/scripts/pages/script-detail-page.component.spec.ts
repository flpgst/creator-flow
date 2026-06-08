import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ScriptsService } from '../scripts.service';
import { ScriptDetailPageComponent } from './script-detail-page.component';
import type {
  ScriptCommentItem,
  ScriptDetailViewModel,
} from '../../shared/models/view-models';

function makeComment(
  id: string,
  text: string,
  isAnswered: boolean,
): ScriptCommentItem {
  return {
    id,
    commentId: `comment-${id}`,
    text,
    videoTitle: 'Video A',
    videoUrl: 'https://www.youtube.com/watch?v=yt-video-a',
    position: 0,
    isAnswered,
  };
}

function makeDetail(comments: ScriptCommentItem[]): ScriptDetailViewModel {
  return {
    script: {
      id: 'script-1',
      userId: 'user-1',
      title: 'Roteiro de teste',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
    comments,
  };
}

function textContent(element: Element): string {
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('ScriptDetailPageComponent', () => {
  let fixture: ComponentFixture<ScriptDetailPageComponent>;
  let savingState: ReturnType<typeof signal<boolean>>;
  let scriptsService: Pick<
    ScriptsService,
    'loading' | 'saving' | 'error' | 'loadScript' | 'updateScriptComments' | 'setScriptCommentAnswered'
  > & {
    loadScript: jasmine.Spy;
    updateScriptComments: jasmine.Spy;
    setScriptCommentAnswered: jasmine.Spy;
  };

  async function createComponent(comments: ScriptCommentItem[]): Promise<void> {
    savingState = signal(false);
    scriptsService = {
      loading: signal(false).asReadonly(),
      saving: savingState.asReadonly(),
      error: signal<string | null>(null).asReadonly(),
      loadScript: jasmine.createSpy('loadScript').and.resolveTo(makeDetail(comments)),
      updateScriptComments: jasmine.createSpy('updateScriptComments').and.resolveTo(comments),
      setScriptCommentAnswered: jasmine
        .createSpy('setScriptCommentAnswered')
        .and.resolveTo(),
    };

    await TestBed.configureTestingModule({
      imports: [ScriptDetailPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'script-1' }),
            },
          },
        },
        { provide: ScriptsService, useValue: scriptsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScriptDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders an answered status button for each comment', async () => {
    await createComponent([
      makeComment('script-comment-1', 'Comentario pendente', false),
      makeComment('script-comment-2', 'Comentario respondido', true),
    ]);

    const compiled = fixture.nativeElement as HTMLElement;
    const answeredButtons = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.answered-button'),
    );

    expect(answeredButtons.length).toBe(2);
    expect(textContent(answeredButtons[0])).toBe('Marcar respondido');
    expect(textContent(answeredButtons[1])).toBe('Marcar não respondido');
  });

  it('applies the answered class to answered comments', async () => {
    await createComponent([
      makeComment('script-comment-1', 'Comentario pendente', false),
      makeComment('script-comment-2', 'Comentario respondido', true),
    ]);

    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.comment-row'),
    );

    expect(rows[0].classList.contains('is-answered')).toBeFalse();
    expect(rows[1].classList.contains('is-answered')).toBeTrue();
  });

  it('toggles an answered comment back to not answered without marking unsaved changes', async () => {
    await createComponent([makeComment('script-comment-1', 'Comentario respondido', true)]);

    const compiled = fixture.nativeElement as HTMLElement;
    const answeredButton = compiled.querySelector<HTMLButtonElement>('.answered-button');
    answeredButton?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const row = compiled.querySelector<HTMLElement>('.comment-row');

    expect(scriptsService.setScriptCommentAnswered).toHaveBeenCalledOnceWith(
      'script-comment-1',
      false,
    );
    expect(row?.classList.contains('is-answered')).toBeFalse();
    expect(textContent(answeredButton as HTMLButtonElement)).toBe('Marcar respondido');
    expect(compiled.textContent).not.toContain('Alterações não salvas');
  });

  it('rolls back the visual answered state when saving the toggle fails', async () => {
    await createComponent([makeComment('script-comment-1', 'Comentario pendente', false)]);
    scriptsService.setScriptCommentAnswered.and.rejectWith(new Error('Falha ao salvar'));

    const compiled = fixture.nativeElement as HTMLElement;
    const answeredButton = compiled.querySelector<HTMLButtonElement>('.answered-button');
    answeredButton?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.comment-row')?.classList.contains('is-answered')).toBeTrue();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(scriptsService.setScriptCommentAnswered).toHaveBeenCalledOnceWith(
      'script-comment-1',
      true,
    );
    expect(compiled.querySelector('.comment-row')?.classList.contains('is-answered')).toBeFalse();
    expect(textContent(answeredButton as HTMLButtonElement)).toBe('Marcar respondido');
  });
});
