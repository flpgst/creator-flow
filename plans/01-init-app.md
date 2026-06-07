# Plano: Creator Flow Angular + Supabase + YouTube

## Objetivo

Construir um MVP multiusuario em Angular 19 + Supabase onde cada usuario faz login, conecta seu canal do YouTube via OAuth, importa comentarios do canal sob demanda e monta roteiros a partir dos comentarios selecionados.

## Tarefas De Implementacao

### 1. Preparar Base Do App Angular

- [ X ] Definir estrutura feature-based em `src/app` para `auth`, `youtube`, `comments`, `scripts` e `shared`.
- [ X ] Configurar rotas standalone:
  - `/login`
  - `/connect-youtube`
  - `/comments`
  - `/scripts/new`
  - `/scripts/:id`
- [ X ] Criar layout principal autenticado com navegacao para conexao YouTube, comentarios e roteiros.
- [ X ] Criar tela inicial/redirect para mandar usuario autenticado para `/comments` e anonimo para `/login`.
- [ X ] Adicionar tipagens compartilhadas para entidades principais e view models.

**Aceite**

- [ X ] App compila.
- [ X ] Rotas existem e carregam paginas standalone.
- [ X ] Navegacao basica entre telas funciona.

### 2. Integrar Supabase No Frontend

- [ X ] Instalar e configurar `@supabase/supabase-js`.
- [ X ] Criar configuracao de ambiente para `supabaseUrl` e `supabasePublishableKey`.
- [ X ] Criar `SupabaseService` centralizando o client.
- [ X ] Criar tipos base para respostas de banco usadas pelo Angular.
- [ X ] Garantir que nenhuma chave sensivel ou service role seja exposta no bundle Angular.

**Aceite**

- [ X ] Client Supabase inicializa a partir de environment.
- [ X ] Build nao contem service role, client secret do Google ou refresh token.

### 3. Implementar Autenticacao

- [ X ] Criar `AuthService` com estado de sessao, login, logout e recuperacao do usuario atual.
- [ X ] Criar pagina `/login` com formulario ou fluxo escolhido de Supabase Auth.
- [ X ] Criar guard para proteger rotas autenticadas.
- [ X ] Redirecionar usuario autenticado para `/comments`.
- [ X ] Tratar estados de loading e erro de autenticacao.

**Aceite**

- [ X ] Usuario anonimo nao acessa rotas protegidas.
- [ X ] Usuario autenticado acessa `/connect-youtube`, `/comments` e telas de roteiro.
- [ X ] Logout encerra sessao e volta para `/login`.

### 4. Criar Modelo De Dados Supabase

- [ X ] Criar migrations Supabase para `profiles`.
- [ X ] Criar migrations para `youtube_connections`.
- [ X ] Criar migrations para `youtube_sync_jobs`.
- [ X ] Criar migrations para `youtube_videos`.
- [ X ] Criar migrations para `comments`.
- [ X ] Criar migrations para `scripts`.
- [ X ] Criar migrations para `script_comments`.
- [ X ] Adicionar indices e constraints:
  - `youtube_connections.user_id`
  - `comments.user_id`
  - `comments.youtube_comment_id`
  - `youtube_videos.user_id`
  - `youtube_videos.youtube_video_id`
  - `script_comments.script_id`
  - `script_comments.comment_id`
  - `script_comments.position`
- [ X ] Habilitar RLS em todas as tabelas publicas.
- [ X ] Criar policies para isolar dados por `auth.uid()`.
- [ X ] Criar trigger ou fluxo para perfil minimo em `profiles`, se necessario.

**Aceite**

- [ X ] Usuario A nao consegue ler ou alterar dados do usuario B.
- [ X ] Upsert de comentario nao duplica `youtube_comment_id` por usuario.
- [ X ] `script_comments.position` preserva a ordem do roteiro.

### 5. Implementar Edge Function `youtube-oauth-start`

- [ X ] Criar funcao `youtube-oauth-start`.
- [ X ] Validar usuario autenticado via JWT Supabase.
- [ X ] Gerar `state` vinculado ao usuario autenticado.
- [ X ] Persistir `state` com expiracao curta.
- [ X ] Gerar URL OAuth do Google com scopes necessarios para leitura de comentarios.
- [ X ] Retornar apenas a URL de autorizacao para o frontend.

**Aceite**

