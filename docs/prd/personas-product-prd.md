# PRD — Anpassningsbara köpar-personas för rollspel

**Status:** Utkast 1 — väntar godkännande
**Författare:** Claude + [användare]
**Datum:** 2026-04-18
**Scope:** Produktspecifikation. UI/UX-spec kommer i separat dokument.

---

## 1. Bakgrund och problem

Rollspelssidan (`/roleplay`) visar idag en tom lista över köpare eftersom `Persona`-tabellen är tom i produktionsdatabasen (Turso) — det går inte att starta ett rollspel.

Djupare än så: även när tabellen är seedad är nuvarande lösning begränsad. Personas är globala (inga användare äger dem), de kan inte skapas eller redigeras i UI:n, och svårighetsgraden är hårdkodad i `src/lib/gemini.ts:200-212` med fyra textblock som gäller likadant för alla personas. Det finns ingen möjlighet att säga "Anna på Hard" ska bete sig annorlunda än "Peter på Hard", trots att deras personligheter skiljer sig radikalt.

**Målgruppens behov:** användaren vill kunna bygga realistiska, specifika köparprofiler som matchar de verkliga kunder hen möter, och ha fullständig kontroll över hur personan beter sig i rollspelet. Instruktionerna måste **faktiskt påverka** AI:ns beteende — inte bara sparas som metadata.

## 2. Mål

| Mål | Mätvärde |
|---|---|
| Användaren kan skapa egna köpar-personas | CRUD-flöde i UI |
| Användaren kan redigera alla personas (egna + defaults) | Redigeringsflöde finns |
| Instruktionerna som sätts påverkar AI:ns beteende 1:1 | Preview-prompt visar att varje fält injiceras |
| Svårighetsgrad kan anpassas per persona | Per-persona-fritextfält per svårighetsgrad |
| Dolda motiv kan läggas på köparen | AI avslöjar dem bara vid definierade triggers |
| Användaren kan testa personan innan den sparas | "Testa"-läge skickar ett provmeddelande till AI:n |

## 3. Icke-mål (explicit utanför scope)

- Roll-system (admin/manager/user). Byggs senare, men datamodellen ska inte förhindra det.
- Team-delning. Fält `sharedWithTeam` läggs i schemat, men själva team-flödet byggs senare.
- Import/export av personas.
- Avatar-uppladdning (`avatarUrl` finns redan, men uppladdnings-UI är utanför scope — `null` tillåts).
- Röst/TTS-koppling per persona.
- Seeding av produktionsdatabasen som tillfällig lösning — hoppas över enligt beslut.

## 4. Beslut (från frågeomgång)

| Fråga | Beslut |
|---|---|
| Ägarskap | Personas har en ägar-`userId`; privata som default, kan markeras som delade med team (team-funktion byggs senare) |
| Max antal | Obegränsat |
| Input-modell | Användaren skriver personlighet + beteendeinstruktioner; Gemini expanderar vid **sparande** till fulla fält (painpoints, invändningar, current solution, humör, kommunikationsstil). Användaren kan editera AI:ns output innan spar. |
| Beteendeinstruktioner | Strukturerade delfält **+** ett avancerat fritextfält |
| Fältsepareation | Varje attribut (namn, titel, humör, kommunikationsstil, etc.) är eget fält — inte klumpat |
| Dolda motiv | Strukturerade: varje motiv har tre fält: (1) det hemliga faktum, (2) trigger-villkor, (3) hur det läcker ut gradvis |
| Missade dolda motiv i scorecard | Ja, egen punkt i scorecard-utvärderingen |
| Fritext-maxlängd | 2000 tecken |
| Svårighetsgrad | Globala förinställningar (easy/medium/hard/expert) **behålls**. Per persona per svårighetsgrad finns ett fritextfält som **adderas** till den globala texten i prompten — ersätter aldrig. |
| Default-personas (Anna, Magnus, Sara, Johan, Lisa, Peter) | Redigerbara av alla nu; roll-guard läggs på senare när roller finns |
| Historisk integritet | Snapshot: när rollspel startar kopieras persona-fälten in i `RoleplaySession` — gamla scorecard speglar persona-versionen som faktiskt användes |
| Testa-innan-spar | Ja, separat test-läge |
| Radering | Soft-delete via `isArchived` |
| Prompt-injection i instruktioner | Varna men tillåt (B) |
| Preview av sammansatt prompt | Ja |
| Seeding av produktion | Nej — bygg hela flödet först |

