
import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage } from '../types';

// Lazy initialization to prevent startup crashes if key is missing/invalid
const getAI = () => {
    try {
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (e) {
        console.warn("API Key missing or invalid. App will use fallback mode.");
        return null;
    }
};

const NOVA_PERSONA = `
  You are "Nova", an advanced AI Career Architect. 
  Your personality is futuristic, encouraging, analytical, and structured. 
  You don't just give answers; you "architect pathways" and "analyze potential".
  Keep responses concise but professional and inspiring.
`;

export const analyzeInterests = async (
    inputs: { question: string, answer: string }[], 
    additionalComments: string,
    excludedCareerTitles: string[] = []
): Promise<CareerOption[]> => {
    const ai = getAI();
    if (!ai) return getFallbackCareers(); 

  const isShowMore = excludedCareerTitles.length > 0;
  const exclusionContext = isShowMore
    ? `IMPORTANT: Do NOT suggest the following careers: ${excludedCareerTitles.join(', ')}. Provide 3 NEW, DISTINCT options.`
    : 'Provide the absolute top 3 career matches with high fit scores.';

  const prompt = `
    ${NOVA_PERSONA}
    User Profile:
    ${inputs.map((inp, i) => `${i + 1}. Q: ${inp.question} \n   A: ${inp.answer}`).join('\n')}
    Comments: "${additionalComments}"
    ${exclusionContext}
    Return JSON array: {id, title, description, fitScore, reason}.
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
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                fitScore: { type: Type.NUMBER },
                reason: { type: Type.STRING },
              },
            },
          },
        },
      });
      return JSON.parse(response.text || '[]').sort((a: any, b: any) => b.fitScore - a.fitScore);
  } catch (e) {
      return getFallbackCareers();
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return getFallbackCareers(query);
  const prompt = `${NOVA_PERSONA} Find 3 careers for: "${query}". Return JSON array: {id, title, description, fitScore, reason}.`;
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text || '[]');
  } catch (e) {
      return getFallbackCareers(query);
  }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) return [];
  const prompt = `${NOVA_PERSONA} Generate 5 technical MCQ questions for: ${careerTitle}. JSON: [{id, question, options[], correctIndex, difficulty}].`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
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
): Promise<RoadmapPhase[]> => {
    const ai = getAI();
    
    // Improved date calculation
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    
    let totalDays = 30; // Default
    if (targetDate) {
        const parts = targetDate.split('-');
        if (parts.length === 3) {
            const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
            const diffTime = end.getTime() - start.getTime();
            totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        }
    }

    const prompt = `
      ${NOVA_PERSONA}
      Create a career roadmap for: "${careerTitle}".
      Duration: ${totalDays} Days. Level: ${expLevel}. Focus: "${focusAreas}".
      
      RULES:
      1. Break into "Phases".
      2. EACH Item MUST be duration "1 day".
      3. Total items should match ~${totalDays}.
      4. Include explanation (plain text), dependencies, and suggestedResources (YouTube).
      
      Output JSON format: [{ phaseName: string, items: RoadmapItem[] }]
    `;

    try {
        if (!ai) throw new Error("AI missing");
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const data = JSON.parse(response.text || '[]');
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Roadmap generation failed", e);
        // Ensure we always return the valid structure
        return [
            {
                phaseName: "Initial Foundations",
                items: [
                    { id: "fallback_1", title: `Introduction to ${careerTitle}`, description: "Getting started with core principles.", type: 'skill', duration: '1 day', status: 'pending', importance: 'high', explanation: "Essential first step.", dependencies: [] }
                ]
            }
        ];
    }
};

export const fetchTechNews = async (topic: string): Promise<NewsItem[]> => {
    const ai = getAI();
    if (!ai) return getFallbackNews(topic);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Find 5 recent news headlines about "${topic}".`,
            config: { tools: [{ googleSearch: {} }] }
        });
        const ground = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const items: NewsItem[] = ground
            .filter((c: any) => c.web)
            .map((c: any) => ({ title: c.web.title, url: c.web.uri, source: new URL(c.web.uri).hostname, summary: '', date: 'Recent' }));
        return items.length > 0 ? items : getFallbackNews(topic);
    } catch (e) {
        return getFallbackNews(topic);
    }
};

