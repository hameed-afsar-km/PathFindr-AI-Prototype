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
    // Fallback if AI fails immediately or is not configured
    if (!ai || Math.random() > 0.99) return getFallbackCareers(); 

  const isShowMore = excludedCareerTitles.length > 0;
  const exclusionContext = isShowMore
    ? `IMPORTANT: Do NOT suggest the following careers: ${excludedCareerTitles.join(', ')}. Provide 3 NEW, DISTINCT options. These are secondary alternatives, so their fit scores should naturally be slightly lower than the initial top matches.`
    : 'Provide the absolute top 3 career matches with high fit scores.';

  const prompt = `
    ${NOVA_PERSONA}
    
    User Psychometric Profile:
    ${inputs.map((inp, i) => `${i + 1}. Q: ${inp.question} \n   A: ${inp.answer}`).join('\n')}
    
    Additional User Comments: "${additionalComments}"
    
    ${exclusionContext}
    
    Based on this detailed profile, suggest exactly 3 distinct career paths suitable for this user.
    - Provide a fit score (0-100).
    - Provide a concise reason (max 1 sentence) in your voice.
    - CRITICAL: Return the list SORTED by fitScore in DESCENDING order (Highest first).
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      const text = response.text;
      if (!text) return getFallbackCareers();
      const results = JSON.parse(text) as CareerOption[];
      return results.sort((a, b) => b.fitScore - a.fitScore);
  } catch (e) {
      console.warn("AI Busy (analyzeInterests), using fallback", e);
      return getFallbackCareers();
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  if (!ai) return getFallbackCareers(query);

  const prompt = `
    ${NOVA_PERSONA}
    User Search Query: "${query}"
    
    Identify the 3 most relevant career paths based on this search. 
    Even if the query is vague or a partial match (e.g., "front end"), interpret the intent and suggest full professional roles.
    Provide a fit score (0-100) based on relevance to the query.
    Sort by fitScore descending.
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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

      const text = response.text;
      if (!text) return getFallbackCareers(query);
      const results = JSON.parse(text) as CareerOption[];
      return results.sort((a, b) => b.fitScore - a.fitScore);
  } catch (e) {
      console.warn("AI Busy (searchCareers), using fallback");
      return getFallbackCareers(query);
  }
};

