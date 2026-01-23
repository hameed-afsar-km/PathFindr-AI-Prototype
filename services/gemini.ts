import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage, RoadmapData } from '../types';

const cleanJsonString = (str: string): string => {
  let cleaned = str.replace(/```json\n?|```/g, "").trim();
  const startBrace = cleaned.indexOf('{');
  const startBracket = cleaned.indexOf('[');
  let startIndex = -1;
  
  if (startBrace !== -1 && startBracket !== -1) {
    startIndex = Math.min(startBrace, startBracket);
  } else {
    startIndex = Math.max(startBrace, startBracket);
  }

  if (startIndex !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);
    if (endIndex !== -1 && endIndex > startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
  }
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  return cleaned;
};

const NOVA_PERSONA = `
  You are "Nova", a world-class AI Career Architect and Psychologist. 
  Your personality is futuristic, encouraging, analytical, and highly structured. 
  You specialize in matching obscure psychological traits to high-growth industry roles in the 2024-2025 economy.
`;

export const calculateRemainingDays = (phases: RoadmapPhase[]): number => {
  return phases.reduce((acc, phase) => acc + (phase.items?.filter(item => item.status === 'pending').length || 0), 0);
};

export const analyzeInterests = async (
  inputs: { question: string, answer: string }[],
  additionalComments: string,
  excludedCareerTitles: string[] = []
): Promise<CareerOption[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const exclusionContext = excludedCareerTitles.length > 0
    ? `IMPORTANT: Do NOT suggest: ${excludedCareerTitles.join(', ')}.`
    : '';

  const prompt = `
    ${NOVA_PERSONA}
    Analyze the user's profile:
    ${inputs.map((inp, i) => `${i + 1}. Q: ${inp.question} \n   A: ${inp.answer}`).join('\n')}
    Context: "${additionalComments}"
    ${exclusionContext}

    Identify 3 scientifically aligned career paths. Return JSON array: [{id, title, description, fitScore, reason}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) {
    console.error("Analysis failed:", e);
    return [];
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ${NOVA_PERSONA}
    STRICT SEARCH PROTOCOL: Find career paths matching: "${query}".
    
    RULES:
    1. LITERAL MATCH: The first result MUST be the exact career title of "${query}" if it exists.
    2. RELEVANCE: All 3 results MUST be in the same professional domain as "${query}".
    3. FIT SCORE: 98-100 for exact matches.
    
    Return JSON array: [{"id": "string", "title": "string", "description": "string", "fitScore": number, "reason": "string"}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) {
    console.error("Career search failed:", e);
    return [];
  }
};

export const generateRoadmap = async (
  careerTitle: string,
  eduYear: string,
  targetDate: string,
  expLevel: string,
  focusAreas: string,
  adaptationContext?: any
): Promise<RoadmapData> => {
  if (!process.env.API_KEY) return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  let totalDays = 30;
  if (targetDate) {
    const parts = targetDate.split('-');
    if (parts.length === 3) {
      const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }
  }

  const prompt = `
      ${NOVA_PERSONA}
      Architect a professional roadmap for: "${careerTitle}".
      Duration: ${totalDays} Days. Level: ${expLevel}. Focus: "${focusAreas}".
      
      STRICT RULES:
      1. Every day from 1 to ${totalDays} MUST have exactly one task.
      2. Items MUST be "skill" (learning) or "project" (building).
      3. Output JSON structure: { "phases": [{ "phaseName": "Title", "items": [...] }], "recommendedCertificates": [...], "recommendedInternships": [...] }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '{}'));
    
    let taskIdCounter = 1;
    const genId = Date.now().toString(36);

    const processedPhases = (data.phases || []).map((phase: any, pIdx: number) => ({
      ...phase,
      items: (phase.items || []).map((item: any) => ({
        ...item,
        id: `task-${genId}-${pIdx}-${taskIdCounter++}`,
        status: 'pending',
        duration: '1 day',
        type: item.type === 'project' ? 'project' : 'skill'
      }))
    }));

    return {
      phases: processedPhases,
      recommendedCertificates: data.recommendedCertificates || [],
      recommendedInternships: data.recommendedInternships || []
    };
  } catch (e) {
    console.error("Roadmap generation failed:", e);
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  }
};

