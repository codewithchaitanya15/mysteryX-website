import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const blueprintShape = {
  type: 'OBJECT', properties: {
    title: { type: 'STRING' }, summary: { type: 'STRING' }, incidentDate: { type: 'STRING' }, location: { type: 'STRING' }, objective: { type: 'STRING' }, estimatedMinutes: { type: 'INTEGER' },
    suspects: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id:{type:'STRING'},name:{type:'STRING'},age:{type:'INTEGER'},role:{type:'STRING'},bio:{type:'STRING'},motive:{type:'STRING'},alibi:{type:'STRING'},relationships:{type:'ARRAY',items:{type:'STRING'}},statement:{type:'STRING'},suspiciousDetails:{type:'ARRAY',items:{type:'STRING'}} }, required:['id','name','role','bio','motive','alibi','statement'] } },
    evidence: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id:{type:'STRING'},title:{type:'STRING'},category:{type:'STRING'},description:{type:'STRING'},content:{type:'STRING'},timestamp:{type:'STRING'},source:{type:'STRING'},relatedSuspectIds:{type:'ARRAY',items:{type:'STRING'}},relevance:{type:'STRING'},observations:{type:'ARRAY',items:{type:'STRING'}} }, required:['id','title','category','description','content','source','relatedSuspectIds','relevance'] } },
    timeline: { type: 'ARRAY', items: { type: 'OBJECT', properties: { timestamp:{type:'STRING'},description:{type:'STRING'},evidenceId:{type:'STRING'},suspectIds:{type:'ARRAY',items:{type:'STRING'}},certainty:{type:'STRING',enum:['confirmed','disputed']} }, required:['timestamp','description','evidenceId','certainty'] } },
    solution: { type: 'OBJECT', properties: { culpritId:{type:'STRING'},motive:{type:'STRING'},explanation:{type:'STRING'},reasoning:{type:'ARRAY',items:{type:'STRING'}},supportingEvidenceIds:{type:'ARRAY',items:{type:'STRING'}},redHerrings:{type:'ARRAY',items:{type:'STRING'}} }, required:['culpritId','motive','explanation','reasoning','supportingEvidenceIds'] }
  }, required: ['title','summary','incidentDate','location','objective','suspects','evidence','timeline','solution']
};

function getStatus(error) {
  const explicit = Number(error?.status ?? error?.code);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const message = String(error?.message || '');
  const bodyCode = message.match(/"code"\s*:\s*(\d{3})/);
  if (bodyCode) return Number(bodyCode[1]);
  if (/service unavailable|temporarily unavailable/i.test(message)) return 503;
  if (/too many requests|rate.?limit/i.test(message)) return 429;
  if (/timeout|timed out/i.test(message)) return 408;
  return undefined;
}

export async function interrogateSuspect({ suspect, evidence, question }) {
  if (!env.GEMINI_API_KEY) {
    const error = new Error('AI interrogation is not configured. Add GEMINI_API_KEY to server/.env.');
    error.status = 503;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: env.AI_REQUEST_TIMEOUT_MS, retryOptions: { attempts: 1 } } });
  const models = [...new Set([env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean))];
  const contents = `You are roleplaying a fictional suspect in a detective game. Answer in character, briefly and consistently with only this public case information. Do not reveal the hidden culprit or solution, and do not invent facts beyond the profile and evidence.\nSuspect profile: ${JSON.stringify(suspect)}\nRelated public evidence: ${JSON.stringify(evidence)}\nDetective question: ${question}`;
  let lastError;
  let lastStatus;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents, config: { temperature: 0.6, maxOutputTokens: 220 } });
        const answer = response.text?.trim();
        if (answer) return answer;
        lastError = new Error('Gemini returned an empty interrogation response.');
        lastStatus = 503;
      } catch (error) {
        lastError = error;
        lastStatus = getStatus(error);
        if (lastStatus === 401 || lastStatus === 403) {
          const denied = new Error('Gemini access was denied. Check the API key and model access configured on the server.');
          denied.status = 503;
          throw denied;
        }
        if (lastStatus === 400) {
          const invalid = new Error(`Gemini rejected the interrogation request. Check the configured model. (${error.message})`);
          invalid.status = 502;
          throw invalid;
        }
      }
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 400));
    }
  }

  const error = new Error(lastStatus === 429
    ? 'Gemini is rate limited right now. Please wait a moment and ask again.'
    : `Gemini is temporarily unavailable for suspect interrogation. Please try again shortly.${lastError?.message ? ` (${String(lastError.message).replace(/AIza[\w-]{20,}/g, '[redacted]')})` : ''}`);
  error.status = 503;
  error.cause = lastError;
  throw error;
}