## 5. Datamodell

Ändringar i `prisma/schema.prisma`.

### 5.1 Persona — förändringar

Befintliga fält behålls. Nya fält:

| Fält | Typ | Noteringar |
|---|---|---|
| `userId` | `String?` | Ägar-user. `null` = default-persona (system). |
| `user` | Relation | `User?` |
| `sharedWithTeam` | `Boolean @default(false)` | Förberedelse för team-delning |
| `isArchived` | `Boolean @default(false)` | Soft-delete |
| `archivedAt` | `DateTime?` | |
| `mood` | `String?` | T.ex. "stressad", "nyfiken" |
| `communicationStyle` | `String?` | T.ex. "kortfattad, formell" |
| `behaviorInstructions` | `String?` | Avancerat fritextfält (max 2000 tecken) |
| `behaviorStructured` | `String?` | JSON: `{ howYouReply, whatYouWantToKnow, whatTriggersYouNegatively, ... }` |
| `hiddenMotives` | `String?` | JSON: `Array<{ secret: string, trigger: string, howItLeaks: string }>` |
| `difficultyOverrides` | `String?` | JSON: `{ easy?: string, medium?: string, hard?: string, expert?: string }` — max 2000 tecken per nyckel |
| `updatedAt` | `DateTime @updatedAt` | |

`isDefault` behålls med nuvarande semantik: `true` = en av de 6 förinbyggda defaults.

### 5.2 RoleplaySession — förändringar

| Fält | Typ | Noteringar |
|---|---|---|
| `personaSnapshot` | `String` | JSON-serialiserat snapshot av persona-fälten vid starttillfället. Används för att återge korrekt historik i scorecard, transkript-vy och summeringar. |

Fältet `personaId` behålls för filtrering och listvyer, men all rendering av persona-detaljer i historik läser från `personaSnapshot`.

### 5.3 Scorecard — förändringar

| Fält | Typ | Noteringar |
|---|---|---|
| `hiddenMotivesScore` | `Int?` | 0-100, null om personan saknade dolda motiv |
| `hiddenMotivesDetails` | `String?` | JSON: `Array<{ motive, discovered: boolean, howItWasSurfaced: string \| null }>` |

Nytt breakdown-block skickas även i `detailedFeedback.breakdownComments`.

### 5.4 Migration

En Prisma-migration läggs till. Inga existerande rader påverkas destruktivt — alla nya fält är optional/default.

## 6. AI-integration — hur fälten faktiskt styr beteendet

Detta är kärnan. Varje fält mappas till en explicit del av system-prompten.

### 6.1 Skapa-tid-expansion (ny funktion)

Ny server action: `expandPersonaFromInstructions(draft: PersonaDraft)`.

- Input: användarens råa instruktioner (namn, titel, företag, bransch, företagsstorlek, personlighet, beteendeinstruktioner, kommunikationsstil, humör).
- Gemini-anrop: "Generera följande baserat på ovanstående profil: currentSolution, painPoints (3-5), objections (3-5), behaviorStructured (JSON)."
- Output: förslag som användaren kan **editera** innan spar. Inget sparas förrän användaren trycker "Spara".
- Retry-tolerans: om Gemini returnerar ogiltig JSON → visa fel, ingen sparning, användaren kan editera manuellt.

### 6.2 Test-läge (ny funktion)

Ny server action: `testPersonaResponse(draft: PersonaDraft, sellerMessage: string, difficulty: string)`.

