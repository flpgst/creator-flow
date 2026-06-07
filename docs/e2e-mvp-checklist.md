# Checklist E2E Manual Do MVP

Use este roteiro para validar o fluxo completo em ambiente local ou staging antes
de considerar o MVP pronto.

## Ambiente

- [ ] Supabase local ou projeto staging esta ativo e com as migrations aplicadas.
- [ ] `src/environments/environment.ts` ou a configuracao equivalente de staging
  aponta para a URL e chave publicavel do ambiente testado.
- [ ] Google Cloud Console tem YouTube Data API v3 habilitada.
- [ ] Google OAuth client tem o redirect URI exato do ambiente:
  - local: `http://127.0.0.1:54321/functions/v1/youtube-oauth-callback`
  - staging: URL da Edge Function publicada.
- [ ] Segredos das Edge Functions estao configurados no ambiente testado:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - chave de criptografia usada pelas funcoes
- [ ] Conta Google usada no teste tem acesso ao canal YouTube e esta liberada
  como test user quando o OAuth consent screen estiver em modo de teste.

## Preparacao Local

1. Inicie Supabase:

   ```bash
   npx supabase start
   ```

2. Aplique migrations, quando necessario:

   ```bash
   npx supabase db reset
   ```

3. Sirva as Edge Functions com o arquivo de segredos local:

   ```bash
   npx supabase functions serve --env-file supabase/.env.local
   ```

4. Inicie o Angular:

   ```bash
   npm start
   ```

5. Acesse `http://localhost:4200`.

## Validacao Do Fluxo

- [ ] Acessar `/comments` sem sessao redireciona para `/login`.
- [ ] Criar uma conta nova ou entrar com uma conta existente.
- [ ] Depois do login, o app redireciona para `/comments`.
- [ ] Navegar para `/connect-youtube`.
- [ ] Clicar em `Conectar YouTube` abre o consentimento do Google.
- [ ] Autorizar o canal retorna ao app com mensagem de sucesso.
- [ ] A tela `/connect-youtube` mostra titulo, ID, data de conexao e status do canal.
- [ ] Voltar para `/comments`.
- [ ] Clicar em `Sincronizar comentarios`.
- [ ] A ultima sincronizacao aparece com status, total processado, novos e atualizados.
- [ ] A lista mostra comentarios com autor, data, curtidas, texto e link do video.
- [ ] Validar as seis ordenacoes no seletor:
  - [ ] `Mais recentes`
  - [ ] `Mais antigos`
  - [ ] `Mais curtidos`
  - [ ] `Nao usados primeiro`
  - [ ] `Favoritos primeiro`
  - [ ] `Por video`
- [ ] Marcar um comentario como favorito.
- [ ] Recarregar a pagina e confirmar que o favorito continua marcado.
- [ ] Selecionar dois ou mais comentarios.
- [ ] Clicar em `Criar roteiro`.
- [ ] Tentar salvar sem titulo e confirmar que a validacao bloqueia o envio.
- [ ] Informar um titulo.
- [ ] Reordenar pelo menos um comentario com `Subir` ou `Descer`.
- [ ] Remover um comentario antes de salvar.
- [ ] Clicar em `Salvar roteiro`.
- [ ] Confirmar que a tela `/scripts/:id` abre com o titulo salvo.
- [ ] Confirmar que os comentarios aparecem na ordem salva.
- [ ] Voltar para `/comments`.
- [ ] Confirmar que os comentarios usados no roteiro mostram badge `Usado em:`.
- [ ] Confirmar que o comentario removido antes de salvar nao mostra badge do roteiro.

## Validacao De Segredos No Frontend

Execute um build de producao:

```bash
npm run build
```

Depois pesquise o bundle gerado por nomes de variaveis sensiveis e formatos
comuns de segredo:

```bash
rg -i "service_role|GOOGLE_OAUTH_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|GOCSPX-|client_secret=|refresh_token=" dist
```

O comando acima nao deve encontrar ocorrencias de segredo. A chave publicavel do
Supabase pode aparecer no bundle; `service_role`, client secret do Google e
refresh token nao podem aparecer. Nomes de campos internos do SDK, como
`refresh_token`, podem aparecer em bundles de bibliotecas; isso nao indica
vazamento quando nao ha valor de token junto.

## Registro De Resultado

- Ambiente:
- Data:
- Usuario testado:
- Canal testado:
- Job de sincronizacao observado:
- Roteiro criado:
- Resultado:
- Observacoes:
