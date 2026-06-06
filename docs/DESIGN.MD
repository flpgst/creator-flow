# Design System Inspired by YouTube

> Design system for a creator/comment/dashboard application with the closest practical visual language to YouTube, while keeping the product identity independent. Use YouTube branding only according to official brand/API rules.

## 1. Visual Theme & Atmosphere

YouTube's interface is direct, content-first, and utility-driven. The screen is organized around video thumbnails, channel identity, short text metadata, action buttons, comments, and fast filtering. Unlike Spotify's immersive "dark cocoon", the YouTube-like experience should feel like a content browsing surface: high density, neutral backgrounds, sharp content cards, circular avatars, compact typography, and a strong red action language.

The visual philosophy is **"video-first neutrality"**. The interface should not compete with thumbnails, profile images, charts, or comments. Most surfaces stay white, near-black, or neutral gray. Red is used sparingly for primary actions, recording/creator moments, active video states, destructive indicators, and small signature UI accents. A little red goes a long way.

The UI should support both **light mode** and **dark mode**, with light mode as the default for dashboard/admin screens and dark mode as an optional creator/media-focused experience.

Typography should use YouTube/Google-adjacent system fonts rather than proprietary brand fonts. Prefer `Roboto`, `Arial`, and system sans-serif fallbacks. The result should feel familiar to YouTube without pretending to be an official YouTube product.

**Key Characteristics:**

- Video-first layout with thumbnails, channel avatars, metadata, actions, and comments
- White/light neutral interface by default; near-black dark mode available
- Red accent used with restraint for primary actions and signature moments
- Compact, scannable typography inspired by YouTube's dense information hierarchy
- Rounded but not pill-heavy: 8px–12px cards, 18px–24px chips, circular avatars
- Sidebar + top app bar + content feed/dashboard layout
- Horizontal filter chips for fast content filtering
- Content cards prioritize thumbnails, title, creator/channel, date, views, and status badges
- Comments are first-class content blocks with avatar, author, timestamp, body, actions, and state badges

## 2. Color Palette & Roles

### Primary Brand-Inspired Colors

- **YouTube Red** (`#FF0033`): Signature red, use carefully for brand-like moments, active recording/video indicators, and high-emphasis CTAs.
- **Action Red** (`#CC0000`): Practical UI red for primary buttons, destructive actions, active states, and selected icons.
- **Almost Black** (`#212121`): Strong text, dark logo-compatible neutral, prominent dark surfaces.
- **White** (`#FFFFFF`): Default page and card background in light mode.

### Light Theme

- **Page Background** (`#FFFFFF`): Main application background.
- **Subtle Background** (`#F9F9F9`): Feed background, dashboard canvas, low-emphasis panels.
- **Chip Background** (`#F2F2F2`): Filter chips, secondary controls.
- **Hover Surface** (`#EDEDED`): Hover/pressed state for chips and icon buttons.
- **Card Surface** (`#FFFFFF`): Video cards, comment cards, panels.
- **Border / Divider** (`#E5E5E5`): Separators, card borders, table borders.
- **Strong Divider** (`#DADADA`): Stronger separation for sidebars and panels.

### Dark Theme

- **Dark Page Background** (`#0F0F0F`): Main dark background.
- **Dark Surface** (`#181818`): Cards, dropdowns, sidebar panels.
- **Dark Elevated Surface** (`#212121`): Menus, modals, active panels.
- **Dark Hover Surface** (`#272727`): Hover state for dark controls.
- **Dark Border** (`#303030`): Dividers and outlines.
- **Dark Input** (`#121212`): Search fields and text inputs.

### Text

- **Primary Text Light** (`#0F0F0F`): Main text in light mode.
- **Secondary Text Light** (`#606060`): Metadata, timestamps, descriptions, secondary labels.
- **Muted Text Light** (`#909090`): Placeholder text and low-priority metadata.
- **Primary Text Dark** (`#F1F1F1`): Main text in dark mode.
- **Secondary Text Dark** (`#AAAAAA`): Metadata and muted text in dark mode.
- **Disabled Text** (`#909090`): Disabled controls and inactive labels.

### Semantic

