import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { YoutubeConnectionService } from '../youtube-connection.service';

type CallbackStatus = 'success' | 'error' | null;

@Component({
  selector: 'app-connect-youtube-page',
  imports: [DatePipe],
  templateUrl: './connect-youtube-page.component.html',
  styleUrl: './connect-youtube-page.component.css',
})
export class ConnectYoutubePageComponent implements OnInit {
  private readonly youtubeConnectionService = inject(YoutubeConnectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly connection = this.youtubeConnectionService.connection;
  readonly loading = this.youtubeConnectionService.loading;
  readonly connecting = this.youtubeConnectionService.connecting;
  readonly serviceError = this.youtubeConnectionService.error;
  readonly callbackStatus = signal<CallbackStatus>(null);
  readonly callbackError = signal<string | null>(null);
  readonly hasActiveConnection =
    this.youtubeConnectionService.hasActiveConnection;
  readonly feedbackMessage = computed(() => {
    if (this.callbackStatus() === 'success') {
      return 'Canal conectado com sucesso.';
    }

    if (this.callbackStatus() === 'error') {
      return this.getCallbackErrorMessage(this.callbackError());
    }

    return this.serviceError();
  });

  async ngOnInit(): Promise<void> {
    this.readCallbackParams();

    try {
      await this.youtubeConnectionService.loadCurrentConnection();
    } catch {
      // The service exposes the error state used by the template.
    }

    await this.clearCallbackParams();
  }

  async connectYoutube(): Promise<void> {
    this.callbackStatus.set(null);
    this.callbackError.set(null);

    try {
      const authorizationUrl =
        await this.youtubeConnectionService.getAuthorizationUrl();
      window.location.assign(authorizationUrl);
    } catch {
      // The service exposes the error state used by the template.
    }
  }

  private readCallbackParams(): void {
    const queryParamMap = this.route.snapshot.queryParamMap;
    const status = queryParamMap.get('youtubeConnection');

    if (status === 'success' || status === 'error') {
      this.callbackStatus.set(status);
      this.callbackError.set(queryParamMap.get('error'));
      this.youtubeConnectionService.clearError();
    }
  }

  private async clearCallbackParams(): Promise<void> {
    if (!this.callbackStatus()) {
      return;
    }

    await this.router.navigate([], {
      queryParams: {
        youtubeConnection: null,
        error: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      relativeTo: this.route,
    });
  }

  private getCallbackErrorMessage(error: string | null): string {
    const errorMessages: Record<string, string> = {
      access_denied: 'A permissao para acessar o YouTube foi recusada.',
      invalid_or_expired_state:
        'A tentativa de conexao expirou. Inicie a conexao novamente.',
      missing_oauth_params:
        'O retorno do Google veio incompleto. Inicie a conexao novamente.',
      oauth_callback_failed:
        'Nao foi possivel concluir a conexao com o YouTube.',
      method_not_allowed: 'O callback do YouTube recebeu uma requisicao invalida.',
    };

    if (error && errorMessages[error]) {
      return errorMessages[error];
    }

    return 'Nao foi possivel concluir a conexao com o YouTube.';
  }
}
