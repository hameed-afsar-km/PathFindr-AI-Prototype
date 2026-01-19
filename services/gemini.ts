
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

const getAI = () => {
  try {
    if (!process.env.API_KEY) throw new Error("Missing API Key");
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    return null;
  }
};

const NOVA_PERSONA = `
  You are "Nova", a world-class AI Career Architect and Psychologist. 
  Your personality is futuristic, encouraging, analytical, and structured. 
  You use industry data and psychological profiling to architect careers.
`;

export const analyzeInterests = async (
  inputs: { question: string, answer: string }[],
  additionalComments: string,
  excludedCareerTitles: string[] = []
): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return [];

  const prompt = `
    ${NOVA_PERSONA}
    Analyze the user's profile:
    ${inputs.map((inp, i) => `${i + 1}. Q: ${inp.question} \n   A: ${inp.answer}`).join('\n')}
    Context: "${additionalComments}"
    ${excludedCareerTitles.length > 0 ? `Exclude: ${excludedCareerTitles.join(', ')}.` : ''}

    Return JSON array: [{id, title, description, fitScore, reason}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) {
    return [];
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return [];
  const prompt = `${NOVA_PERSONA} Identify 3 career paths for: "${query}". Return JSON array: [{id, title, description, fitScore, reason}]`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
  } catch (e) {
    return [];
  }
};

/**
 * CALL 1: Roadmap Generation
 */
export const generateRoadmap = async (
  careerTitle: string,
  eduYear: string,
  targetDate: string,
  expLevel: string,
  focusAreas: string,
  adaptationContext?: any
): Promise<RoadmapData> => {
  const ai = getAI();
  if (!ai) return { phases: [], recommendedCertificates: [], recommendedInternships: [] };

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
      Total Duration: ${totalDays} Days. Experience Level: ${expLevel}.
      Additional Focus: "${focusAreas}".
      
      STRICT RULES:
      1. EXACTLY ${totalDays} items total (1 per day).
      2. Tasks MUST have 2-3 specific "suggestedResources" (working links).
      3. Descriptions must be 25-35 words explaining WHAT and WHY.
      4. Recommendations MUST be real, working URLs from major platforms (Coursera, edX, LinkedIn).
      
      Output JSON format: 
      {
        "phases": [{ "phaseName": "Phase Title", "items": [{ "title", "description", "type", "explanation", "suggestedResources": [{ "title", "url" }] }] }],
        "recommendedCertificates": [{ "title", "provider", "url", "relevance" }],
        "recommendedInternships": [{ "title", "company", "url", "description" }]
      }
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const data = JSON.parse(cleanJsonString(response.text || '{}'));
    
    let taskIdCounter = 1;
    const generationId = Date.now().toString(36);

    const processedPhases = (data.phases || []).map((phase: any, pIdx: number) => ({
      ...phase,
      items: (phase.items || []).map((item: any) => ({
        ...item,
        id: `task-${generationId}-${pIdx}-${taskIdCounter++}`,
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
    return { phases: [], recommendedCertificates: [], recommendedInternships: [] };
  }
};

/**
 * CALL 2: Consolidated Knowledge & Insights Batch
 * Generates Daily Quiz, Practice MCQs, Interview Questions, and News Headlines.
 */
export const generateKnowledgeBatch = async (careerTitle: string): Promise<{
    dailyQuiz: DailyQuizItem;
    practiceQuestions: PracticeQuestion[];
    interviewQuestions: Record<string, InterviewQuestion[]>;
    news: NewsItem[];
    topics: string[];
}> => {
    const ai = getAI();
    if (!ai) throw new Error("AI Offline");

    const prompt = `
        ${NOVA_PERSONA}
        Task: Create a massive initial knowledge and industry briefing for a career in "${careerTitle}".
        
        Requirements:
        1. List 10 core technical topics for mastery.
        2. Generate 1 Daily Technical MCQ with a detailed explanation.
        3. Generate 15 Practice MCQs across the topics.
        4. Generate 15 Interview Questions tagged with companies (Google, Amazon, Startups, etc.).
        5. Research and provide 15 latest News Headlines/Breakthroughs for this field with real URLs.
        
        STRICT JSON FORMAT:
        {
          "topics": ["string"],
          "dailyQuiz": { "question", "options", "correctIndex", "explanation" },
          "practiceQuestions": [{ "id", "question", "options", "correctIndex", "explanation", "topic" }],
          "interviewQuestions": [{ "id", "question", "answer", "explanation", "company" }],
          "news": [{ "title", "url", "source", "date", "summary" }]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json" 
            }
        });
        
        const data = JSON.parse(cleanJsonString(response.text || '{}'));
        
        // Structure the interviews object as expected by the store
        const interviews: Record<string, InterviewQuestion[]> = {};
        (data.interviewQuestions || []).forEach((q: any) => {
            const co = q.company || 'General';
            if (!interviews[co]) interviews[co] = [];
            interviews[co].push(q);
        });

        return {
            topics: data.topics || [],
            dailyQuiz: data.dailyQuiz,
            practiceQuestions: data.practiceQuestions || [],
            interviewQuestions: interviews,
            news: data.news || []
        };
    } catch (e) {
        console.error("Knowledge batch failed", e);
        throw e;
    }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${NOVA_PERSONA} Generate a 5-question skill quiz for: ${careerTitle}. JSON: [{id, question, options[], correctIndex, difficulty}].`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (e) { return []; }
};

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
  const ai = getAI();
  if (!ai) throw new Error();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a job simulation scenario for ${careerTitle}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text || '{}'));
};

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[], context?: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Architect busy. Try later.";
  const prompt = `System: ${NOVA_PERSONA} Career: ${careerTitle}. Context: ${context || ''}\nUser: ${message}\nHistory: ${JSON.stringify(history.slice(-3))}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Architect busy.";
  } catch (e) { return "Connection error."; }
};

// Legacy fallbacks (optional but kept for compatibility)
export const calculateRemainingDays = (roadmap: RoadmapPhase[]): number => {
  return roadmap.reduce((acc, p) => acc + (p.items?.filter(i => i.status !== 'completed').length || 0), 0);
};

export const generateDailyQuiz = async (title: string) => null;
export const fetchTechNews = async (title: string) => [];
export const generatePracticeTopics = async (title: string) => [];
export const generatePracticeQuestions = async (title: string) => [];
export const generateCompanyInterviewQuestions = async (title: string, filter: string) => [];
export const generatePracticeDataBatch = async (title: string) => ({});
