# UI/UX-PRD — Anpassningsbara köpar-personas

**Status:** Utkast 1 — väntar godkännande
**Parallell till:** `personas-product-prd.md` (produkt-PRD)
**Datum:** 2026-04-18
**Scope:** Utseende, layout, interaktionsmönster, komponenthierarki. Ingen implementering.

---

## 1. Designvision

Salestraining-appen har redan ett mörkt, slitet grafitfärgat designspråk (se `src/app/globals.css` — `--bg-root: #0A0A0B`, blå accent, rundade radii, subtila shadows). UI/UX för personas **utökar** detta — inget nytt designsystem.

Nyckelprincip: användaren ska känna att hen **arbetar i ett precisionsverktyg**, inte fyller i ett formulär. Panelen är central, fokuserad, tyst. Resten av skärmen dras tillbaka visuellt så att användaren vet var fokus ska ligga.

## 2. Siduppdelning

| Route | Syfte | Ändring |
|---|---|---|
| `/personas` | Listvy över alla personas (egna + team + defaults). Primär ingång för CRUD. | **Ny** |
| `/personas/[id]` | Deep-länk till en specifik persona. Öppnar `/personas` med panelen förvald på den personan. | **Ny** |
| `/roleplay` | Starta ett rollspel — behåller sin nuvarande position. | **Förenklad** — persona-valet kopplas till `/personas`-panelen istället för att duplicera UI:n. |

Navigering: nytt item i huvudmenyn (`src/components/nav/...`) — "Personas".

## 3. Listvyn — `/personas`

### 3.1 Layout

- **Header**: H1 "Personas", höger-justerad primärknapp `+ Ny persona` och bredvid ett split-dropdown `Från mall ▾` (öppnar en mini-lista över de 6 defaults som startpunkter).
- **Filter-rad**: segmentkontroll (`Mina • Team • Defaults • Alla`). Vald som default: `Mina`. Ingen sök/text-filter i v1.
- **Galleri-grid**: responsiva kort, 2-3 per rad på desktop. Mobil: 1 per rad.

### 3.2 Persona-kortet

Kortdesign (bygger på befintlig `.card`-stil):

```
┌─────────────────────────────────┐
│  AL   Anna Lindström     ⋯      │
│       IT-chef, TechNord AB      │
│                                 │
│  Teknisk, detaljorienterad...   │
│                                 │
│  [Default]  [✦ Starta]          │
└─────────────────────────────────┘
```

- **Avatar-cirkel** (initial tills `avatarUrl` finns).
- **Namn + titel/företag**.
- **Personlighet** — 2 rader, truncated.
- **Taggar**: `Default` / `Mina` / `Delad med team` — små pillar med subtil bakgrund.
- **Snabbknapp ✦ Starta** — visas alltid, primär-accent. Klick går direkt till rollspels-start med denna persona förvald (hoppar över listvyn i `/roleplay`).
- **⋯-meny** (visas vid hover eller alltid, TBD i visuell iteration) — innehåller: `Redigera` (öppnar panel), `Klona`, `Arkivera`.

Hela kortet är klickbart = **Redigera** (öppnar panelen). `⋯` och `Starta` är stop-propagation.

### 3.3 Tomtillstånd

Om användaren inte har egna personas och filter är `Mina`:

```
   ✦
   Du har inga egna personas än
   Skapa från scratch eller starta från en mall.
   [+ Ny persona]  [Från mall ▾]
```

## 4. Centrerad panel — den primära interaktionskomponenten

Detta är det som skiljer sig från klassisk Notion. Explicita krav:

### 4.1 Mekanik

- **Position**: centrerad horisontellt och vertikalt i viewport.
- **Marginal mot ytterkant**: minst 48px på alla sidor (`var(--space-12)`), oavsett viewport-storlek. Ingen kant får nudda ytterkanten.
- **Backdrop**: mörk semitransparent overlay (`rgba(0,0,0,0.5)`) + `backdrop-filter: blur(12px)`. Sidan bakom är fortfarande synlig men defocused.
- **Kort-stil**: panelen har `background: var(--bg-panel)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-xl)` (22px, squircle), stark elevated shadow.
- **Render-mekanism**: React Portal på `document.body`. Panelen renderas utanför normal layout så den aldrig påverkas av föräldrarkens overflow.

