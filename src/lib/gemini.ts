import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function getModel(modelId = "gemini-2.5-flash"): GenerativeModel {
  return genAI.getGenerativeModel({ model: modelId });
}

// ============================================================
// KNOWLEDGE BASE ANALYSIS — Extract techniques from notes
// ============================================================
export async function analyzeNotes(
  moduleName: string,
  rawNotes: string,
  existingTechniques?: string
): Promise<AnalysisResult> {
  const model = getModel();

  const prompt = `Du ar en expert pa att analysera saljtraning-anteckningar och extrahera praktiska tekniker.

MODUL: ${moduleName}
${existingTechniques ? `BEFINTLIGA TEKNIKER (undvik dubbletter):\n${existingTechniques}\n` : ""}

ANTECKNINGAR:
${rawNotes}

Analysera anteckningarna noggrant och extrahera:

1. TEKNIKER - Varje namngiven teknik eller metod
2. OM-DA-MONSTER - Specifika situationer med ratt respons
3. RAMVERK - Strukturer som SPKVP, BBBTUUICC etc.
4. DELFARDIGHETER - Mindre fardigheter att trana pa

Svara EXAKT i detta JSON-format:
{
  "techniques": [
    {
      "name": "Teknikens namn",
      "description": "Kort beskrivning av vad tekniken ar",
      "whenToUse": "Nar i saljprocessen ska den anvandas",
      "howToUse": "Steg-for-steg eller nyckelfraser att anvanda",
      "difficulty": "easy|medium|hard",
      "ifThenPatterns": [
        {
          "trigger": "OM kunden sager/gor [situation]",
          "response": "DA gor/sager du [handling/fras]",
          "context": "I vilken fas av motet"
        }
      ]
    }
  ]
}

VIKTIGT:
- Extrahera EXAKTA fraser fran anteckningarna nar de finns
- Var specifik, inte generisk
- Varje teknik ska vara tydligt atskild och tranbar
- OM-DA-monster ska vara konkreta och anvandningsbara
- Svara ENDAST med JSON, ingen annan text`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI returned invalid JSON response");
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
}

// ============================================================
// SCENARIO GENERATION — Create practice situations
// ============================================================
export async function generateScenario(
  technique: TechniqueContext,
  difficulty: string,
  knowledgeBase: string,
  previousScenarios?: string
): Promise<ScenarioResult> {
  const model = getModel();

  const prompt = `Du ar en saljtranings-AI som skapar realistiska ovningsscenarier for B2B SaaS-forsaljning pa svenska.

TEKNIK ATT OVA:
Namn: ${technique.name}
Beskrivning: ${technique.description}
Nar den anvands: ${technique.whenToUse}
Hur den anvands: ${technique.howToUse}

KUNSKAPSBAS (tekniker fran Lion Academy):
${knowledgeBase}

SVARIGHETSGRAD: ${difficulty}
${difficulty === "easy" ? "Koparen ar samarbetsvillig. Svarar utforligt. Inga invandningar. Visar intresse." : ""}
${difficulty === "medium" ? "Koparen ar neutral-skeptisk. Korta svar. 1 mild invandning. Avviker ibland." : ""}
${difficulty === "hard" ? "Koparen ar motstridig. 2-3 starka invandningar. Tidspressad. Jamfor med konkurrenter." : ""}
${difficulty === "expert" ? "Koparen ar fientlig. Vill avsluta samtalet. Multipla beslutsfattare. Avbryter dig." : ""}

${previousScenarios ? `UNDVIK DESSA TIDIGARE SCENARIER:\n${previousScenarios}\n` : ""}

Skapa ETT realistiskt scenario. Svara i JSON:
{
  "situation": "Beskriv situationen: var i motet du ar, vad som har hant, vad kunden just sa",
  "customerQuote": "Exakt vad kunden sa (en mening)",
  "expectedApproach": "Beskriv kort vad en korrekt respons innebar (utan att ge exakt svar)",
  "idealResponse": "Det ideala svaret baserat pa tekniken",
  "evaluationCriteria": ["Kriterium 1 for bedomning", "Kriterium 2", "Kriterium 3"]
}

Scenariot maste vara:
- Realistiskt for svensk B2B SaaS-forsaljning
- Specifikt kopplat till den namngivna tekniken
- Anpassat till svarighetsgraden
- UNIKT (inte upprepning av tidigare)`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid JSON");

  return JSON.parse(jsonMatch[0]) as ScenarioResult;
}