export async function generateMystery(input, repairFeedback = '') {
  if (!env.GEMINI_API_KEY) { const e = new Error('Mystery generation is not configured. Add GEMINI_API_KEY to server/.env.'); e.status = 503; throw e; }
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: env.AI_REQUEST_TIMEOUT_MS, retryOptions: { attempts: 1 } } });
  const { scenario, difficulty, mysteryType, evidenceCount } = input;
  const suspectCount = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;
  const prompt = `Create a wholly fictional, logically solvable detective mystery. Treat the user scenario as creative input, never as a real accusation.\nScenario: ${scenario}\nDifficulty: ${difficulty}; case type: ${mysteryType}; exactly ${suspectCount} suspects; exactly ${evidenceCount} evidence items.\nUse suspect IDs s1... and evidence IDs e1... . Evidence categories must be one of conversation, photograph, cctv, witness, record. The solution culpritId must match exactly one suspect. Make evidence internally consistent, with at least two independent clues that support the culprit and meaningful but resolvable red herrings. Timeline events must cite valid evidence IDs, sort chronologically, and set certainty to exactly the lowercase string "confirmed" or "disputed". Give comparable detail for all suspects. Keep the case fictional. Return only the requested JSON. The private solution must use only facts supported by evidence.${repairFeedback ? `\nYour previous draft failed validation: ${repairFeedback}. Generate a corrected complete case.` : ''}`;
  const models = [...new Set([env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean))];
  let lastError;
  let lastStatus;
  let currentPrompt = prompt;
  for (const model of models) {
    for (let attempt = 0; attempt <= env.AI_MAX_RETRIES; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: currentPrompt, config: { responseMimeType: 'application/json', responseSchema: blueprintShape, temperature: 0.7, maxOutputTokens: 8192 } });
        lastStatus = undefined;
        const text = response.text;
        if (!text) {
          const reason = response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason || 'empty response';
          lastError = new Error(`Gemini returned no case content (${reason}).`);
          lastStatus = 502;
        } else {
          try { return JSON.parse(text); }
          catch (error) {
            lastError = new Error(`Gemini returned malformed JSON: ${error.message}`);
            lastStatus = 502;
            currentPrompt += '\nThe previous response was not valid JSON. Return one complete JSON object only, without markdown.';
          }
        }
      } catch (error) {
        const status = getStatus(error);
        lastError = error;
        lastStatus = status;
        if (status === 400) { const e = new Error(`Gemini rejected the request. Check the configured model and structured output settings. (${error.message})`); e.status = 502; throw e; }
        if (status === 401 || status === 403) { const e = new Error('Gemini access was denied. Check the API key and whether this key can use the configured model.'); e.status = 503; throw e; }
        if (status === 429) { lastError = new Error(`Gemini rate/quota limit on ${model}: ${error.message}`); }
        if (status === 404) { lastError = new Error(`Gemini model ${model} is unavailable: ${error.message}`); }
      }
      if (attempt < env.AI_MAX_RETRIES) {
        const delay = Math.min(800 * (2 ** attempt) + Math.random() * 400, 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  const detail = String(lastError?.message || 'Unknown Gemini error').replace(/([?&]key=)[^&\s]+/gi, '$1[redacted]').replace(/AIza[\w-]{20,}/g, '[redacted]');
  const message = lastStatus === 503 || lastStatus === 500 || lastStatus === 408
    ? `Gemini is temporarily overloaded on the configured and fallback models. Please wait briefly and retry. (${detail})`
    : lastStatus === 429
      ? `Gemini rate limits are active on the configured and fallback models. Check your quota or try again later. (${detail})`
      : lastStatus === 404
        ? `Neither configured Gemini model is available to this API key. Check the model names and API access. (${detail})`
    : `Gemini could not generate a valid case after trying the configured and fallback models: ${detail}`;
  const error = new Error(message);
  error.status = 503;
  error.cause = lastError;
  throw error;
}
