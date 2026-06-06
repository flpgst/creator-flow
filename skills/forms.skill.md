# Forms Skill

Read this file when creating or editing forms, validations, submit flows, or Reactive Forms.

## Main Principle

Use Reactive Forms for application forms.

---

## Basic Form

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './comment-form.component.html',
  styleUrl: './comment-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentFormComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    content: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    // Emit or send payload through a service depending on component responsibility.
  }
}
```

---

## Template

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <label for="title">Title</label>
  <input id="title" type="text" formControlName="title" />

  @if (form.controls.title.touched && form.controls.title.hasError('required')) {
    <p>Title is required.</p>
  }

  <label for="content">Content</label>
  <textarea id="content" formControlName="content"></textarea>

  @if (form.controls.content.touched && form.controls.content.hasError('required')) {
    <p>Content is required.</p>
  }

  <button type="submit" [disabled]="form.invalid">
    Save
  </button>
</form>
```

---

## Form Rules

- Use `ReactiveFormsModule`.
- Use `nonNullable` when possible.
- Validate on the frontend for UX.
- Validate on the backend/database for security.
- Mark fields as touched before showing validation errors.
- Do not submit invalid forms.
- Do not send entire form objects to services.
- Send explicit payloads.

---

## Submit Flow

For async submits:

```ts
readonly saving = signal(false);
readonly error = signal<string | null>(null);

async submit(): Promise<void> {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.saving.set(true);
  this.error.set(null);

  try {
    const payload = this.form.getRawValue();
    await this.commentsService.create(payload);
    this.form.reset();
  } catch {
    this.error.set('Unable to save the comment.');
  } finally {
    this.saving.set(false);
  }
}
```

---

## Search Forms

For search inputs, use debounce.

```ts
this.searchControl.valueChanges
  .pipe(
    debounceTime(300),
    distinctUntilChanged(),
    takeUntilDestroyed()
  )
  .subscribe((term) => {
    void this.search(term);
  });
```

Use RxJS for this because it is a stream-based interaction.

---

## Form Component Boundaries

A form component may be:

### Presentational

- Receives initial value
- Emits submit payload
- Does not call Supabase directly

### Smart/Page-level

- Calls a service
- Handles saving/loading/error
- Coordinates navigation

Prefer presentational forms when reuse is likely.