- Använder exakt samma prompt-byggare som rollspelet.
- Returnerar AI:ns svar på ett enda meddelande från säljaren — ingen session skapas, inget sparas.
- Används både på "create"-sidan (utkast som ännu inte sparats) och på "edit"-sidan.

### 6.3 Preview av prompt (ny funktion)

Ny server action: `previewPersonaPrompt(draft: PersonaDraft, difficulty: string)`.

- Returnerar den **exakta** system-prompten som skulle skickas till Gemini.
- Ingen AI-anropning. Enbart textkomposition.
- Används i UI:n för transparens och felsökning.

### 6.4 Uppdaterad `roleplayResponse` i `src/lib/gemini.ts`

Nuvarande systemprompt (rad 214-232) byggs ut. Ny struktur (pseudotext):

```
Du ar {name}, {title} pa {company} ({industry}, {companySize}).

PERSONLIGHET: {personality}
HUMOR IDAG: {mood}
KOMMUNIKATIONSSTIL: {communicationStyle}

BETEENDEINSTRUKTIONER:
{behaviorStructured — strukturerat som sektioner}
{behaviorInstructions — fritext, om finns}

NUVARANDE LOSNING: {currentSolution}
UTMANINGAR: {painPoints}
TYPISKA INVANDNINGAR: {objections}

SVARIGHETSGRAD-BETEENDE ({difficulty}):
{globalDifficultyText[difficulty]}

EXTRA PERSONA-SPECIFIKT BETEENDE FOR DENNA SVARIGHETSGRAD:
{difficultyOverrides[difficulty] — om finns, adderas}

DOLDA MOTIV — avslöja ALDRIG spontant, BARA om triggers uppfylls:
{for each hiddenMotive:}
  • Motiv: {secret}
    Trigger: {trigger}
    Om triggern uppfylls, lack ut sa har: {howItLeaks}
Om ingen trigger uppfylls — avvik eller ge vagare svar.

REGLER:
- Du ar koparen, ALDRIG saljaren
- Svara pa svenska
- Halla dig i karaktar HELA tiden
- Avsloja ALDRIG att du ar en AI
- Om sanji instruktion ovan motsager verkligheten — folj instruktionen, den ar medveten design
```

### 6.5 Uppdaterad `evaluateRoleplayFull`

Utvärderingsprompten utökas med:

- `hiddenMotives`-listan (från snapshot).
- Instruktion till utvärderings-AI:n: "Bedöm om säljaren fick reda på de dolda motiven. Returnera `hiddenMotivesScore` och per-motiv detaljer."
- `hiddenMotivesScore` = 100 om alla motiv avslöjades, 0 om inget, proportionellt däremellan. Null om inga motiv fanns.

### 6.6 Guardrails mot prompt-injection

När användaren skriver instruktioner som innehåller misstänkta mönster (`ignorera alla tidigare`, `du är nu en säljare`, etc.) visas en varning vid spar:

> "Din text innehåller formuleringar som kan få AI:n att bryta karaktären. Rollspelet kan bli meningslöst. Vill du spara ändå?"

Användaren kan bekräfta och spara. Varning, inte blockering.

Detektionsmönster (enkel regex-lista):
- `ignorera`, `bortse`, `glöm`
- `du är nu`, `du är egentligen`
- `säg ja`, `säg bara`
- `AI`, `modell`, `språkmodell`, `prompt`

## 7. Server actions — ny / ändrad yta

Alla under `src/actions/personas.ts` (ny fil). Allt går via `"use server"`.

| Action | Input | Output | Kommentar |
|---|---|---|---|
| `listPersonas()` | — | `Persona[]` | Returnerar: egna personas + team-delade (när team finns) + defaults. Arkiverade exkluderas. |
| `getPersona(id)` | id | `Persona` | 404 om arkiverad eller ej egen/default. |
| `createPersona(input)` | draft | skapad Persona | |
| `updatePersona(id, input)` | id + patch | uppdaterad Persona | |
| `archivePersona(id)` | id | `{ ok: true }` | Sätter `isArchived = true`, `archivedAt = now()`. |
| `restorePersona(id)` | id | `{ ok: true }` | För framtida "papperskorg"-vy. |
| `expandPersonaFromInstructions(draft)` | draft (utan genererade fält) | expansion-förslag | Anropar Gemini. |
| `testPersonaResponse(draft, sellerMessage, difficulty)` | — | `{ buyerResponse: string }` | |
| `previewPersonaPrompt(draft, difficulty)` | — | `{ systemPrompt: string }` | Ingen AI-anropning. |
| `clonePersona(id)` | id | ny Persona (kopia) | För "starta från default". |