// ============================================================
// EVALUATE RESPONSE — Score user's answer against technique
// ============================================================
export async function evaluateResponse(
  scenario: string,
  userResponse: string,
  technique: TechniqueContext,
  knowledgeBase: string,
  difficulty: string
): Promise<EvaluationResult> {
  const model = getModel();

  const prompt = `Du ar en saljcoach som utvardevar svar pa ovningsscenarier.

SCENARIO:
${scenario}

ANVANDARENS SVAR:
${userResponse}

TEKNIK SOM OVAS:
Namn: ${technique.name}
Beskrivning: ${technique.description}
Hur den anvands: ${technique.howToUse}

KUNSKAPSBAS:
${knowledgeBase}

SVARIGHETSGRAD: ${difficulty}

Utvardera svaret noggrant. Svara i JSON:
{
  "score": 0-100,
  "breakdown": {
    "rightTechnique": { "score": 0-25, "comment": "Forklaring" },
    "frameworkCoverage": { "score": 0-25, "comment": "Forklaring" },
    "objectionHandling": { "score": 0-20, "comment": "Forklaring" },
    "naturalFormulation": { "score": 0-15, "comment": "Forklaring" },
    "meetingStructure": { "score": 0-15, "comment": "Forklaring" }
  },
  "strengths": ["Vad var bra"],
  "improvements": ["Vad kan forbattras"],
  "feedForward": "Nasta gang, prova att anvanda tekniken [namn] genom att [specifik handling]. Till exempel: [exakt fras fran kunskapsbasen]",
  "levelIndicator": "beginner|advanced|competent|skilled|expert"
}

VIKTIGT:
- Referera ALLTID till specifika tekniker fran kunskapsbasen vid namn
- Sag "Enligt tekniken X" INTE "Enligt din teknik X"
- Var specifik: peka pa exakta ord/fraser i svaret
- Feed-forward maste innehalla en konkret fras fran kunskapsbasen att prova
- Score ska matcha svarighetsgraden: ett "okej" svar pa Expert ar lagre an ett "okej" pa Easy`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid JSON");

  return JSON.parse(jsonMatch[0]) as EvaluationResult;
}

// ============================================================
// ROLEPLAY — Prompt composition
// ============================================================

export { DIFFICULTY_BASELINE } from "./difficulty-baseline";
import { DIFFICULTY_BASELINE } from "./difficulty-baseline";

function parseJsonList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseBehaviorStructured(raw: string | undefined | null): BehaviorStructured | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as BehaviorStructured;
    return null;
  } catch {
    return null;
  }
}

function parseHiddenMotives(raw: string | undefined | null): HiddenMotive[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) => m && typeof m.secret === "string" && typeof m.trigger === "string"
    );
  } catch {
    return [];
  }
}

