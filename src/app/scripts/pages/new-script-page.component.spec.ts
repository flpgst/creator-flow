import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ScriptsService } from '../scripts.service';
import { NewScriptPageComponent } from './new-script-page.component';

describe('NewScriptPageComponent', () => {
  let fixture: ComponentFixture<NewScriptPageComponent>;
  let component: NewScriptPageComponent;
  let scriptsService: Pick<
    ScriptsService,
    'loading' | 'saving' | 'error' | 'loadSelectedComments' | 'createScript'
  > & {
    loadSelectedComments: jasmine.Spy;
    createScript: jasmine.Spy;
  };

  beforeEach(async () => {
    scriptsService = {
      loading: signal(false).asReadonly(),
      saving: signal(false).asReadonly(),
      error: signal<string | null>(null).asReadonly(),
      loadSelectedComments: jasmine.createSpy('loadSelectedComments').and.resolveTo([]),
      createScript: jasmine.createSpy('createScript'),
    };

    await TestBed.configureTestingModule({
      imports: [NewScriptPageComponent],
      providers: [
        provideRouter([]),
        { provide: ScriptsService, useValue: scriptsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewScriptPageComponent);
    component = fixture.componentInstance;
  });

  it('requires a non-empty title before saving a script', async () => {
    expect(component.canSave()).toBeFalse();

    component.updateTitle('   ');
    await component.saveScript();

    expect(component.titleTouched()).toBeTrue();
    expect(component.titleIsInvalid()).toBeTrue();
    expect(scriptsService.createScript).not.toHaveBeenCalled();

    component.updateTitle('Roteiro da semana');

    expect(component.titleIsInvalid()).toBeFalse();
    expect(component.canSave()).toBeTrue();
  });
});