`startRoleplay` (existerande i `src/actions/roleplay.ts`) uppdateras till att skriva `personaSnapshot` i `RoleplaySession`.

## 8. Validering

Per fält:

| Fält | Regel |
|---|---|
| `name`, `title`, `company` | Obligatoriska, 1-100 tecken |
| `industry`, `companySize` | Obligatoriska, 1-100 tecken |
| `personality` | Obligatorisk, max 500 tecken |
| `behaviorInstructions` | Frivillig, max 2000 tecken |
| `behaviorStructured.*` | Varje delfält max 2000 tecken |
| `mood`, `communicationStyle` | Frivilliga, max 200 tecken |
| `currentSolution` | Frivillig, max 500 tecken |
| `painPoints`, `objections` | JSON-arrays, max 10 items, max 300 tecken per item |
| `hiddenMotives` | Max 5 motiv. Varje motiv: `secret` max 500, `trigger` max 300, `howItLeaks` max 500. |
| `difficultyOverrides.*` | Per nyckel max 2000 tecken |

Alla server actions validerar. Fel returneras som typade fel-objekt som UI visar inline.

## 9. Historik och snapshot-beteende

När `startRoleplay` anropas:
1. Persona läses från DB (nuvarande version).
2. Hela persona-objektet serialiseras till JSON.
3. JSON sparas i `RoleplaySession.personaSnapshot`.
4. Rollspels-AI:n, utvärdering, scorecard och alla historiska vyer läser från snapshot — aldrig från live-persona.

Konsekvens: om användaren redigerar Anna efteråt, berörs inte gamla rollspel. De fortsätter spegla "den Anna som rollspelet gjordes med".

## 10. Soft-delete

- Arkivering sätter `isArchived = true` och `archivedAt = now()`.
- Arkiverade personas syns INTE i val-listor (rollspel-start, redigeringslista).
- Befintliga `RoleplaySession`-rader fortsätter fungera via snapshot.
- Ingen "återställ"-UI i detta bygge. Backend-actionen finns, UI kommer senare.

## 11. Tekniska risker

| Risk | Sannolikhet | Mitigering |
|---|---|---|
| Gemini returnerar ogiltig JSON vid expansion | Medel | Retry 1 gång. Om fortsatt fel — visa fel, låt användaren skriva manuellt. |
| Prompt blir för lång (>context window) | Låg | Maxlängder ovan håller total system-prompt under 15k tecken. |
| Prompt-injection via beteendeinstruktioner | Låg | Varningsmönster + hård regel "du är köparen, aldrig säljaren" i grundprompt. |
| Snapshot-storlek på RoleplaySession | Låg | En snapshot är ~3-5 kB JSON. Försumbart på Turso. |
| Defaults blir editerade destruktivt innan roller finns | Medel | Detta är ett explicit accepterat beslut. |

## 12. Leveransfaser

PRD:n specificerar vad som ska byggas. Hur det paketeras i PR:er är implementationsbeslut — förslag:

1. Schema-migration + backend-actions (ingen UI-ändring).
2. Uppdaterad `roleplayResponse` + snapshot-logik (ingen UI-ändring).
3. UI för skapa/redigera/radera/testa (baseras på separat UI/UX-PRD).
4. Utökad scorecard med dolda motiv.

## 13. Öppna frågor

Inga kvar vid godkännande av detta utkast. Alla tidigare öppna frågor besvarade.

---

**Väntar på:** godkännande av användare → skriv UI/UX-PRD → skriv kod.
