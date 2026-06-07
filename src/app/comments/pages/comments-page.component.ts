import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CommentsService } from '../comments.service';
import type { CommentListItem } from '../../shared/models/view-models';

type CommentSortMode =
  | 'newest'
  | 'oldest'
  | 'mostLiked'
  | 'unusedFirst'
  | 'favoritesFirst'
  | 'video';

type SortOption = {
  value: CommentSortMode;
  label: string;
};

@Component({
  selector: 'app-comments-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './comments-page.component.html',
  styleUrl: './comments-page.component.css',
})
export class CommentsPageComponent implements OnInit {
  private readonly commentsService = inject(CommentsService);
  private readonly router = inject(Router);
  private readonly selectedCommentIds = signal<Set<string>>(new Set());

  readonly comments = this.commentsService.comments;
  readonly loading = this.commentsService.loading;
  readonly syncing = this.commentsService.syncing;
  readonly error = this.commentsService.error;
  readonly lastSyncJob = this.commentsService.lastSyncJob;
  readonly sortMode = signal<CommentSortMode>('newest');
  readonly sortOptions: SortOption[] = [
    {
      value: 'newest',
      label: 'Mais recentes',
    },
    {
      value: 'oldest',
      label: 'Mais antigos',
    },
    {
      value: 'mostLiked',
      label: 'Mais curtidos',
    },
    {
      value: 'unusedFirst',
      label: 'Nao usados primeiro',
    },
    {
      value: 'favoritesFirst',
      label: 'Favoritos primeiro',
    },
    {
      value: 'video',
      label: 'Por video',
    },
  ];
  readonly selectedCount = computed(() => this.selectedCommentIds().size);
  readonly selectedIds = computed(() => [...this.selectedCommentIds()]);
  readonly sortedComments = computed(() => {
    const selectedIds = this.selectedCommentIds();

    return [...this.comments()]
      .map((item) => ({
        ...item,
        isSelected: selectedIds.has(item.comment.id),
      }))
      .sort((first, second) => this.compareComments(first, second));
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.commentsService.loadComments();
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  updateSortMode(sortMode: string): void {
    this.sortMode.set(sortMode as CommentSortMode);
  }

  async syncComments(): Promise<void> {
    try {
      await this.commentsService.syncComments();
      this.selectedCommentIds.set(new Set());
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  toggleSelection(commentId: string, isSelected: boolean): void {
    const selectedIds = new Set(this.selectedCommentIds());

    if (isSelected) {
      selectedIds.add(commentId);
    } else {
      selectedIds.delete(commentId);
    }

    this.selectedCommentIds.set(selectedIds);
  }

  async toggleFavorite(item: CommentListItem): Promise<void> {
    try {
      await this.commentsService.setFavorite(item.comment.id, !item.isFavorite);
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  async createScript(): Promise<void> {
    await this.router.navigate(['/scripts/new'], {
      state: {
        selectedCommentIds: this.selectedIds(),
      },
    });
  }

  trackByCommentId(_index: number, item: CommentListItem): string {
    return item.comment.id;
  }

  private compareComments(first: CommentListItem, second: CommentListItem): number {
    const newestFirst =
      new Date(second.comment.publishedAt).getTime() -
      new Date(first.comment.publishedAt).getTime();

    switch (this.sortMode()) {
      case 'oldest':
        return -newestFirst;
      case 'mostLiked':
        return second.comment.likeCount - first.comment.likeCount || newestFirst;
      case 'unusedFirst':
        return (
          Number(first.usedInScripts.length > 0) -
            Number(second.usedInScripts.length > 0) ||
          newestFirst
        );
      case 'favoritesFirst':
        return Number(second.isFavorite) - Number(first.isFavorite) || newestFirst;
      case 'video':
        return first.video.title.localeCompare(second.video.title) || newestFirst;
      case 'newest':
      default:
        return newestFirst;
    }
  }
}