export const generateDailyQuiz = async (careerTitle: string): Promise<DailyQuizItem | null> => {
    const ai = getAI();
    if (!ai) return getFallbackDailyQuiz(careerTitle);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create one MCQ for ${careerTitle}. JSON: {question, options[4], correctIndex, explanation}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || 'null');
    } catch (e) {
        return getFallbackDailyQuiz(careerTitle);
    }
};

export const generatePracticeTopics = async (careerTitle: string): Promise<string[]> => {
    const ai = getAI();
    if (!ai) return ["Basics"];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `List 10 topics for ${careerTitle}. JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return ["Basics"];
    }
};

export const generatePracticeQuestions = async (careerTitle: string, topic?: string, searchQuery?: string): Promise<PracticeQuestion[]> => {
    const ai = getAI();
    if (!ai) return getFallbackPracticeQuestions(careerTitle);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 15 MCQs for ${careerTitle} ${topic || ''}. JSON array: {id, question, options[4], correctIndex, explanation, topic}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return getFallbackPracticeQuestions(careerTitle);
    }
};

export const generateCompanyInterviewQuestions = async (careerTitle: string, filter: string, customParams?: any): Promise<InterviewQuestion[]> => {
    const ai = getAI();
    if (!ai) return getFallbackInterviewQuestions(careerTitle);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate 15 interview questions for ${careerTitle} at ${filter}. JSON array: {id, question, answer, company}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return getFallbackInterviewQuestions(careerTitle);
    }
};

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
    const ai = getAI();
    try {
        if (!ai) throw new Error();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Create a job simulation for ${careerTitle}. JSON: {id, scenario, question, options[4], correctIndex, explanation}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { id: '1', scenario: 'Busy day.', question: 'What do you do?', options: ['Work', 'Sleep', 'Eat', 'Cry'], correctIndex: 0, explanation: 'Working is good.' };
    }
};

export const generateChatResponse = async (message: string, careerTitle: string, history: ChatMessage[]): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Offline.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `User: ${message}. Career: ${careerTitle}.`
        });
        return response.text || "...";
    } catch (e) {
        return "Offline.";
    }
};

export const calculateRemainingDays = (roadmap: RoadmapPhase[]): number => {
    let count = 0;
    if (!roadmap) return 0;
    roadmap.forEach(p => {
        p.items.forEach(i => {
            if (i.status !== 'completed') {
                const match = i.duration.match(/(\d+)/);
                count += match ? parseInt(match[0]) : 1;
            }
        });
    });
    return count;
};

const getFallbackCareers = (query?: string): CareerOption[] => [
    { id: 'fb1', title: 'Software Developer', description: 'Tech path.', fitScore: 90, reason: 'Good match.' }
];

const getFallbackNews = (topic: string): NewsItem[] => [
    { title: `Trends in ${topic}`, url: '#', source: 'Source', summary: '', date: 'Today' }
];

const getFallbackDailyQuiz = (topic: string): DailyQuizItem => ({
    question: `Key skill for ${topic}?`,
    options: ["Learning", "None", "Luck", "Speed"],
    correctIndex: 0,
    explanation: "Keep learning."
});

const getFallbackPracticeQuestions = (topic: string): PracticeQuestion[] => [
    { id: 'p1', question: `Basics of ${topic}?`, options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "Correct." }
];

const getFallbackInterviewQuestions = (topic: string): InterviewQuestion[] => [
    { id: 'i1', question: "Tell me about yourself.", answer: "STAR method.", company: "General" }
];
