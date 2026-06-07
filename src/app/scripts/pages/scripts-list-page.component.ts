import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ScriptsService } from '../scripts.service';
import type { ScriptListItem } from '../../shared/models/view-models';

@Component({
  selector: 'app-scripts-list-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './scripts-list-page.component.html',
  styleUrl: './scripts-list-page.component.css',
})
export class ScriptsListPageComponent implements OnInit {
  private readonly scriptsService = inject(ScriptsService);

  readonly scripts = signal<ScriptListItem[]>([]);
  readonly deletingScriptId = signal<string | null>(null);
  readonly scriptPendingDelete = signal<ScriptListItem | null>(null);
  readonly loading = this.scriptsService.loading;
  readonly error = this.scriptsService.error;

  async ngOnInit(): Promise<void> {
    try {
      this.scripts.set(await this.scriptsService.loadScripts());
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  openDeleteDialog(item: ScriptListItem): void {
    this.scriptPendingDelete.set(item);
  }

  closeDeleteDialog(): void {
    if (this.deletingScriptId()) {
      return;
    }

    this.scriptPendingDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const item = this.scriptPendingDelete();

    if (!item || this.deletingScriptId()) {
      return;
    }

    this.deletingScriptId.set(item.script.id);

    try {
      await this.scriptsService.deleteScript(item.script.id);
      this.scripts.set(
        this.scripts().filter((currentItem) => currentItem.script.id !== item.script.id),
      );
      this.scriptPendingDelete.set(null);
    } catch {
      // The service exposes the error state used by the template.
    } finally {
      this.deletingScriptId.set(null);
    }
  }

  trackByScriptId(_index: number, item: ScriptListItem): string {
    return item.script.id;
  }
}