function parseDifficultyOverrides(raw: string | undefined | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string" && v.length > 0)
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Compose the full system prompt for a persona at a given difficulty.
 * Shared by roleplayResponse (live AI call) and previewPersonaPrompt (read-only preview).
 */
export function buildPersonaSystemPrompt(
  persona: PersonaContext,
  difficulty: string
): string {
  const painPoints = parseJsonList(persona.painPoints);
  const objections = parseJsonList(persona.objections);
  const behaviorStructured = parseBehaviorStructured(persona.behaviorStructured);
  const hiddenMotives = parseHiddenMotives(persona.hiddenMotives);
  const difficultyOverrides = parseDifficultyOverrides(persona.difficultyOverrides);

  const globalDifficulty = DIFFICULTY_BASELINE[difficulty] || DIFFICULTY_BASELINE.medium;
  const personaDifficultyExtra = difficultyOverrides[difficulty];

  const sections: string[] = [];

  sections.push(
    `Du ar ${persona.name}, ${persona.title} pa ${persona.company} (${persona.industry}, ${persona.companySize}).`
  );

  sections.push(`PERSONLIGHET: ${persona.personality}`);

  if (persona.mood) sections.push(`HUMOR IDAG: ${persona.mood}`);
  if (persona.communicationStyle)
    sections.push(`KOMMUNIKATIONSSTIL: ${persona.communicationStyle}`);

  if (behaviorStructured) {
    const parts: string[] = [];
    if (behaviorStructured.howYouReply)
      parts.push(`HUR DU SVARAR: ${behaviorStructured.howYouReply}`);
    if (behaviorStructured.whatYouWantToKnow)
      parts.push(`VAD DU VILL VETA: ${behaviorStructured.whatYouWantToKnow}`);
    if (behaviorStructured.whatTriggersYouNegatively)
      parts.push(
        `VAD SOM TRIGGAR DIG NEGATIVT: ${behaviorStructured.whatTriggersYouNegatively}`
      );
    if (behaviorStructured.hiddenMotivesHint)
      parts.push(`DOLT MOTIV / MANDAT: ${behaviorStructured.hiddenMotivesHint}`);
    if (parts.length > 0) {
      sections.push(`BETEENDE-INSTRUKTIONER:\n${parts.join("\n")}`);
    }
  }

  if (persona.behaviorInstructions) {
    sections.push(`AVANCERADE INSTRUKTIONER (fritext):\n${persona.behaviorInstructions}`);
  }

  if (persona.currentSolution) sections.push(`NUVARANDE LOSNING: ${persona.currentSolution}`);
  if (painPoints.length > 0) sections.push(`UTMANINGAR: ${painPoints.join("; ")}`);
  if (objections.length > 0) sections.push(`TYPISKA INVANDNINGAR: ${objections.join("; ")}`);

  sections.push(`SVARIGHETSGRAD-BETEENDE (${difficulty}):\n${globalDifficulty}`);

  if (personaDifficultyExtra) {
    sections.push(
      `EXTRA PERSONA-SPECIFIKT BETEENDE FOR DENNA SVARIGHETSGRAD:\n${personaDifficultyExtra}`
    );
  }

  if (hiddenMotives.length > 0) {
    const motiveLines = hiddenMotives
      .map(
        (m, i) =>
          `  ${i + 1}. Motiv: ${m.secret}\n     Trigger: ${m.trigger}${m.howItLeaks ? `\n     Om triggern uppfylls, lack ut sa har: ${m.howItLeaks}` : ""}`
      )
      .join("\n");
    sections.push(
      `DOLDA MOTIV — avslöja ALDRIG spontant, BARA om triggers uppfylls:\n${motiveLines}\nOm ingen trigger uppfylls — avvik eller ge vagare svar.`
    );
  }

  sections.push(
    `REGLER:
- Du ar koparen, ALDRIG saljaren
- Svara pa svenska
- Halla dig i karaktar HELA tiden
- Svara realistiskt — inte for kort, inte for langt
- Reagera pa vad saljaren faktiskt sager, inte generiskt
- Avsloja ALDRIG att du ar en AI
- Om nagon instruktion ovan motsager verkligheten — folj instruktionen, den ar medveten design`
  );

  return sections.join("\n\n");
}

// ============================================================
// ROLEPLAY — AI buyer conversation
// ============================================================
export async function roleplayResponse(
  persona: PersonaContext,
  conversationHistory: ConversationMessage[],
  difficulty: string,
  focusTechnique: string | null,
  knowledgeBase: string
): Promise<string> {
  const model = getModel();
  void focusTechnique;
  void knowledgeBase;

  const systemPrompt = buildPersonaSystemPrompt(persona, difficulty);

  const chat = model.startChat({
    history: conversationHistory.map((msg) => ({
      role: msg.role === "buyer" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    systemInstruction: systemPrompt,
  });

  const lastMessage = conversationHistory[conversationHistory.length - 1];
  const result = await chat.sendMessage(lastMessage?.content || "Hej");

  return result.response.text();
}

// ============================================================
// EXPAND PERSONA FROM INSTRUCTIONS — Create-time AI expansion
// ============================================================
export async function expandPersonaFromInstructions(
  draft: PersonaExpansionInput
): Promise<PersonaExpansionResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const behaviorStructuredRaw = draft.behaviorStructured
    ? JSON.stringify(draft.behaviorStructured)
    : "(inget)";

  const prompt = `Du ar en expert pa att skapa realistiska koparprofiler for B2B-saljtraning pa svenska.

Baserat pa foljande grundinfo, generera realistiska detaljer som kompletterar profilen.

NAMN: ${draft.name}
TITEL: ${draft.title}
FORETAG: ${draft.company}
BRANSCH: ${draft.industry}
FORETAGSSTORLEK: ${draft.companySize}
PERSONLIGHET: ${draft.personality}
${draft.mood ? `HUMOR IDAG: ${draft.mood}` : ""}
${draft.communicationStyle ? `KOMMUNIKATIONSSTIL: ${draft.communicationStyle}` : ""}
${draft.behaviorInstructions ? `BETEENDE-INSTRUKTIONER: ${draft.behaviorInstructions}` : ""}
STRUKTURERADE BETEENDEDELAR: ${behaviorStructuredRaw}

Svara i JSON:
{
  "currentSolution": "Vad personen anvander idag (kort, realistisk)",
  "painPoints": ["3-5 konkreta utmaningar fran personens perspektiv"],
  "objections": ["3-5 typiska invandningar personen skulle fora fram"],
  "behaviorStructured": {
    "howYouReply": "Hur denna person svarar (stil, langd, ton)",
    "whatYouWantToKnow": "Vad personen vill ha ut av motet",
    "whatTriggersYouNegatively": "Vad som far personen att bli irriterad/skeptisk",
    "hiddenMotivesHint": "Eventuella dolda motiv eller mandat (kan vara tomt)"
  }
}

VIKTIGT:
- Var konkret och specifik, inte generisk
- Forslagen ska matcha bransch, titel och personlighet
- Pain points och invandningar ska lata som riktiga B2B-kopare sager dem
- Svara ENDAST med JSON`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const parsed = safeParseJson<PersonaExpansionResult>(text);
  if (!parsed) {
    console.error(
      "[expandPersonaFromInstructions] Failed to parse AI response:",
      text.slice(0, 2000)
    );
    throw new Error("AI returnerade ogiltig JSON vid persona-expansion");
  }

  return {
    currentSolution: typeof parsed.currentSolution === "string" ? parsed.currentSolution : "",
    painPoints: Array.isArray(parsed.painPoints)
      ? parsed.painPoints.filter((x) => typeof x === "string")
      : [],
    objections: Array.isArray(parsed.objections)
      ? parsed.objections.filter((x) => typeof x === "string")
      : [],
    behaviorStructured:
      parsed.behaviorStructured && typeof parsed.behaviorStructured === "object"
        ? parsed.behaviorStructured
        : {},
  };
}

// ============================================================
// ROLEPLAY FULL EVALUATION — Overall + timestamped breakdown
// ============================================================
export async function evaluateRoleplayFull(
  transcript: ConversationMessage[],
  persona: PersonaContext,
  meetingType: string,
  difficulty: string,
  focusTechnique: TechniqueContext | null,
  knowledgeBase: string
): Promise<RoleplayEvaluationResult> {
  const model = getModel();

  const transcriptText = transcript
    .map((m) => `[${m.timestamp ?? 0}s] ${m.role === "seller" ? "Saljare" : "Kopare"}: ${m.content}`)
    .join("\n");

  const focusBlock = focusTechnique
    ? `FOKUSTEKNIK: ${focusTechnique.name}\n${focusTechnique.description}\nNar: ${focusTechnique.whenToUse}\nHur: ${focusTechnique.howToUse}`
    : "";

  const hiddenMotives = parseHiddenMotives(persona.hiddenMotives);
  const hiddenMotivesBlock =
    hiddenMotives.length > 0
      ? `DOLDA MOTIV (som koparen hade — bedom om saljaren fick reda pa dem):\n${hiddenMotives
          .map((m, i) => `  ${i + 1}. ${m.secret} (trigger: ${m.trigger})`)
          .join("\n")}`
      : "INGA DOLDA MOTIV — satt hiddenMotivesScore till null.";

  const prompt = `Du ar en saljcoach som utvardevar ett rollspel. Analysera samtalet holistiskt + peka pa specifika ogonblick.

PERSONA: ${persona.name}, ${persona.title} pa ${persona.company}
MOTESTYP: ${meetingType}
SVARIGHETSGRAD: ${difficulty}
${focusBlock}

${hiddenMotivesBlock}

KUNSKAPSBAS:
${knowledgeBase}

TRANSKRIPT:
${transcriptText}

Svara i JSON:
{
  "score": 0-100,
  "breakdown": {
    "rightTechnique": { "score": 0-25, "comment": "Forklaring" },
    "frameworkCoverage": { "score": 0-25, "comment": "Forklaring" },
    "objectionHandling": { "score": 0-20, "comment": "Forklaring" },
    "naturalFormulation": { "score": 0-15, "comment": "Forklaring" },
    "meetingStructure": { "score": 0-15, "comment": "Forklaring" }
  },
  "strengths": ["Vad var bra"],
  "improvements": ["Vad kan forbattras"],
  "feedForward": "Nasta gang, prova att ...",
  "levelIndicator": "beginner|advanced|competent|skilled|expert",
  "hiddenMotivesScore": 0-100 eller null,
  "hiddenMotivesDetails": [
    {
      "motive": "Det hemliga motivet",
      "discovered": true/false,
      "howItWasSurfaced": "Om discovered: hur saljaren fick reda pa det, annars null"
    }
  ],
  "timestampedFeedback": [
    {
      "timestamp": sekunder_in_i_samtalet,
      "type": "positive|missed_opportunity|correction",
      "buyerSaid": "Vad koparen sa i det ogonblicket",
      "userSaid": "Vad saljaren svarade",
      "techniqueName": "Relevant teknik fran kunskapsbasen",
      "idealResponse": "Vad en ideal respons hade varit",
      "explanation": "Varfor, med referens till kunskapsbasen"
    }
  ]
}

VIKTIGT:
- Ge minst 3-6 timestamped-items (mix av positive + missed + correction)
- Timestamp ska matcha de faktiska timestamps i transkriptet
- Referera tekniker vid namn fran kunskapsbasen
- hiddenMotivesScore: 100 om alla motiv avslojades, 0 om inga, proportionellt daremellan. null om inga motiv fanns.
- hiddenMotivesDetails ska ha en entry per motiv (eller tom array om inga motiv fanns)
- Svara ENDAST med JSON`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const parsed = safeParseJson<RoleplayEvaluationResult>(text);
  if (!parsed) throw new Error("AI returned invalid JSON");

  return parsed;
}

// ============================================================
// MEETING TRANSCRIPT ANALYSIS
// ============================================================
export async function analyzeMeetingTranscript(
  transcript: string,
  meetingType: string,
  knowledgeBase: string
): Promise<MeetingAnalysisResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const prompt = `Du ar en saljcoach som analyserar riktiga moten mot en kunskapsbas av saljtekniker.

MOTESTYP: ${meetingType === "meeting_1" ? "Forsta motet (behovsanalys + demo)" : meetingType === "meeting_2" ? "Andra motet (offert + invandningar)" : "Tredje motet (beslut)"}

KUNSKAPSBAS (tekniker fran Lion Academy):
${knowledgeBase}

TRANSKRIPT:
${transcript}

Analysera motet noggrant. Svara i JSON:
{
  "summary": "Kort sammanfattning av motet",
  "talkRatio": 0-100,
  "questionsAsked": antal,
  "longestMonologue": "uppskattat antal sekunder",
  "techniqueHits": [
    {
      "timestamp": "MM:SS",
      "techniqueName": "Namn pa tekniken",
      "quote": "Exakt citat fran transkriptet",
      "comment": "Varfor detta var bra"
    }
  ],
  "techniqueMisses": [
    {
      "timestamp": "MM:SS",
      "techniqueName": "Namn pa tekniken som borde ha anvants",
      "whatHappened": "Vad kunden sa och vad du svarade",
      "suggestion": "Vad du borde ha gjort enligt tekniken",
      "idealResponse": "Exakt fras fran kunskapsbasen"
    }
  ],
  "bbbtuuiccCoverage": {
    "behov": true/false,
    "budget": true/false,
    "beslutsfattare": true/false,
    "tidsplan": true/false,
    "usp": true/false,
    "utbildaIProdukt": true/false,
    "invandningar": true/false,
    "compellingEvents": true/false,
    "commitments": true/false
  },
  "generatedExercises": [
    {
      "type": "scenario_card",
      "prompt": "Ovningssituation baserat pa det du missade",
      "techniqueName": "Relevant teknik"
    }
  ]
}

VIKTIGT:
- Referera till tekniker vid namn fran kunskapsbasen
- Peka pa EXAKTA ogonblick med tidsstamplar
- Citera exakta fragor/svar fran transkriptet
- Generera minst 2-3 ovningar baserat pa missade mojligheter
- Var specifik och konkret, aldrig generisk`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const parsed = safeParseJson<Partial<MeetingAnalysisResult>>(text);
  if (!parsed) {
    console.error("[analyzeMeetingTranscript] Failed to parse AI response. Raw text:", text.slice(0, 2000));
    throw new Error("AI returned invalid JSON för mötestranskript-analys");
  }

  return {
    summary: parsed.summary ?? "",
    talkRatio: typeof parsed.talkRatio === "number" ? parsed.talkRatio : 0,
    questionsAsked: typeof parsed.questionsAsked === "number" ? parsed.questionsAsked : 0,
    longestMonologue: parsed.longestMonologue ?? "0",
    techniqueHits: Array.isArray(parsed.techniqueHits) ? parsed.techniqueHits : [],
    techniqueMisses: Array.isArray(parsed.techniqueMisses) ? parsed.techniqueMisses : [],
    bbbtuuiccCoverage:
      parsed.bbbtuuiccCoverage && typeof parsed.bbbtuuiccCoverage === "object"
        ? parsed.bbbtuuiccCoverage
        : {},
    generatedExercises: Array.isArray(parsed.generatedExercises) ? parsed.generatedExercises : [],
  };
}

function safeParseJson<T>(text: string): T | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Fall through to regex extraction
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // Fall through
    }
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
  return null;
}

