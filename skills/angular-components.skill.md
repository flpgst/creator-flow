# Angular Components Skill

Read this file when creating or modifying Angular components, pages, presentational components, inputs, outputs, or lifecycle logic.

## Main Principle

Use standalone, small, focused components.

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent {}
```

---

## Required Defaults

For new components:

- Use `standalone: true`.
- Use `ChangeDetectionStrategy.OnPush`.
- Prefer `input()` and `output()` APIs.
- Keep logic simple.
- Avoid manual subscriptions when possible.
- Avoid large components that handle too many responsibilities.

---

## Presentational Components

Presentational components should receive data and emit events.

```ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Comment } from '../../types/comment.type';

@Component({
  selector: 'app-comment-card',
  standalone: true,
  templateUrl: './comment-card.component.html',
  styleUrl: './comment-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentCardComponent {
  readonly comment = input.required<Comment>();
  readonly favoriteClicked = output<string>();

  onFavoriteClick(): void {
    this.favoriteClicked.emit(this.comment().id);
  }
}
```

---

## Page Components

Page components may orchestrate loading, stores, services, and route-level behavior.

```ts
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { CommentsListComponent } from '../../components/comments-list/comments-list.component';
import { CommentsService } from '../../services/comments.service';
import { CommentsStore } from '../../stores/comments.store';

@Component({
  selector: 'app-comments-page',
  standalone: true,
  imports: [CommentsListComponent],
  templateUrl: './comments-page.component.html',
  styleUrl: './comments-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsPageComponent implements OnInit {
  private readonly commentsService = inject(CommentsService);
  readonly commentsStore = inject(CommentsStore);

  async ngOnInit(): Promise<void> {
    await this.loadComments();
  }

  async loadComments(): Promise<void> {
    this.commentsStore.setLoading(true);
    this.commentsStore.setError(null);

    try {
      const comments = await this.commentsService.findAll();
      this.commentsStore.setComments(comments);
    } catch {
      this.commentsStore.setError('Unable to load comments.');
    } finally {
      this.commentsStore.setLoading(false);
    }
  }
}
```

---

## Dependency Injection

Prefer `inject()` for new code when it improves readability.

```ts
private readonly commentsService = inject(CommentsService);
```

Constructor injection is acceptable when the existing file already uses it consistently.

---

## Component Rules

- Do not put complex business logic inside templates.
- Do not put Supabase queries directly in presentational components.
- Do not mutate inputs.
- Do not expose mutable state unnecessarily.
- Prefer explicit method names.
- Prefer small components over deeply nested conditional templates.
- Keep component APIs clear and typed.

---

## Lifecycle Rules

- Use lifecycle hooks only when needed.
- Use `ngOnInit` for initial loading when appropriate.
- Clean up manual subscriptions with `takeUntilDestroyed`.
- Avoid `ngOnChanges` when a `computed` signal can express the same behavior more clearly.