export const generatePracticeDataBatch = async (careerTitle: string): Promise<any> => {
  if (!process.env.API_KEY) return { topics: [], questions: [], interviews: {} };
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    ${NOVA_PERSONA}
    Generate practice set for: "${careerTitle}".
    1. 8 technical topics.
    2. 15 technical MCQs.
    3. 15 interview questions (Google, Amazon, Microsoft, Startups).
    Return ONE JSON object: { "topics": [...], "questions": [...], "interviews": { "Google": [...], "Amazon": [...], "Microsoft": [...], "Startups": [...] } }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) {
    console.error("Batch failed:", e);
    return { topics: [], questions: [], interviews: {} };
  }
};

export const fetchTechNews = async (topic: string): Promise<NewsItem[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Latest news about ${topic}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const newsItems: NewsItem[] = [];
    chunks.forEach((c: any) => {
      if (c.web && c.web.uri && c.web.title) {
        newsItems.push({
          title: c.web.title,
          url: c.web.uri,
          source: new URL(c.web.uri).hostname.replace('www.', '').split('.')[0].toUpperCase(),
          summary: '',
          date: 'Recent'
        });
      }
    });
    return newsItems.slice(0, 8);
  } catch (e) { return []; }
};

export const generateDailyQuiz = async (careerTitle: string): Promise<DailyQuizItem | null> => {
  if (!process.env.API_KEY) return null;
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create one technical MCQ for ${careerTitle}. JSON: {question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || 'null'));
  } catch (e) { return null; }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    ${NOVA_PERSONA}
    Generate exactly 5 technical skill calibration questions for a career in: "${careerTitle}".
    The questions must progress from beginner to advanced difficulty.
    Difficulty levels MUST be: "beginner", "intermediate", or "advanced".
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.INTEGER },
              difficulty: { type: Type.STRING }
            },
            required: ["id", "question", "options", "correctIndex", "difficulty"]
          }
        }
      }
    });
    const results = JSON.parse(cleanJsonString(response.text || '[]'));
    return results.map((r: any, idx: number) => ({
      ...r,
      id: r.id || `q-${idx}-${Date.now()}`
    }));
  } catch (e) {
    console.error("Skill quiz failed:", e);
    return [];
  }
};

export const generatePracticeTopics = async (careerTitle: string): Promise<string[]> => {
  if (!process.env.API_KEY) return ["Basics"];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `List 5 sub-topics for ${careerTitle}. JSON array of strings.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return ["Basics"]; }
};

export const generatePracticeQuestions = async (careerTitle: string, topic?: string): Promise<PracticeQuestion[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 technical MCQs for ${careerTitle} ${topic ? `focused on ${topic}` : ''}. JSON array: {id, question, options[4], correctIndex, explanation, topic}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateCompanyInterviewQuestions = async (careerTitle: string, filter: string, customParams?: any): Promise<InterviewQuestion[]> => {
  if (!process.env.API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate 5 interview questions for ${careerTitle} at ${filter}. ${customParams?.topic ? `Focus: ${customParams.topic}.` : ''} JSON array: {id, question, answer, explanation, company}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
  if (!process.env.API_KEY) throw new Error("API Key Missing");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Job simulation scenario for ${careerTitle}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (e) {
    return { id: '1', scenario: 'Simulation unavailable.', question: 'Error?', options: ['A','B','C','D'], correctIndex: 0, explanation: 'Offline' };
  }
};

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[]): Promise<string> => {
  if (!process.env.API_KEY) return "Nova is currently optimizing its neural links (Offline).";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User: ${message}. Career: ${careerTitle}. Answer concisely.`
    });
    return response.text || "I'm processing that.";
  } catch (e) { return "Busy."; }
};
