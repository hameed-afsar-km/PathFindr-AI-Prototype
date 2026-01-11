
import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, SkillQuestion, DailyQuizItem, InterviewQuestion, PracticeQuestion, SimulationScenario, ChatMessage } from '../types';

const cleanJsonString = (str: string): string => {
  return str.replace(/```json\n?|```/g, "").trim();
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), timeoutMs))
  ]);
};

const getAI = () => {
  try {
    if (!process.env.API_KEY) throw new Error("Missing API Key");
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.warn("API Key missing or invalid. App will use fallback mode.");
    return null;
  }
};

const NOVA_PERSONA = `
  You are "Nova", an advanced AI Career Architect. 
  Your personality is futuristic, encouraging, analytical, and structured. 
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
    const analysisPromise = (async () => {
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
      const text = cleanJsonString(response.text || "[]");
      return JSON.parse(text).sort((a: any, b: any) => b.fitScore - a.fitScore);
    })();

    return await withTimeout(analysisPromise, 15000, getFallbackCareers());
  } catch (e) {
    console.error("Analysis failed:", e);
    return getFallbackCareers();
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return getFallbackCareers(query);
  const prompt = `${NOVA_PERSONA} Find 3 careers for: "${query}". Return JSON array: {id, title, description, fitScore, reason}.`;
  try {
    const searchPromise = (async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(cleanJsonString(response.text || '[]'));
    })();
    return await withTimeout(searchPromise, 10000, getFallbackCareers(query));
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
    return JSON.parse(cleanJsonString(response.text || '[]'));
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

  const start = new Date();
  start.setHours(12, 0, 0, 0);

  let totalDays = 30;
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
      1. Break into logical "Phases".
      2. EACH Item MUST represent exactly 1 day of work.
      3. Total items MUST match ~${totalDays}.
      4. Crucial: Each item MUST have a detailed "explanation" property.
      5. Include "suggestedResources" (array of {title, url}) for each item.
      
      Output JSON format: [{ phaseName: string, items: RoadmapItem[] }]
    `;

  try {
    if (!ai) throw new Error("AI missing");
    const roadmapPromise = (async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(cleanJsonString(response.text || '[]'));
      if (!Array.isArray(data)) return [];

      let taskIdCounter = 1;
      const generationId = Date.now().toString(36); // Unique ID for this generation run

      return data.map((phase: any, pIdx: number) => ({
        ...phase,
        items: (phase.items || []).map((item: any, iIdx: number) => {
          // Normalize suggestedResources to always be an array
          let resources = [];
          if (Array.isArray(item.suggestedResources)) {
            resources = item.suggestedResources;
          } else if (item.suggestedResources && typeof item.suggestedResources === 'object') {
            resources = [item.suggestedResources];
          }

          return {
            ...item,
            // Create a truly unique and stable ID to prevent cross-task pollution
            id: `task-${generationId}-${pIdx}-${taskIdCounter++}`,
            status: 'pending',
            duration: '1 day',
            suggestedResources: resources
          };
        })
      }));
    })();

    return await withTimeout(roadmapPromise, 25000, getFallbackRoadmap(careerTitle));
  } catch (e) {
    console.error("Roadmap generation failed", e);
    return getFallbackRoadmap(careerTitle);
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
    return JSON.parse(cleanJsonString(response.text || 'null'));
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
    return JSON.parse(cleanJsonString(response.text || '[]'));
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
    return JSON.parse(cleanJsonString(response.text || '[]'));
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
    return JSON.parse(cleanJsonString(response.text || '[]'));
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
    return JSON.parse(cleanJsonString(response.text || '{}'));
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
  if (!roadmap) return 0;
  let count = 0;
  roadmap.forEach(p => {
    if (p.items) {
      p.items.forEach(i => {
        if (i.status !== 'completed') {
          count++;
        }
      });
    }
  });
  return count;
};

const getFallbackCareers = (query?: string): CareerOption[] => [
  { id: 'fb1', title: query || 'Software Developer', description: 'Technical professional building digital solutions.', fitScore: 90, reason: 'Strong match for logical problem solving.' },
  { id: 'fb2', title: 'Data Scientist', description: 'Analyzing patterns to drive decision making.', fitScore: 85, reason: 'Matches data-driven curiosity.' },
  { id: 'fb3', title: 'UI/UX Designer', description: 'Designing intuitive user interfaces and experiences.', fitScore: 80, reason: 'Good for creative yet structured minds.' }
];

const getFallbackRoadmap = (title: string): RoadmapPhase[] => [
  {
    phaseName: "Initial Foundations",
    items: [
      { id: `fb-1`, title: `Introduction to ${title}`, description: "Essential starting point.", type: 'skill', duration: '1 day', status: 'pending', importance: 'high', explanation: "Starting is the hardest part. Begin here to build your base.", dependencies: [], suggestedResources: [] }
    ]
  }
];

const getFallbackNews = (topic: string): NewsItem[] => [
  { title: `Advancements in ${topic}`, url: '#', source: 'Industry', summary: '', date: 'Today' }
];

const getFallbackDailyQuiz = (topic: string): DailyQuizItem => ({
  question: `What defines success in ${topic}?`,
  options: ["Consistency", "Luck", "Speed", "Isolation"],
  correctIndex: 0,
  explanation: "Incremental growth builds long-term success."
});

const getFallbackPracticeQuestions = (topic: string): PracticeQuestion[] => [
  { id: 'p1', question: `Core principle of ${topic}?`, options: ["Option A", "Option B", "Option C", "Option D"], correctIndex: 0, explanation: "Self-explanatory." }
];

const getFallbackInterviewQuestions = (topic: string): InterviewQuestion[] => [
  { id: 'i1', question: "Why this career?", answer: "Passion and skill alignment.", company: "General" }
];
