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

  const difficultyBehavior: Record<string, string> = {
    easy: `Du ar valvillig och oppet intresserad. Svarar utforligt pa fragor. Visar nyfikenhet.
Inga invandningar. Staller fragor tillbaka. Ger information frivilligt. Sager aldrig "vi har redan en losning".`,
    medium: `Du ar neutral och lite skeptisk. Ger korta svar som kraver foljdfragor.
Har EN mild invandning ("vi tittar redan pa alternativ" eller "vi har det ganska bra idag").
Avviker ibland fran amnet. Fragar "vad kostar det?" for tidigt. Namner en konkurrent.`,
    hard: `Du ar motstridig och skeptisk. Har 2-3 starka invandningar. Tidspressad ("jag har 10 minuter").
Jamfor aktivt med konkurrenter. Ifragasatter pastaenden ("har ni bevis pa det?").
Testar med svara fragor. Andrar amne medvetet.`,
    expert: `Du ar fientlig eller extremt upptagen. Vill avsluta samtalet. Sager "skicka ett mejl istallet".
Har multipla beslutsfattare med olika agendor. Avbryter mitt i meningar.
Ger motstridiga signaler. Ljuger ibland om din roll/mandat.`
  };

  const systemPrompt = `Du ar ${persona.name}, ${persona.title} pa ${persona.company} (${persona.industry}, ${persona.companySize}).

PERSONLIGHET: ${persona.personality}
${persona.currentSolution ? `NUVARANDE LOSNING: ${persona.currentSolution}` : ""}
${persona.painPoints ? `UTMANINGAR: ${persona.painPoints}` : ""}
${persona.objections ? `TYPISKA INVANDNINGAR: ${persona.objections}` : ""}

SVARIGHETSGRAD-BETEENDE:
${difficultyBehavior[difficulty] || difficultyBehavior.medium}

REGLER:
- Du ar koparen, ALDRIG saljaren
- Svara pa svenska
- Halla dig i karaktar HELA tiden
- Svara realistiskt — inte for kort, inte for langt
- Reagera pa vad saljaren faktiskt sager, inte generiskt
- Om saljaren gor nagot bra, reagera positivt men realistiskt
- Om saljaren gor nagot daligt, reagera negativt men realistiskt
- Avsloja ALDRIG att du ar en AI`;

  const chat = model.startChat({
    history: conversationHistory.map(msg => ({
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
    .map(m => `[${m.timestamp ?? 0}s] ${m.role === "seller" ? "Saljare" : "Kopare"}: ${m.content}`)
    .join("\n");

  const focusBlock = focusTechnique
    ? `FOKUSTEKNIK: ${focusTechnique.name}\n${focusTechnique.description}\nNar: ${focusTechnique.whenToUse}\nHur: ${focusTechnique.howToUse}`
    : "";

  const prompt = `Du ar en saljcoach som utvardevar ett rollspel. Analysera samtalet holistiskt + peka pa specifika ogonblick.

PERSONA: ${persona.name}, ${persona.title} pa ${persona.company}
MOTESTYP: ${meetingType}
SVARIGHETSGRAD: ${difficulty}
${focusBlock}

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
- Svara ENDAST med JSON`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI returned invalid JSON");

  return JSON.parse(jsonMatch[0]) as RoleplayEvaluationResult;
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