### 4.2 Dimensioner & resize

- **Default-bredd**: 720px.
- **Min-bredd**: 560px.
- **Max-bredd**: `min(90vw, 1100px)`.
- **Default-höjd**: 80vh.
- **Min-höjd**: 480px.
- **Max-höjd**: `calc(100vh - 96px)` (96 = 2x marginal).
- **Resize-handles**: horisontella (vänster + höger kant) + vertikala (topp + botten) + hörn. Cursor-feedback: `ew-resize`, `ns-resize`, `nwse-resize`.
- **Spara dimensioner**: senast valda bredd och höjd persisteras i `localStorage` under nyckeln `personaPanel.dimensions`. Återställs vid nästa öppning. Reset via ⋯-meny → "Återställ panelstorlek".

### 4.3 Header (inuti panelen)

Minimalistisk, 48px hög:

```
┌───────────────────────────────────────────┐
│  ↗ Expand    •                      ⋯  ×  │
```

- **↗ Expand**: togglar fullskärmsläge (se 4.5). När fullskärm: ikonen blir "↙ Collapse".
- **•** (mitt-indikator): subtil prick som blinkar när det finns osparade ändringar i create-läge. I edit-läge (auto-save) visar istället "Sparat 2s sedan" i dämpad text efter save.
- **⋯-meny**: `Klona`, `Arkivera`, `Återställ panelstorlek`, `Visa/Dölj prompt-preview`.
- **× Stäng**: stänger panelen. I create-läge med osparad data → varningsmodal.

### 4.4 Stängning

- **Klick utanför panelen (backdrop)**: stänger. Varning om osparat (create-läge).
- **Esc-tangent**: stänger. Samma varning.
- **× i header**: stänger. Samma varning.
- **Efter spara**: panelen stannar öppen — "Sparad" feedback, användaren kan fortsätta editera eller stänga själv.

### 4.5 Fullskärmsläge

Klick på ↗-ikon transformerar panelen:

- Animerat: 200ms spring till `width: calc(100vw - 96px), height: calc(100vh - 96px)` (fortfarande samma marginal).
- Backdrop försvinner — sidan bakom göms (sätter `display: none` på main layout).
- ↗-ikonen blir ↙. Andra gången togglas tillbaka.
- URL ändras **inte** (fullskärm är ett vy-läge, inte ny route).

### 4.6 Animation in/out

- **In**: backdrop fade 150ms + panel scale från 0.96 → 1.0 + fade, spring physics, 240ms total.
- **Ut**: omvänd, 180ms, snabbare.
- Använder Framer Motion (redan i projektet).

## 5. Panel-innehåll — sektionsstruktur

Accordion-mönster (beslut 3a). Alla sektioner syns som kollapsbara listor. Användaren fäller ut det hen jobbar med. I create-läget är sektion 1 (Grundinfo) utfälld by default; resten kollapsade.

### 5.1 Sektioner — ordning och innehåll

| # | Sektion | Innehåll | Default-läge |
|---|---|---|---|
| 1 | **Grundinfo** | Namn, Titel, Företag, Bransch, Företagsstorlek, Humör idag, Kommunikationsstil | Expanderad |
| 2 | **Personlighet & beteende** | `Personlighet` (kort textarea), `Beteende — strukturerat` (4 delfält: "Hur du svarar", "Vad du vill veta", "Vad triggar dig negativt", "Dolda motiv/mandat"), `Avancerat (fritext)` (textarea). Plus en knapp `✦ Generera resten med AI`. | Expanderad i create, kollapsad i edit |
| 3 | **AI-genererat innehåll** | Nuvarande lösning, Pain points (3-5 som redigerbara pillar), Typiska invändningar (3-5). Visas först efter AI-expansion körts. I create: stängd tills AI:n körts. | Kollapsad |
| 4 | **Dolda motiv** | Lista med 0-5 motiv. Varje motiv = ett subkort med 3 textfält: `Hemligt faktum`, `Trigger-villkor`, `Hur det läcker`. `+ Lägg till motiv`. Rullgardin per motiv: radera. | Kollapsad |
| 5 | **Svårighetsgrader** | 4 accordion-underrubriker (`Enkel`, `Medel`, `Svår`, `Expert`). Varje visar global baseline-text (read-only, grå) + en textarea `Extra för denna persona` (adderas på). Räknare "X / 2000 tecken". | Kollapsad |
| 6 | **Testa personan** | Inline chat-fönster. Visas längst ner. Knapp `✦ Testa med nuvarande inställningar` — användaren skriver ett säljar-meddelande, AI svarar som personan. Rensas när panelen stängs. | Kollapsad — öppnas explicit |
| 7 | **Prompt-preview** | Toggle-knapp `Visa prompt som skickas till AI` → expanderar en kod-ruta inline med den färdigkomponerade system-prompten. Syntax-highlighting (enkel, monospace). Val av svårighetsgrad via dropdown i ruta-huvudet. | Kollapsad |

