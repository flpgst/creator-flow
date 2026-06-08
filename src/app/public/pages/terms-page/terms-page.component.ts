import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-page.component.html',
  styleUrl: '../public-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPageComponent {}
