import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ScriptsService } from '../scripts.service';
import type {
  ScriptCommentItem,
  ScriptDetailViewModel,
} from '../../shared/models/view-models';

@Component({
  selector: 'app-script-detail-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './script-detail-page.component.html',
  styleUrl: './script-detail-page.component.css',
})
export class ScriptDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly scriptsService = inject(ScriptsService);

  readonly scriptId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly script = signal<ScriptDetailViewModel['script'] | null>(null);
  readonly comments = signal<ScriptCommentItem[]>([]);
  readonly loading = this.scriptsService.loading;
  readonly saving = this.scriptsService.saving;
  readonly error = this.scriptsService.error;
  readonly notFound = signal(false);
  readonly hasChanges = signal(false);
  readonly canSave = computed(
    () => this.hasChanges() && !this.loading() && !this.saving() && !this.notFound(),
  );

  async ngOnInit(): Promise<void> {
    try {
      const detail = await this.scriptsService.loadScript(this.scriptId);

      if (!detail) {
        this.notFound.set(true);
        return;
      }

      this.script.set(detail.script);
      this.comments.set(detail.comments);
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  moveComment(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    const comments = [...this.comments()];

    if (nextIndex < 0 || nextIndex >= comments.length) {
      return;
    }

    [comments[index], comments[nextIndex]] = [comments[nextIndex], comments[index]];
    this.comments.set(this.withNormalizedPositions(comments));
    this.hasChanges.set(true);
  }

  removeComment(commentId: string): void {
    this.comments.set(
      this.withNormalizedPositions(
        this.comments().filter((comment) => comment.commentId !== commentId),
      ),
    );
    this.hasChanges.set(true);
  }

  async saveChanges(): Promise<void> {
    if (!this.canSave()) {
      return;
    }

    try {
      const comments = await this.scriptsService.updateScriptComments(
        this.scriptId,
        this.comments(),
      );
      this.comments.set(comments);
      this.hasChanges.set(false);
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  trackByScriptCommentId(_index: number, item: ScriptCommentItem): string {
    return item.id;
  }

  private withNormalizedPositions(comments: ScriptCommentItem[]): ScriptCommentItem[] {
    return comments.map((comment, position) => ({
      ...comment,
      position,
    }));
  }
}