- [ X ] Usuario autenticado recebe URL OAuth valida.
- [ X ] Usuario anonimo nao consegue iniciar OAuth.
- [ X ] `state` e gerado de forma nao previsivel e expira.

### 6. Implementar Edge Function `youtube-oauth-callback`

- [ ] Criar funcao `youtube-oauth-callback`.
- [ ] Validar `state` recebido contra o usuario/registro persistido.
- [ ] Trocar `code` por tokens no Google OAuth.
- [ ] Buscar dados publicos do canal conectado.
- [ ] Criptografar refresh token antes de persistir.
- [ ] Salvar ou atualizar `youtube_connections` com canal, scopes, expiracao e status.
- [ ] Redirecionar ou responder de forma que a tela `/connect-youtube` consiga mostrar sucesso/erro.

**Aceite**

- [ ] Callback rejeita `state` invalido ou expirado.
- [ ] Refresh token nunca e retornado para o frontend.
- [ ] Conexao do canal fica persistida para o usuario correto.

### 7. Criar Tela E Servico De Conexao YouTube

- [ ] Criar `YoutubeConnectionService`.
- [ ] Buscar status da conexao atual do usuario.
- [ ] Chamar `youtube-oauth-start` e redirecionar usuario para o Google.
- [ ] Criar pagina `/connect-youtube` com status do canal conectado.
- [ ] Exibir acao `Conectar YouTube`.
- [ ] Exibir erros de conexao e estado de loading.

**Aceite**

- [ ] Tela mostra se ha canal conectado.
- [ ] Botao de conectar inicia o OAuth.
- [ ] Apos callback, usuario consegue ver o canal conectado.

### 8. Implementar Edge Function `youtube-sync-comments`

- [ ] Criar funcao `youtube-sync-comments`.
- [ ] Validar usuario autenticado.
- [ ] Buscar conexao YouTube ativa do usuario.
- [ ] Renovar access token quando necessario usando refresh token criptografado.
- [ ] Chamar `commentThreads.list` com:
  - `allThreadsRelatedToChannelId`
  - `textFormat=plainText`
  - `maxResults=100`
  - paginacao por `pageToken`
- [ ] Importar comentarios principais dos threads.
- [ ] Criar ou atualizar videos relacionados aos comentarios.
- [ ] Fazer upsert de comentarios.
- [ ] Registrar `youtube_sync_jobs` com status, contadores, cursor/pagina, erro e timestamps.
- [ ] Tratar erros de API, quota e token invalido.

**Aceite**

- [ ] Sincronizacao pagina comentarios ate concluir ou falhar.
- [ ] Comentarios repetidos sao atualizados, nao duplicados.
- [ ] Erros ficam registrados no job.
- [ ] Refresh token e access token nao sao expostos ao frontend.

### 9. Implementar Listagem De Comentarios

- [ ] Criar `CommentsService`.
- [ ] Buscar comentarios do usuario com dados do video e roteiros usados.
- [ ] Criar view model `CommentListItem`:
  - dados do comentario
  - dados do video
  - `isFavorite`
  - `isSelected`
  - `usedInScripts: { id, title }[]`
- [ ] Criar pagina `/comments`.
- [ ] Adicionar botao `Sincronizar comentarios` chamando `youtube-sync-comments`.
- [ ] Mostrar status da ultima sincronizacao.
- [ ] Criar lista densa com checkbox de selecao, favorito, badge de usado em roteiro e titulo/link do video.
- [ ] Implementar ordenacoes:
  - mais recentes
  - mais antigos
  - mais curtidos
  - nao usados primeiro
  - favoritos primeiro
  - por video
- [ ] Persistir toggle de favorito.
- [ ] Manter selecao apenas em estado local ate salvar roteiro.

**Aceite**

- [ ] Usuario ve comentarios importados.
- [ ] Usuario ordena a lista pelos 6 modos.
- [ ] Usuario favorita e desfavorita comentarios.
- [ ] Comentarios usados mostram badges como `Usado em: Video 1`.

### 10. Implementar Criacao De Roteiro

- [ ] Criar `ScriptsService`.
- [ ] Criar pagina `/scripts/new`.
- [ ] Permitir definir titulo obrigatorio do roteiro.
- [ ] Receber ou carregar comentarios selecionados.
- [ ] Exibir comentarios selecionados em lista editavel.
- [ ] Permitir reordenar comentarios.
- [ ] Permitir remover comentarios antes de salvar.
- [ ] Salvar `scripts` e `script_comments` com `position`, snapshot do texto do comentario e dados do video.
- [ ] Implementar rollback ou compensacao quando salvar roteiro falhar parcialmente.

