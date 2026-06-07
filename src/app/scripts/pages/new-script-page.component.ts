import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ScriptsService } from '../scripts.service';
import type { CommentListItem } from '../../shared/models/view-models';

@Component({
  selector: 'app-new-script-page',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './new-script-page.component.html',
  styleUrl: './new-script-page.component.css',
})
export class NewScriptPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly scriptsService = inject(ScriptsService);

  readonly title = signal('');
  readonly comments = signal<CommentListItem[]>([]);
  readonly loading = this.scriptsService.loading;
  readonly saving = this.scriptsService.saving;
  readonly error = this.scriptsService.error;
  readonly titleTouched = signal(false);
  readonly titleIsInvalid = computed(
    () => this.titleTouched() && this.title().trim().length === 0,
  );
  readonly canSave = computed(
    () => this.title().trim().length > 0 && !this.loading() && !this.saving(),
  );

  async ngOnInit(): Promise<void> {
    const selectedCommentIds = this.readSelectedCommentIds();

    try {
      this.comments.set(await this.scriptsService.loadSelectedComments(selectedCommentIds));
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  updateTitle(title: string): void {
    this.title.set(title);
  }

  markTitleTouched(): void {
    this.titleTouched.set(true);
  }

  moveComment(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    const comments = [...this.comments()];

    if (nextIndex < 0 || nextIndex >= comments.length) {
      return;
    }

    [comments[index], comments[nextIndex]] = [comments[nextIndex], comments[index]];
    this.comments.set(comments);
  }

  removeComment(commentId: string): void {
    this.comments.set(this.comments().filter((item) => item.comment.id !== commentId));
  }

  async saveScript(): Promise<void> {
    this.titleTouched.set(true);

    if (!this.canSave()) {
      return;
    }

    try {
      const script = await this.scriptsService.createScript(this.title(), this.comments());
      await this.router.navigate(['/scripts', script.id]);
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  trackByCommentId(_index: number, item: CommentListItem): string {
    return item.comment.id;
  }

  private readSelectedCommentIds(): string[] {
    const selectedCommentIds = window.history.state?.selectedCommentIds;

    if (!Array.isArray(selectedCommentIds)) {
      return [];
    }

    return selectedCommentIds.filter(
      (commentId): commentId is string => typeof commentId === 'string',
    );
  }
}