### 5.2 Sektions-design

Varje sektion har:
- En header-rad: ikon + titel + chevron (▶/▼) + ev. status ("0/5 motiv").
- Hover-effekt: subtil bakgrund (`var(--bg-card-hover)`).
- Klick på raden togglar expanderad/kollapsad.
- Expandering = smooth height-animation, 200ms.

### 5.3 Fält-UI inom sektionerna

Regel (beslut 9b):
- **Korta fält** (namn, titel, humör, kommunikationsstil, företagsstorlek) = Notion-property-stil: inline rad med `Etikett` till vänster (dämpad, 120px bred) och värde till höger (full bredd, redigerbar när man klickar).
- **Långa textareor** (personlighet, beteendeinstruktioner, svårighetsgrad-overrides, hemliga motiv) = traditionell label ovanför, textarea under, räknare nedre-höger.
- **Listor** (painpoints, invändningar, motiv) = redigerbara pillar/chips med `×` för ta bort och `+` i slutet för lägg till.

### 5.4 Validering — visuell behandling

- Fel på fält = röd subtil border (`var(--error)`), felmeddelande under fältet i rött.
- Räknare blir röd när användaren överskrider maxlängd.
- Spara-knapp är **disabled** om några fel finns.

## 6. AI-expansion — interaktion

Beslut: manuell knapp (3b).

- Placerad i sektion 2 (Personlighet & beteende), nedanför delfälten.
- Innan: `✦ Generera resten med AI` — accent-primär, disabled tills de obligatoriska fälten (namn, titel, bransch, personlighet) är ifyllda.
- Klick → knappen blir loading med skeletal shimmer ("Genererar…"). 3-8 sekunder typiskt.
- När klart: sektion 3 (AI-genererat innehåll) auto-expanderar och scrollar in i fokus. Subtil accent-glow runt sektionen i 2 sekunder.
- Användaren kan redigera allt AI:n genererat. Knapp `✦ Generera om` blir synlig för att köra igen med nya instruktioner.

## 7. Testa personan — interaktion

Beslut: inline längst ner i formuläret (3c).

- Sektion 6 har en enkel chat-layout: buyer-bubblor vänster (med persona-initial i avatar), seller-bubblor höger.
- Input-fält nederst: "Skriv som säljare…" + dropdown för svårighetsgrad (valfri, defaultar till `Medel`).
- Varje skickat meddelande triggar `testPersonaResponse` server action (enligt produkt-PRD 7). Loading: skeleton buyer-bubbla med shimmer.
- Rensa-knapp: "Börja om".
- Chat-historik **sparas inte** i DB — försvinner vid panel-stängning.
- Viktigt: test-läget använder **nuvarande utkast-värden i formuläret**, inte senast sparade värden. Detta ger användaren förhandsvisning av osparade ändringar.

## 8. Prompt-preview — interaktion

Beslut: best-practice — **toggle inline kod-ruta** (3d, alternativ b).

- Sektion 7 har en expand-toggle. Stängd som default.
- När öppen: en monospace-ruta (`font-family: var(--font-mono)`, ljusgrå text på `var(--bg-input)`, radii `var(--radius-md)`).
- Rutan visar den **exakta** prompten för nuvarande utkast + vald svårighetsgrad.
- Två knappar ovanpå: dropdown för svårighetsgrad + `Kopiera prompt`.
- Live-uppdatering: när användaren ändrar ett fält i formuläret, uppdateras prompten inom 300ms (debounce).