- **Error / Destructive** (`#CC0000`): Remove, delete, failed sync, blocked state.
- **Success** (`#107C10`): Imported, saved, processed, script generated.
- **Warning** (`#F9AB00`): Needs attention, incomplete metadata.
- **Info** (`#065FD4`): Links, secondary navigation, neutral information.
- **Used Badge** (`#E6F4EA` background, `#137333` text): Comment already used in a script.
- **Favorite Badge** (`#FEF7E0` background, `#B06000` text): Favorite comment.
- **Draft Badge** (`#F1F3F4` background, `#3C4043` text): Draft script.

### Shadows

- **Subtle Card Shadow**: `0 1px 2px rgba(0,0,0,0.08)`
- **Menu Shadow**: `0 4px 16px rgba(0,0,0,0.18)`
- **Dialog Shadow**: `0 8px 24px rgba(0,0,0,0.22)`
- **Dark Shadow**: `0 4px 16px rgba(0,0,0,0.45)`

## 3. Typography Rules

### Font Families

- **Primary UI**: `Roboto, Arial, sans-serif`
- **Fallback / System**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`
- **Numbers / Metrics**: same as UI, use `font-variant-numeric: tabular-nums` for dashboards when helpful.

### Hierarchy

| Role              | Font   | Size      | Weight  | Line Height | Letter Spacing | Notes                          |
| ----------------- | ------ | --------- | ------- | ----------- | -------------- | ------------------------------ |
| Page Title        | Roboto | 28px      | 700     | 1.25        | -0.2px         | Dashboard or page heading      |
| Section Title     | Roboto | 22px      | 700     | 1.30        | normal         | Main content sections          |
| Video Title Large | Roboto | 20px      | 700     | 1.35        | normal         | Video detail / selected item   |
| Video Card Title  | Roboto | 16px      | 500–600 | 1.35        | normal         | Feed/card titles               |
| Comment Author    | Roboto | 14px      | 500–600 | 1.40        | normal         | Comment author/channel         |
| Body              | Roboto | 14px      | 400     | 1.45        | normal         | Comments, descriptions, labels |
| Metadata          | Roboto | 12px–13px | 400     | 1.35        | normal         | Views, dates, channel info     |
| Button            | Roboto | 14px      | 500     | 1.00        | normal         | Do not uppercase by default    |
| Chip              | Roboto | 14px      | 500     | 1.00        | normal         | Filter chips                   |
| Caption           | Roboto | 12px      | 400     | 1.40        | normal         | Fine metadata                  |
| Badge             | Roboto | 11px–12px | 500     | 1.20        | normal         | Status markers                 |

### Principles

- **Scannability first**: Users should quickly identify title, author, date, count, and status.
- **Avoid uppercase labels**: YouTube-like UI generally uses natural case button text.
- **Medium weight over heavy weight**: Use 500/600 for title emphasis, 700 only for page and section headings.
- **Metadata is muted**: Dates, view counts, comment counts, and script usage labels should be visibly secondary.
- **Dense but readable**: Use compact spacing, but keep comments readable with line-height around 1.45.

## 4. Component Stylings

### Top App Bar

- Height: 56px
- Background light: `#FFFFFF`
- Background dark: `#0F0F0F`
- Border bottom: `1px solid #E5E5E5` in light mode, `1px solid #303030` in dark mode
- Left: hamburger/menu button + product name/logo area
- Center: search input, max width 640px
- Right: create button, notifications, user avatar
- Position: sticky top for dashboard apps

### Search Input

**Desktop Search**

- Container height: 40px
- Background: `#FFFFFF` light, `#121212` dark
- Border: `1px solid #CCCCCC` light, `1px solid #303030` dark
- Radius: 20px
- Input padding: `0 16px`
- Button segment width: 56px
- Button background: `#F8F8F8` light, `#222222` dark
- Placeholder: `#909090`
- Focus border: `#065FD4` or high-contrast neutral

### Sidebar Navigation

- Width expanded: 240px
- Width compact: 72px
- Background: same as page background
- Item height: 40px
- Item radius: 10px
- Padding expanded: `0 12px`
- Icon size: 24px
- Active background light: `#F2F2F2`
- Active background dark: `#272727`
- Active text: primary text
- Inactive text: primary/secondary depending on importance
- Use: Home, Videos, Comments, Favorites, Scripts, Analytics, Settings

### Filter Chips

**Default Chip**