export const generateSkillQuiz = async (careerTitle: string): Promise<SkillQuestion[]> => {
  const ai = getAI();
  if (!ai) {
      // Fallback quiz if AI init fails
      return [
          { id: '1', question: `What is the primary function of ${careerTitle}?`, options: ['Efficiency', 'Design', 'Marketing', 'Sales'], correctIndex: 0, difficulty: 'beginner' },
          { id: '2', question: `Which tool is standard in ${careerTitle}?`, options: ['Notepad', 'Excel', 'Standard Tool', 'Calculator'], correctIndex: 2, difficulty: 'beginner' },
          { id: '3', question: `Intermediate concept in ${careerTitle}?`, options: ['Basic Syntax', 'System Integration', 'Hello World', 'None'], correctIndex: 1, difficulty: 'intermediate' },
          { id: '4', question: `Advanced optimization requires:`, options: ['Guesswork', 'Data Analysis', 'Ignoring users', 'Rebooting'], correctIndex: 1, difficulty: 'advanced' },
          { id: '5', question: `Expert level challenge:`, options: ['Scaling', 'Writing a loop', 'Saving a file', 'Printing'], correctIndex: 0, difficulty: 'advanced' }
      ];
  }

  const prompt = `
    ${NOVA_PERSONA}
    Generate a 5-question technical skill assessment for: ${careerTitle}.
    
    Difficulty Progression:
    1. Very Easy (Basic Concept)
    2. Easy (Common knowledge)
    3. Intermediate (Application)
    4. Advanced (Complex scenario)
    5. Expert (Edge cases/Deep dive)
    
    Output JSON with 'id', 'question', 'options' (array of 4 strings), 'correctIndex' (0-3), and 'difficulty'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const text = response.text;
    if (!text) throw new Error("No text returned");
    const rawData = JSON.parse(text);
    
    // Safety check for array
    const questions = Array.isArray(rawData) ? rawData : (rawData as any).questions || [];
    
    // Validate options
    return questions.map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : ["True", "False"] 
    }));
  } catch (e) {
      console.warn("Quiz gen failed (using fallback)", e);
      // Fallback quiz
      return [
          { id: '1', question: `What is the primary function of ${careerTitle} core principles?`, options: ['Efficiency', 'Design', 'Marketing', 'Sales'], correctIndex: 0, difficulty: 'beginner' },
          { id: '2', question: `Which tool is standard in ${careerTitle}?`, options: ['Notepad', 'Excel', 'Industry Standard IDE/Tool', 'Calculator'], correctIndex: 2, difficulty: 'beginner' },
          { id: '3', question: `Intermediate concept in ${careerTitle} involves:`, options: ['Basic Syntax', 'System Integration', 'Hello World', 'None'], correctIndex: 1, difficulty: 'intermediate' },
          { id: '4', question: `Advanced optimization in ${careerTitle} requires:`, options: ['Guesswork', 'Data Analysis', 'Ignoring users', 'Rebooting'], correctIndex: 1, difficulty: 'advanced' },
          { id: '5', question: `Expert level ${careerTitle} challenge:`, options: ['Scaling to millions', 'Writing a loop', 'Saving a file', 'Printing'], correctIndex: 0, difficulty: 'advanced' }
      ];
  }
};

export const generateRoadmap = async (
    careerTitle: string, 
    eduYear: string, 
    targetDate: string, 
    expLevel: string,
    focusAreas: string,
    adaptationContext?: { 
        type: 'increase_difficulty' | 'relax_pace' | 'challenge_me' | 'reduce_difficulty_and_scope' | 'increase_difficulty_same_time' | 'maintain_pressure' | 'accelerate_pace' | 'increase_difficulty_fill_gap' | 'reduce_difficulty' | 'adapt_roadmap_shorten',
        progressStr?: string,
        startingPhaseNumber?: number
    }
): Promise<RoadmapPhase[]> => {
    // 1. Calculate duration properly (Noon-to-Noon inclusive)
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    
    const parts = targetDate.split('-');
    const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const contextInstruction = adaptationContext 
        ? `ADAPTATION MODE: ${adaptationContext.type}. 
           Context: ${adaptationContext.progressStr}.
           Start generating phases from Phase ${adaptationContext.startingPhaseNumber || 1}.
           Logic for '${adaptationContext.type}':
           - increase_difficulty_fill_gap: User is AHEAD. Keep target date. FILL the gap days with NEW, advanced tasks. E.g., if 4 days tasks left but 10 days remaining, add tasks for exactly 6 days.
           - relax_pace: User is AHEAD. Keep target date. REDISTRIBUTE remaining tasks over the remaining days (1 task/day) to lower intensity.
           - reduce_difficulty: User is BEHIND. Simplify the remaining tasks to be completed faster, lowering the complexity but keeping the timeline.
           - adapt_roadmap_shorten: User is BEHIND. Remove non-essential tasks to fit the roadmap into the remaining days. Prioritize "Must Haves".
           - increase_difficulty: User extended deadline. Add advanced tasks to fill.
           - challenge_me: User shortened deadline. Compress tasks.
           - maintain_pressure: Optimize for efficiency.`
        : '';

    const prompt = `
      ${NOVA_PERSONA}
      Create a detailed career roadmap for: "${careerTitle}".
      User Profile: ${eduYear}, Level: ${expLevel}.
      Upskill Focus: "${focusAreas}".
      
      TOTAL DURATION: ${totalDays} Days.
      
      ${contextInstruction}
      
      STRICT RULES:
      1. Break the roadmap into logical "Phases" (e.g., Foundations, Core, Advanced, Projects).
      2. EACH Item/Task MUST have a duration of EXACTLY "1 day". Do not use "2 days" or "1 week". Break larger topics into 1-day sub-tasks.
      3. The total number of items must roughly match ${totalDays} days.
      4. Include specific daily tasks, mini-projects, and resource reviews.
      5. Provide a 'type': skill, project, internship, or certificate.
      6. Provide a 'explanation': Plain text (NO MARKDOWN, NO BOLD) explaining WHY this is important (1 sentence) and a simple checklist of sub-topics.
      7. CRITICAL: DEPENDENCIES. Tasks should logical depend on previous ones. Add a 'dependencies' array to items containing the IDs of previous 1-2 critical tasks that MUST be completed before this one. 
         - The first item of Phase 1 has no dependencies.
         - Later items should depend on key earlier items to create a learning chain.
      
      Output JSON format: Array of RoadmapPhase objects.
      RoadmapPhase: { phaseName: string, items: RoadmapItem[] }
      RoadmapItem: { 
        id: string (unique), 
        title: string, 
        description: string, 
        type: 'skill'|'project'|'internship'|'certificate', 
        duration: "1 day", 
        status: "pending", 
        importance: "high"|"medium"|"low",
        explanation: string (plain text),
        isAIAdaptation: boolean,
        dependencies: string[] (IDs of prerequisite tasks)
      }
    `;

    try {
        const ai = getAI();
        if (!ai) throw new Error("AI not initialized");

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const text = response.text;
        if (!text) throw new Error("No text returned");
        return JSON.parse(text) as RoadmapPhase[];
    } catch (e) {
        console.warn("Roadmap error (using fallback)", e);
        // Fallback
        const startPhase = adaptationContext?.startingPhaseNumber || 1;
        return [
            {
                phaseName: `Phase ${startPhase}: Foundations (Offline Mode)`,
                items: [
                    { id: `f${startPhase}_1`, title: `Core Concepts of ${careerTitle}`, description: "Understanding the basics and ecosystem.", type: 'skill', duration: '1 day', status: 'pending', importance: 'high', explanation: "Essential starting point. Checklist: History, Key Terms, Tools.", dependencies: [] },
                    { id: `f${startPhase}_2`, title: "Environment Setup", description: "Installing necessary software and tools.", type: 'skill', duration: '1 day', status: 'pending', importance: 'high', explanation: "Preparing your workspace. Checklist: IDE, SDKs, CLIs.", dependencies: [`f${startPhase}_1`] },
                    { id: `f${startPhase}_3`, title: "First Practical Exercise", description: "Hands-on simple project.", type: 'project', duration: '1 day', status: 'pending', importance: 'medium', explanation: "Apply what you learned. Checklist: Hello World, Basic Script.", dependencies: [`f${startPhase}_2`] }
                ]
            },
            {
                phaseName: `Phase ${startPhase + 1}: Deep Dive (Offline Mode)`,
                items: [
                    { id: `d${startPhase}_1`, title: "Advanced Theory", description: "Moving beyond basics.", type: 'skill', duration: '1 day', status: 'pending', importance: 'high', explanation: "Deepening knowledge. Checklist: Algorithms, Patterns.", dependencies: [`f${startPhase}_3`] },
                    { id: `d${startPhase}_2`, title: "Mini Project", description: "Building something functional.", type: 'project', duration: '1 day', status: 'pending', importance: 'high', explanation: "Portfolio piece. Checklist: CRUD App, Analysis Report.", dependencies: [`d${startPhase}_1`] },
                    { id: `d${startPhase}_3`, title: "Certification Prep", description: "Reviewing standards.", type: 'certificate', duration: '1 day', status: 'pending', importance: 'medium', explanation: "Validation of skills. Checklist: Exam Guide, Mock Test.", dependencies: [`d${startPhase}_2`] }
                ]
            }
        ];
    }
};

export const fetchTechNews = async (topic: string): Promise<NewsItem[]> => {
    try {
        const ai = getAI();
        if (!ai) return getFallbackNews(topic);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Find 5 recent, specific news headlines about "${topic}". Return valid URLs from the search results.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const candidates = response.candidates;
        if (!candidates || !candidates[0]) return getFallbackNews(topic);

        const groundingChunks = candidates[0].groundingMetadata?.groundingChunks || [];
        const newsItems: NewsItem[] = [];

        groundingChunks.forEach((chunk: any) => {
             if (chunk.web && chunk.web.uri && chunk.web.title) {
                 newsItems.push({
                     title: chunk.web.title,
                     url: chunk.web.uri,
                     source: new URL(chunk.web.uri).hostname.replace('www.', ''),
                     summary: '',
                     date: 'Recent'
                 });
             }
        });
        
        // Dedup by URL
        const uniqueNews = Array.from(new Map(newsItems.map(item => [item.url, item])).values()).slice(0, 5);
        
        if (uniqueNews.length === 0) return getFallbackNews(topic);

        return uniqueNews;

    } catch (e) {
        return getFallbackNews(topic);
    }
};

export const generateDailyQuiz = async (careerTitle: string): Promise<DailyQuizItem | null> => {
    try {
        const ai = getAI();
        if (!ai) return getFallbackDailyQuiz(careerTitle);

        const prompt = `
            ${NOVA_PERSONA}
            Create ONE single multiple-choice question for a ${careerTitle} student to test their knowledge today.
            Make it challenging but answerable.
            
            Output JSON: { question, options (4 strings), correctIndex (0-3), explanation }
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        const text = response.text;
        if (!text) return getFallbackDailyQuiz(careerTitle);
        return JSON.parse(text);
    } catch (e) {
        return getFallbackDailyQuiz(careerTitle);
    }
};

