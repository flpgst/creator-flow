import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-script-detail-page',
  imports: [RouterLink],
  templateUrl: './script-detail-page.component.html',
  styleUrl: './script-detail-page.component.css',
})
export class ScriptDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly scriptId = this.route.snapshot.paramMap.get('id') ?? 'sem-id';
}