// ============================================================
// TYPES
// ============================================================
export interface AnalysisResult {
  techniques: {
    name: string;
    description: string;
    whenToUse: string;
    howToUse: string;
    difficulty: string;
    ifThenPatterns: {
      trigger: string;
      response: string;
      context: string;
    }[];
  }[];
}

export interface TechniqueContext {
  name: string;
  description: string;
  whenToUse: string;
  howToUse: string;
}

export interface PersonaContext {
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  personality: string;
  currentSolution?: string;
  painPoints?: string;
  objections?: string;
  mood?: string;
  communicationStyle?: string;
  behaviorInstructions?: string;
  // JSON-stringified BehaviorStructured
  behaviorStructured?: string;
  // JSON-stringified HiddenMotive[]
  hiddenMotives?: string;
  // JSON-stringified Record<difficulty, string>
  difficultyOverrides?: string;
}

export interface BehaviorStructured {
  howYouReply?: string;
  whatYouWantToKnow?: string;
  whatTriggersYouNegatively?: string;
  hiddenMotivesHint?: string;
}

export interface HiddenMotive {
  secret: string;
  trigger: string;
  howItLeaks?: string;
}

export interface PersonaExpansionInput {
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  personality: string;
  mood?: string;
  communicationStyle?: string;
  behaviorInstructions?: string;
  behaviorStructured?: BehaviorStructured;
}