## 9. Spara-mekanik (beslut 4a: hybrid)

### 9.1 Create-läge

- Explicit `Spara persona` primärknapp längst ner i panelen (sticky footer).
- Bredvid: `Avbryt` (sekundärknapp — samma som stäng-X).
- Knappen disabled tills minsta obligatoriska (namn, titel, bransch, personlighet) är ifyllda.
- Vid klick: validering → om ok → `createPersona` → toast "Anna Lindström skapad" → panelen byter till edit-läge för den nya personan.

### 9.2 Edit-läge

- Ingen spara-knapp. Auto-save sker på field-blur (när användaren lämnar fältet).
- Status-indikator i header: `Sparar…` (under skrivning), `Sparat 2s sedan` (idle), `Ej sparat — fel` (vid serverfel, retry-knapp).
- Debounce: 800ms efter sista knapptryck, förutom på blur där det är omedelbart.

### 9.3 Osparade ändringar (create)

Backdrop-klick / Esc / × med osparade fält:

```
  Varning
  Du har osparade ändringar.
  [Avbryt]    [Släng utkast]
```

Valet "Släng utkast" stänger panelen, ingenting sparas.

## 10. Starta rollspel från panelen (beslut 6a)

Överst i panelen, direkt under headern och ovanför sektion 1, en action-rad:

```
┌───────────────────────────────────────────┐
│  Mötestyp: [Möte 1 ▾]   Svårighet: [Medel ▾]      [✦ Starta rollspel]  │
└───────────────────────────────────────────┘
```

- `[✦ Starta rollspel]` är primär-accent.
- Klick → kallar `startPracticeSession("roleplay")` + `startRoleplay(...)` → `router.push('/roleplay/{id}')`. Samma kod-path som idag, bara från ny plats.
- Knappen är **disabled** i create-läget tills personan är sparad första gången (inte meningsfullt att starta ett rollspel med en persona som inte finns i DB).

## 11. Arkivering

### 11.1 Arkivera-flöde

- Från ⋯-menyn i header ELLER från persona-kortets ⋯-meny i listvyn.
- Bekräftelse-modal: `Arkivera Anna Lindström? Befintliga rollspel påverkas inte. Personan försvinner ur listor och kan inte längre användas för nya rollspel.`
- Knappar: `Avbryt` (grå), `Arkivera` (röd subtil).
- Efter arkivering: panelen stängs, kortet försvinner från listan med fade-out.

### 11.2 Arkiverade syns inte

Beslut 7b: inget UI för att se/återställa arkiverade i detta bygge. `restorePersona`-actionen finns bara på backend.

## 12. Keyboard shortcuts

Inom panelen:

| Tangent | Beteende |
|---|---|
| `Esc` | Stäng panelen |
| `⌘/Ctrl + S` | Tvinga save i create-läge (som att klicka Spara) |
| `⌘/Ctrl + Enter` | Spara + stäng (create-läge) |
| `⌘/Ctrl + ↵` i test-chat | Skicka meddelande |
| `⌘/Ctrl + K` (framtid) | Öppna kommando-palett — not in scope |

Listvy:

| Tangent | Beteende |
|---|---|
| `n` | Öppna Ny persona-panel |
| `/` | (Framtida sök) — not in scope |

## 13. Responsiv / mobil

- **≥1024px**: fulla layouten enligt ovan.
- **768-1023px**: panelen tar `calc(100vw - 48px)`, marginalen minskar till 24px, default-höjd blir `calc(100vh - 48px)`.
- **<768px**: panelen blir **full-takeover** — täcker hela viewport utan marginal, slides in från botten med 240ms spring. Backdrop försvinner. Detta är den enda avvikelsen från "aldrig nudda kanten"-regeln — nödvändigt för användbarhet på mobil.
- Accordion-sektioner stackas naturligt. Sticky footer (Spara-knapp) fungerar oavsett.

Detta är "best practice" för centrerade modaler på mobil enligt Material och Apple HIG.

## 14. Rörelse & motion-principer