- Background: `#F2F2F2` light, `#272727` dark
- Text: primary text
- Radius: 8px or 18px
- Padding: `0 12px`
- Height: 32px
- Font: 14px / 500
- Border: none

**Selected Chip**

- Background: `#0F0F0F` light, `#F1F1F1` dark
- Text: `#FFFFFF` light, `#0F0F0F` dark
- Used for active sorting/filter tabs

Examples:

- Todos
- Favoritos
- Ainda não usados
- Já usados em roteiro
- Mais recentes
- Mais curtidos
- Com resposta
- Perguntas

### Buttons

**Primary Button**

- Background: `#CC0000`
- Text: `#FFFFFF`
- Height: 36px–40px
- Padding: `0 16px`
- Radius: 18px–20px
- Font: 14px / 500
- Use: Generate Script, Save Script, Sync Comments

**Secondary Button**

- Background: `#F2F2F2` light, `#272727` dark
- Text: primary text
- Height: 36px
- Radius: 18px
- Padding: `0 16px`
- Use: Cancel, Clear Filter, Export

**Text Button**

- Background: transparent
- Text: `#065FD4`
- Height: 36px
- Padding: `0 8px`
- Use: View details, Open on YouTube, Load more

**Icon Button**

- Size: 40px
- Radius: 50%
- Background: transparent
- Hover: `#F2F2F2` light, `#272727` dark
- Icon size: 20px–24px
- Use: More, Favorite, Reply, Copy, Sort

**Danger Button**

- Background: transparent or `#CC0000`
- Text: `#CC0000` or `#FFFFFF`
- Use only for destructive actions

### Video Card

- Width: responsive grid item
- Background: transparent or card surface
- Radius: 12px
- Thumbnail radius: 12px
- Thumbnail aspect ratio: 16:9
- Thumbnail background: `#E5E5E5` light, `#303030` dark
- Duration badge:
  - Position: bottom-right
  - Background: `rgba(0,0,0,0.85)`
  - Text: `#FFFFFF`
  - Radius: 4px
  - Padding: `2px 4px`
  - Font: 12px / 500
- Title:
  - Size: 16px
  - Weight: 500–600
  - Clamp: 2 lines
- Metadata:
  - Size: 12px–13px
  - Color: secondary text
  - Example: `1,2 mil visualizações • há 3 dias`
- Layout:
  - Thumbnail on top
  - Metadata row with channel/avatar optionally
  - More menu on right

### Comment Card

- Background: `#FFFFFF` light, `#181818` dark
- Border: `1px solid #E5E5E5` light, `1px solid #303030` dark
- Radius: 12px
- Padding: 12px–16px
- Display: avatar + content + action column
- Avatar: 40px circle
- Author: 14px / 500–600
- Timestamp: 12px / secondary text
- Body: 14px / 1.45
- Actions:
  - Favorite
  - Select for script
  - Reply
  - Copy
  - Open original
- Selected state:
  - Border: `2px solid #CC0000`
  - Background: `#FFF5F5` light or `rgba(204,0,0,0.10)` dark
- Favorite state:
  - Star/icon active in warm yellow/orange
- Used state:
  - Badge: `Usado no roteiro: Video 1`
  - Badge background: `#E6F4EA`
  - Badge text: `#137333`

### Script Builder Panel

- Background: `#FFFFFF` light, `#181818` dark
- Border left on desktop: `1px solid #E5E5E5`
- Width desktop: 360px–440px
- Mobile: full-screen drawer
- Header:
  - Title: `Roteiro`
  - Subtitle: number of selected comments
- Body:
  - Ordered stack of selected comments
  - Drag handle for reordering
  - Remove action
- Footer:
  - Save Script button
  - Clear selection
  - Export/copy options

### Analytics Cards

- Background: card surface
- Border: `1px solid #E5E5E5`
- Radius: 12px
- Padding: 16px
- Metric value: 24px–28px / 700
- Label: 13px / secondary text
- Delta:
  - Positive: success green
  - Negative: error red
  - Neutral: secondary text
- Use for:
  - Total comments
  - New comments
  - Favorite comments
  - Comments already used
  - Scripts generated
  - Engagement rate

### Badges

**Used in Script**