export interface PersonaExpansionResult {
  currentSolution: string;
  painPoints: string[];
  objections: string[];
  behaviorStructured: BehaviorStructured;
}

export interface ConversationMessage {
  role: "seller" | "buyer";
  content: string;
  timestamp?: number;
}

export interface ScenarioResult {
  situation: string;
  customerQuote: string;
  expectedApproach: string;
  idealResponse: string;
  evaluationCriteria: string[];
}

export interface EvaluationResult {
  score: number;
  breakdown: {
    rightTechnique: { score: number; comment: string };
    frameworkCoverage: { score: number; comment: string };
    objectionHandling: { score: number; comment: string };
    naturalFormulation: { score: number; comment: string };
    meetingStructure: { score: number; comment: string };
  };
  strengths: string[];
  improvements: string[];
  feedForward: string;
  levelIndicator: string;
}

export interface RoleplayEvaluationResult {
  score: number;
  breakdown: {
    rightTechnique: { score: number; comment: string };
    frameworkCoverage: { score: number; comment: string };
    objectionHandling: { score: number; comment: string };
    naturalFormulation: { score: number; comment: string };
    meetingStructure: { score: number; comment: string };
  };
  strengths: string[];
  improvements: string[];
  feedForward: string;
  levelIndicator: string;
  hiddenMotivesScore?: number | null;
  hiddenMotivesDetails?: {
    motive: string;
    discovered: boolean;
    howItWasSurfaced: string | null;
  }[];
  timestampedFeedback: {
    timestamp: number;
    type: "positive" | "missed_opportunity" | "correction";
    buyerSaid: string;
    userSaid: string;
    techniqueName: string;
    idealResponse: string;
    explanation: string;
  }[];
}

export interface MeetingAnalysisResult {
  summary: string;
  talkRatio: number;
  questionsAsked: number;
  longestMonologue: string;
  techniqueHits: {
    timestamp: string;
    techniqueName: string;
    quote: string;
    comment: string;
  }[];
  techniqueMisses: {
    timestamp: string;
    techniqueName: string;
    whatHappened: string;
    suggestion: string;
    idealResponse: string;
  }[];
  bbbtuuiccCoverage: Record<string, boolean>;
  generatedExercises: {
    type: string;
    prompt: string;
    techniqueName: string;
  }[];
}