- **Panel-öppning**: 240ms spring, stiffness 200, damping 28.
- **Sektion-expansion**: 200ms ease-out, height + opacity.
- **AI-expansion loading**: skeleton shimmer över sektion 3 medan den genererar.
- **Toast**: slide in från botten, 180ms, auto-dismiss efter 3s.
- **Save-indikator**: opacity pulse när "Sparar…".
- All animation respekterar `prefers-reduced-motion`: ersätts med snabba fade-övergångar utan physics.

## 15. Färg & token-användning (befintligt system)

Inga nya tokens införs. Återanvändning:

| Syfte | Token |
|---|---|
| Panel-bakgrund | `var(--bg-panel)` |
| Kort i listvy | `var(--bg-card)` |
| Input-bakgrund | `var(--bg-input)` |
| Panel-border | `var(--border-default)` |
| Sektion-hover | `var(--bg-card-hover)` |
| Primär accent | `var(--accent)` |
| Accent glow | `var(--shadow-glow)` |
| Textareas | samma som `.card`-klassen |
| Radii | `var(--radius-xl)` på panel, `var(--radius-md)` på inputs, `var(--radius-sm)` på pills |

## 16. Komponenthierarki — vad som måste byggas

Förslag på nya filer (implementation kommer senare; detta är för planering):

| Fil | Typ | Syfte |
|---|---|---|
| `src/app/(shell)/personas/page.tsx` | RSC | Listvy |
| `src/app/(shell)/personas/[id]/page.tsx` | RSC | Deep-link till specifik persona, renderar listvyn med panel förvald |
| `src/components/personas/personas-list-client.tsx` | Client | Filter + grid + persona-kort |
| `src/components/personas/persona-card.tsx` | Client | Enskilt kort |
| `src/components/personas/persona-panel.tsx` | Client | Den centrerade panelen — orchestrator |
| `src/components/personas/panel-shell.tsx` | Client | Generisk centrerad-panel-wrapper (Portal, backdrop, resize, fullscreen, Esc, dimensions-persistens). Kan återanvändas för andra features framöver. |
| `src/components/personas/sections/*.tsx` | Client | Varje accordion-sektion som egen komponent |
| `src/components/personas/test-chat.tsx` | Client | Test-chat-komponent |
| `src/components/personas/prompt-preview.tsx` | Client | Preview-komponent |
| `src/components/personas/hidden-motives-editor.tsx` | Client | Redigerare för dolda motiv |
| `src/components/personas/difficulty-overrides-editor.tsx` | Client | Redigerare för svårighetsgrad-overrides |

`panel-shell` är medvetet generisk — den kan användas för andra sidopanel-flöden senare (t.ex. redigera moduler, redigera tekniker).

## 17. Genomslag på befintliga filer

| Fil | Ändring |
|---|---|
| `src/components/nav/*` | Lägg till menyval "Personas" med länk till `/personas` |
| `src/app/(shell)/roleplay/page.tsx` | Behåller nuvarande flöde men kan få en länk "Hantera personas" som öppnar `/personas` |
| `src/components/roleplay/roleplay-setup-client.tsx` | Lägg till link/banner när listan är tom: "Du har inga personas än → Skapa en" istället för tom grid |

## 18. Tillgänglighet

- Panel fångar fokus (focus trap). Fokus återgår till triggerelementet vid stängning.
- Alla interaktiva element har `aria-label` där text saknas (t.ex. ⋯-knapp, ×-knapp, resize-handles).
- Accordion-sektioner använder `<button aria-expanded>` + `aria-controls`.
- Kontrastförhållanden ska klara WCAG AA (det gör nuvarande tokens redan).
- Resize-handles kan navigeras med tangentbord via `role="separator"` + pil-tangenter (framtida förfining, inte v1-blocker).

## 19. Ut-scope i denna iteration (explicit)

Inte byggt i denna leverans:
- Team-delningens faktiska flöde (backend-fält finns, ingen UI).
- Sök/filter-textfält.
- Återställ-arkiverade-UI.
- Avatar-uppladdning (preset-initial används).
- Import/export.
- Roll-baserad låsning av defaults.
- Kommando-palett.

## 20. Öppna frågor

Inga vid godkännande. All ambiguitet adresserad genom frågeomgångarna.

---

**Väntar på:** godkännande → implementation enligt produkt-PRD + UX-PRD.