- Background: `#E6F4EA`
- Text: `#137333`
- Radius: 999px
- Padding: `3px 8px`
- Font: 11px–12px / 500

**Favorite**

- Background: `#FEF7E0`
- Text: `#B06000`
- Radius: 999px

**Unanswered**

- Background: `#E8F0FE`
- Text: `#065FD4`
- Radius: 999px

**Removed / Hidden**

- Background: `#FCE8E6`
- Text: `#C5221F`
- Radius: 999px

## 5. Layout Principles

### Spacing System

- Base unit: 4px
- Main scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px
- App bar height: 56px
- Sidebar expanded: 240px
- Sidebar compact: 72px
- Card gap: 16px–24px
- Comment list gap: 8px–12px
- Dashboard page padding: 24px desktop, 16px tablet, 12px mobile

### App Layout

Use a YouTube-like application shell:

```txt
┌──────────────────────────────────────────────┐
│ Top App Bar: menu + search + actions + user  │
├──────────────┬───────────────────────────────┤
│ Sidebar      │ Page Content                  │
│ Navigation   │ Filter chips                  │
│              │ Video/comment/script content  │
└──────────────┴───────────────────────────────┘
```

For your Angular/Supabase YouTube comment app, the ideal layout is:

```txt
┌────────────────────────────────────────────────────────────┐
│ Top Bar: channel selector | search comments | sync button  │
├──────────────┬──────────────────────────────┬──────────────┤
│ Sidebar      │ Comment List                 │ Script Panel │
│ Videos       │ Filters + sorting            │ Selected     │
│ Comments     │ Comment cards                │ comments     │
│ Favorites    │ Used badges                  │ Save script  │
│ Scripts      │                              │              │
└──────────────┴──────────────────────────────┴──────────────┘
```

### Content Density

- YouTube-like pages are dense but not cramped.
- Keep feed items close together.
- Let thumbnails and comments carry the visual weight.
- Avoid large decorative gradients.
- Avoid overly dramatic card shadows.
- Prefer subtle borders and neutral hover states.

### Border Radius Scale

- 4px: duration badges, small labels
- 8px: chips, small controls
- 10px: sidebar navigation items
- 12px: video thumbnails, cards, comment cards
- 16px: panels and large containers
- 18px–24px: buttons and search input
- 50%: avatars and icon buttons
- 999px: status badges only

## 6. Depth & Elevation

| Level          | Treatment                     | Use                                 |
| -------------- | ----------------------------- | ----------------------------------- |
| Base           | `#FFFFFF` / `#0F0F0F`         | Page background                     |
| Subtle Surface | `#F9F9F9` / `#181818`         | Feed and dashboard canvas           |
| Card           | White/dark card + 1px border  | Video cards, comments, metric cards |
| Hover          | Slight gray background        | Chips, nav, icon buttons            |
| Menu           | `0 4px 16px rgba(0,0,0,0.18)` | Dropdowns, context menus            |
| Dialog         | `0 8px 24px rgba(0,0,0,0.22)` | Modals and overlays                 |

**Shadow Philosophy**: YouTube-like UI should not feel as heavy as Spotify. Shadows are subtle and functional. Borders, hover backgrounds, and hierarchy do most of the work.

## 7. Do's and Don'ts

### Do

- Use neutral backgrounds so thumbnails/comments stand out.
- Use red sparingly for important actions and selected states.
- Use `Roboto, Arial, sans-serif` for a Google/YouTube-adjacent feel.
- Use circular avatars everywhere user/channel identity appears.
- Use 16:9 thumbnails with 12px radius.
- Use horizontal filter chips above lists.
- Use compact metadata: views, date, likes, replies, script usage.
- Mark comments already used in a script with a visible badge.
- Keep the top bar and sidebar familiar and practical.
- Support both light and dark themes.

### Don't

- Don't copy official YouTube screens pixel-for-pixel.
- Don't use YouTube logos unless following official brand/API guidelines.
- Don't use YouTube Red everywhere; reserve it for key moments.
- Don't make every button a full pill like Spotify.
- Don't use heavy dark gradients or album-art-driven color extraction.
- Don't make cards overly shadowed; prefer borders and hover surfaces.
- Don't uppercase all buttons; use natural sentence/title case.
- Don't let decorative UI compete with video thumbnails or comments.
- Don't imply the app is endorsed by or officially affiliated with YouTube.

