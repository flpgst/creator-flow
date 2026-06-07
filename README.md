# CreatorFlow

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## YouTube OAuth setup

The YouTube connection flow uses Supabase Edge Functions and Google OAuth 2.0.
Google requires the redirect URI registered in Google Cloud Console to match the
URI sent by the app exactly.

For local development, add this authorized redirect URI to the Google OAuth
client:

```text
http://127.0.0.1:54321/functions/v1/youtube-oauth-callback
```

Then keep the same value in `supabase/.env.local`:

```bash
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:54321/functions/v1/youtube-oauth-callback
```

If you use `localhost` instead of `127.0.0.1`, a different Supabase port, or a
deployed Supabase project URL, register that exact URI in Google Cloud Console
and set `GOOGLE_OAUTH_REDIRECT_URI` to the same value.

If Google returns `Erro 403: access_denied` while the OAuth consent screen is in
testing mode, add the Google account used for login as a test user:

```text
Google Cloud Console > APIs & Services > OAuth consent screen > Audience > Test users
```

The project must also have the YouTube Data API v3 enabled and the requested
YouTube scopes configured on the OAuth consent screen.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