export const generatePracticeTopics = async (careerTitle: string): Promise<string[]> => {
    try {
        const ai = getAI();
        if (!ai) return ["Core Fundamentals", "Advanced Techniques", "Best Practices", "Tools & Ecosystem", "System Design"];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `List 10 most important technical topics/concepts for ${careerTitle}. Return JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return ["Core Fundamentals", "Advanced Techniques", "Best Practices", "Tools & Ecosystem", "System Design"];
        return JSON.parse(text);
    } catch (e) {
        return ["Core Fundamentals", "Advanced Techniques", "Best Practices", "Tools & Ecosystem", "System Design"];
    }
};

export const generatePracticeQuestions = async (careerTitle: string, topic?: string, searchQuery?: string): Promise<PracticeQuestion[]> => {
    const context = searchQuery ? `related to search: "${searchQuery}"` : topic ? `focused on topic: "${topic}"` : `general practice`;
    const prompt = `
        ${NOVA_PERSONA}
        Generate a comprehensive set of 15 practice MCQ questions for ${careerTitle} ${context}.
        Include detailed explanation for the correct answer.
        
        Output a valid JSON array of objects with schema: { id, question, options (array of 4 strings), correctIndex, explanation, topic }
        
        CRITICAL: 'correctIndex' MUST be a 0-based NUMBER (0, 1, 2, or 3). Do not use letters, strings, or 1-based indices.
        Example: "correctIndex": 0
    `;
    
    try {
        const ai = getAI();
        if (!ai) return getFallbackPracticeQuestions(careerTitle);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return getFallbackPracticeQuestions(careerTitle);
        return JSON.parse(text);
    } catch (e) {
        return getFallbackPracticeQuestions(careerTitle);
    }
};

// Mode: 'company' | 'aptitude' | 'custom' | 'general'
export const generateCompanyInterviewQuestions = async (
    careerTitle: string, 
    filter: string,
    customParams?: { topic: string, difficulty: string }
): Promise<InterviewQuestion[]> => {
    let promptContext = "";
    
    if (filter === 'Aptitude') {
        promptContext = `
            Generate 15 quantitative aptitude and logical reasoning interview questions suitable for any tech role.
            Focus on Logic, Math, and Data Interpretation.
            Tag company as "General Aptitude".
        `;
    } else if (filter === 'AI Challenge' && customParams) {
        promptContext = `
            Generate 15 ${customParams.difficulty} level interview questions about "${customParams.topic}" for a ${careerTitle}.
            Tag company as "AI Challenge".
        `;
    } else if (filter !== 'All') {
        promptContext = `
            Retrieve (simulate) 15 REAL previous interview questions specifically asked at ${filter} for a ${careerTitle} role.
            Focus on questions historically associated with ${filter}.
            Tag company strictly as "${filter}".
        `;
    } else {
         promptContext = `
            Generate a diverse set of 15 real-world interview questions for ${careerTitle}.
            Source them from top tech companies (Google, Amazon, Microsoft, Netflix, Startups, etc.).
            Tag each question with the specific company name.
        `;
    }

     const prompt = `
        ${NOVA_PERSONA}
        ${promptContext}
        
        Output JSON array of objects: { id, question, answer, company (e.g. "Google") }
    `;
    
    try {
        const ai = getAI();
        if (!ai) return getFallbackInterviewQuestions(careerTitle);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return getFallbackInterviewQuestions(careerTitle);
        return JSON.parse(text);
    } catch (e) {
        return getFallbackInterviewQuestions(careerTitle);
    }
};

export const generateSimulationScenario = async (careerTitle: string): Promise<SimulationScenario> => {
    const prompt = `
        ${NOVA_PERSONA}
        Create a role-playing job simulation scenario for a ${careerTitle}.
        Describe a realistic workplace situation (the 'scenario') and ask a decision-making question.
        Provide 4 options and the correct index (NUMBER 0-3).
        Output JSON.
    `;
    
    try {
        const ai = getAI();
        if (!ai) throw new Error("AI missing");

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) throw new Error("No text");
        return JSON.parse(text);
    } catch (e) {
        // Fallback Scenario
        return {
            id: 'sim_fallback',
            scenario: `You are working as a ${careerTitle} and a critical deadline is approaching. A key feature is broken.`,
            question: "What is your immediate action?",
            options: [
                "Hide the bug and deploy",
                "Communicate the risk to stakeholders immediately",
                "Blame the intern",
                "Panic and quit"
            ],
            correctIndex: 1,
            explanation: "Transparency and communication are key in professional environments."
        };
    }
};

export const generateChatResponse = async (
    message: string, 
    careerTitle: string,
    history: ChatMessage[]
): Promise<string> => {
    const isBugReport = /\b(bug|error|broken|crash|not working|fail)\b/i.test(message);
    
    if (isBugReport) {
        const ticketId = Math.floor(Math.random() * 90000) + 10000;
        return `I have detected a potential issue in your report. 
        
        **Bug Report Filed**
        Ticket ID: #BUG-${ticketId}
        Priority: High
        Status: Notified Engineering Team
        
        Thank you for helping improve PathFinder AI. Our team will review this shortly. In the meantime, is there anything else I can assist you with regarding ${careerTitle}?`;
    }

    const prompt = `
        ${NOVA_PERSONA}
        You are acting as a support assistant within the PathFinder AI app.
        Current Career Focus of User: ${careerTitle}.
        
        User Query: "${message}"
        
        Provide a helpful, concise response. 
        If the user asks about the app features, explain them.
        If the user asks about the career, provide expert advice.
    `;

    try {
        const ai = getAI();
        if (!ai) return "I'm running in offline mode. Please check your connection or API key.";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "I'm having trouble connecting to my neural network right now. Please try again.";
    } catch (e) {
        return "I am currently offline due to high traffic. Please try again later.";
    }
};

export const calculateRemainingDays = (roadmap: RoadmapPhase[]): number => {
    let count = 0;
    roadmap.forEach(p => {
        p.items.forEach(i => {
            if (i.status !== 'completed') {
                // Parse duration: "1 day" -> 1
                const match = i.duration.match(/(\d+)/);
                if (match) count += parseInt(match[0]);
                else count += 1; // Default
            }
        });
    });
    return count;
};


// --- FALLBACK HELPERS ---

const getFallbackCareers = (query?: string): CareerOption[] => [
    { id: 'fb1', title: 'Full Stack Developer', description: 'Build end-to-end web applications.', fitScore: 95, reason: 'High demand and versatile skill set matching generic profiles.' },
    { id: 'fb2', title: 'Data Scientist', description: 'Analyze data to drive decision making.', fitScore: 88, reason: 'Great for analytical minds.' },
    { id: 'fb3', title: 'Product Manager', description: 'Lead product vision and execution.', fitScore: 82, reason: 'Ideal for leadership and organization.' }
];

const getFallbackNews = (topic: string): NewsItem[] => [
    { title: `Top Trends in ${topic} for 2024`, url: `https://www.google.com/search?q=${encodeURIComponent(topic + " trends")}`, source: "TechTrends", summary: "", date: "Today" },
    { title: `Essential Skills for ${topic}`, url: `https://www.google.com/search?q=${encodeURIComponent(topic + " skills")}`, source: "CareerDaily", summary: "", date: "Yesterday" },
    { title: `Market Outlook: ${topic}`, url: `https://www.google.com/search?q=${encodeURIComponent(topic + " jobs")}`, source: "JobReport", summary: "", date: "2 days ago" },
    { title: `Beginner Guide to ${topic}`, url: `https://www.google.com/search?q=${encodeURIComponent("learn " + topic)}`, source: "LearnHub", summary: "", date: "Recent" },
    { title: `Expert Opinions on ${topic}`, url: `https://www.google.com/search?q=${encodeURIComponent(topic + " expert blogs")}`, source: "TechBlogs", summary: "", date: "Recent" }
];

const getFallbackDailyQuiz = (topic: string): DailyQuizItem => ({
    question: `What is the most critical soft skill for a successful ${topic}?`,
    options: ["Problem Solving", "Typing Speed", "Memorization", "Clock Watching"],
    correctIndex: 0,
    explanation: "Problem solving is the core of engineering and professional roles."
});

const getFallbackPracticeQuestions = (topic: string): PracticeQuestion[] => [
    { id: 'p1', question: `Which of the following is a key concept in ${topic}?`, options: ["Scalability", "Photosynthesis", "Cooking", "Painting"], correctIndex: 0, explanation: "Scalability is crucial for tech systems." },
    { id: 'p2', question: "What implies 'Best Practice'?", options: ["Doing it fast", "Doing it correctly and maintainably", "Doing it alone", "Copy pasting"], correctIndex: 1, explanation: "Maintainability is key." },
    { id: 'p3', question: "How to handle errors?", options: ["Ignore them", "Log and handle gracefully", "Crash the app", "Delete the code"], correctIndex: 1, explanation: "Robust error handling is essential." },
    { id: 'p4', question: "Collaboration tool example:", options: ["Git", "Notepad", "Paint", "Calculator"], correctIndex: 0, explanation: "Git is standard for version control." },
    { id: 'p5', question: "Agile methodology focuses on:", options: ["Iterative development", "Rigid planning", "No planning", "Solo work"], correctIndex: 0, explanation: "Agile is about iteration." }
];

const getFallbackInterviewQuestions = (topic: string): InterviewQuestion[] => [
    { id: 'i1', question: `Explain a challenging project you worked on in ${topic}.`, answer: "Use the STAR method: Situation, Task, Action, Result.", company: "General" },
    { id: 'i2', question: "What are your strengths and weaknesses?", answer: "Be honest but frame weaknesses as areas for growth.", company: "HR Round" },
    { id: 'i3', question: `How do you stay updated with ${topic}?`, answer: "Mention blogs, courses, newsletters, and projects.", company: "Tech Lead" },
    { id: 'i4', question: "Describe a time you had a conflict with a team member.", answer: "Focus on resolution and empathy.", company: "Behavioral" },
    { id: 'i5', question: `What is ${topic} architecture?`, answer: "Define high level structure and components.", company: "System Design" },
    { id: 'i6', question: "Why do you want to join us?", answer: "Align your goals with company vision.", company: "Culture Fit" },
    { id: 'i7', question: "Explain a complex concept to a 5 year old.", answer: "Use simple analogies.", company: "Communication" },
    { id: 'i8', question: "Where do you see yourself in 5 years?", answer: "Show ambition and alignment with the role.", company: "Future" }
];