## 8. Responsive Behavior

### Breakpoints

| Name          | Width       | Key Changes                                         |
| ------------- | ----------- | --------------------------------------------------- |
| Mobile Small  | <425px      | Single column, hidden sidebar, top search collapses |
| Mobile        | 425–576px   | Bottom navigation or drawer navigation              |
| Tablet        | 576–768px   | 2-column video grid, script panel becomes drawer    |
| Tablet Large  | 768–896px   | Compact sidebar, wider content                      |
| Desktop Small | 896–1024px  | Sidebar visible, 2–3 column cards                   |
| Desktop       | 1024–1280px | Full shell, optional script side panel              |
| Large Desktop | >1280px     | Full sidebar + content + script panel               |

### Collapsing Strategy

- Sidebar: expanded → compact icons → drawer
- Search: full input → icon button opening overlay
- Script panel: right panel → drawer → full-screen editor
- Video grid: 4 columns → 3 → 2 → 1
- Comment list: maintain one readable column
- Filter chips: horizontal scroll on small screens
- Action buttons: text + icon → icon-only where space is limited

## 9. Application-Specific Patterns

### Comment Sorting

Recommended sorting options:

- Mais recentes
- Mais antigos
- Mais curtidos
- Mais respostas
- Favoritos primeiro
- Ainda não usados
- Já usados
- Perguntas primeiro

### Comment Status Rules

A comment can have multiple states:

```txt
default
favorite
selected_for_script
used_in_script
answered
hidden
```

Visual mapping:

- `favorite`: star icon active + optional favorite badge
- `selected_for_script`: red border + selected checkbox
- `used_in_script`: green badge with script name
- `answered`: blue/info badge
- `hidden`: muted card opacity + hidden badge

### Script Screen

A script is a saved ordered list of comments.

Each script should show:

- Script title
- Related video
- Created date
- Number of comments
- Ordered comments
- Comment origin metadata
- Whether each comment was already used elsewhere

### Comment Card Example

```txt
[Avatar] @author · há 2 dias                         [⋯]
         Comment body text goes here and wraps into
         multiple readable lines.

         👍 42   Responder   Favoritar   Usar no roteiro

         [Usado no roteiro: Vídeo 1]
```

## 10. Agent Prompt Guide

### Quick Color Reference

- Light background: `#FFFFFF`
- Light canvas: `#F9F9F9`
- Light chip: `#F2F2F2`
- Primary text: `#0F0F0F`
- Secondary text: `#606060`
- Dark background: `#0F0F0F`
- Dark surface: `#181818`
- Dark hover: `#272727`
- Signature red: `#FF0033`
- Action red: `#CC0000`
- Link blue: `#065FD4`
- Border: `#E5E5E5`

### Example Component Prompts

- "Create a YouTube-like comment card with white background, 1px #E5E5E5 border, 12px radius, 16px padding, 40px circular avatar, 14px Roboto body text, muted #606060 metadata, and icon actions for favorite, reply, copy, and select."

- "Create a YouTube-like video card with a 16:9 thumbnail, 12px radius, duration badge bottom-right, title at 16px weight 500, metadata at 13px #606060, and a three-dot menu button."

- "Create a YouTube-like top app bar with 56px height, white background, bottom border #E5E5E5, left menu button, centered rounded search input, and right-side sync/create/avatar actions."

- "Create horizontal filter chips like YouTube: 32px height, #F2F2F2 background, 8px radius, 14px Roboto medium text. Selected chip uses #0F0F0F background and white text."

- "Create a script builder side panel: 400px wide, white background, left border #E5E5E5, header with title and selected count, ordered comment list, and a red primary Save Script button."

### Iteration Guide

1. Start with a neutral YouTube-like app shell: top bar + sidebar + content area.
2. Use white/light surfaces first; add dark mode as a token swap.
3. Add red only to primary actions, selected states, and high-emphasis indicators.
4. Build around video thumbnails, comments, avatars, metadata, and chips.
5. Keep shadows subtle; use borders and hover states for hierarchy.
6. Make comment usage visible with badges like "Usado no roteiro: Vídeo 1".
7. Keep the UI compact and practical, not decorative.
8. Preserve independent product identity; do not imply official YouTube affiliation.