**Aceite**

- [ ] Roteiro sem titulo nao pode ser salvo.
- [ ] Ordem visual dos comentarios e persistida.
- [ ] Comentarios removidos antes de salvar nao entram em `script_comments`.
- [ ] Apos salvar, comentarios aparecem como usados na listagem.

### 11. Implementar Visualizacao/Edição De Roteiro

- [ ] Criar pagina `/scripts/:id`.
- [ ] Carregar roteiro do usuario com comentarios vinculados.
- [ ] Exibir titulo, snapshot de conteudo e comentarios na ordem persistida.
- [ ] Permitir remover comentario do roteiro, se fizer parte do MVP.
- [ ] Permitir reordenar comentarios do roteiro existente, se fizer parte do MVP.
- [ ] Atualizar badges da listagem quando vinculos mudarem.

**Aceite**

- [ ] Usuario acessa apenas roteiros proprios.
- [ ] Comentarios aparecem na ordem de `script_comments.position`.
- [ ] Badges de uso refletem os vinculos persistidos.

### 12. Escrever Testes Angular

- [ ] Testar ordenacoes essenciais da lista de comentarios.
- [ ] Testar toggle de favorito.
- [ ] Testar montagem de `CommentListItem` com roteiros usados.
- [ ] Testar validacao de titulo obrigatorio no roteiro.
- [ ] Testar guards de rotas autenticadas.

**Aceite**

- [ ] `npm test` passa para os testes unitarios adicionados.
- [ ] Casos principais de UI e servicos ficam cobertos sem depender da API real do YouTube.

### 13. Escrever Testes Supabase E Edge Functions

- [ ] Testar RLS impedindo usuario A de acessar dados do usuario B.
- [ ] Testar upsert de comentario sem duplicar `youtube_comment_id`.
- [ ] Testar persistencia da ordem em `script_comments.position`.
- [ ] Testar `youtube-oauth-callback` validando `state`.
- [ ] Testar que refresh token nao retorna para o frontend.
- [ ] Testar sincronizacao com mocks paginando comentarios.
- [ ] Testar registro de erro de API/quota.

**Aceite**

- [ ] Testes de banco validam policies e constraints.
- [ ] Testes das Edge Functions usam mocks para Google OAuth e YouTube Data API.

### 14. Validar Fluxo End-To-End Do MVP

- [ ] Criar checklist manual para ambiente local/staging.
- [ ] Validar login.
- [ ] Validar conexao do canal YouTube.
- [ ] Validar importacao sob demanda de comentarios.
- [ ] Validar as 6 ordenacoes.
- [ ] Validar favorito persistente.
- [ ] Validar criacao de roteiro com titulo.
- [ ] Validar persistencia de comentarios usados.
- [ ] Validar que a proxima listagem marca comentarios usados.
- [ ] Validar que segredos nao aparecem no frontend.

**Aceite Final**

- [ ] Usuario conecta canal, importa comentarios, ordena por pelo menos 6 modos, favorita comentarios, cria roteiro com titulo, salva e ve os comentarios marcados como usados na proxima listagem.

## Dependencias Entre Tarefas

1. Tarefas 1, 2 e 4 desbloqueiam a maior parte do desenvolvimento.
2. Tarefa 3 deve ser concluida antes das rotas protegidas e Edge Functions autenticadas.
3. Tarefas 5 e 6 desbloqueiam a conexao YouTube da tarefa 7.
4. Tarefa 8 depende da conexao YouTube persistida.
5. Tarefa 9 depende de comentarios importados ou mocks locais.
6. Tarefas 10 e 11 dependem do modelo de dados de roteiros.
7. Tarefas 12 e 13 devem acompanhar a implementacao das features, nao ficar apenas para o final.

## Escopo Inicial

- Multiusuario com Supabase Auth.
- Um canal YouTube conectado por usuario no MVP.
- Sincronizacao sob demanda.
- Importacao de comentarios principais dos threads.
- Respostas aninhadas fora do MVP inicial.
- Um comentario pode aparecer em mais de um roteiro.
- Favorito e persistente.
- Selecao de comentario e estado local ate salvar roteiro.

## Referencias

- YouTube `commentThreads.list`: https://developers.google.com/youtube/v3/docs/commentThreads/list
- YouTube OAuth 2.0 server-side: https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
