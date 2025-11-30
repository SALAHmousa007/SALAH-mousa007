
import { GoogleGenAI, Type } from "@google/genai";
import { Observer, Committee } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSampleData = async (): Promise<{ observers: Observer[], committees: Committee[], schedule: any[] }> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    Generate realistic sample data for a high school exam system in Kuwait (Boys School).
    1. Teachers: List 70 Full Arabic male names (First Name + Father Name + Family Name). 
       - Ensure names are at least 3 parts (e.g., "Muhammad Ahmed Al-Kandari").
       - Assign distinct departments (Math, Arabic, English, Science, Islamics, Social Studies).
       - Assign 'mullahiz' to most.
       - Assign 'muraqib' to 6 specific senior teachers.
    2. Committees: Generate EXACTLY 5 Main Committees:
       - "لجنة الصف العاشر" (Grade 10) with 8 sub-committees.
       - "لجنة الصف الحادي عشر علمي (11ع)" (Grade 11 Science) with 6 sub-committees.
       - "لجنة الصف الحادي عشر أدبي (11د)" (Grade 11 Arts - 11D) with 5 sub-committees.
       - "لجنة الصف الثاني عشر علمي (12ع)" (Grade 12 Science) with 6 sub-committees.
       - "لجنة الصف الثاني عشر أدبي (12د)" (Grade 12 Arts - 12D) with 5 sub-committees.
    3. Schedule: Generate 10 exam days starting from Sunday.
       - dayOfWeek: "الأحد", "الاثنين", "الثلاثاء", etc.
       - subject10: Grade 10 subject (e.g. Math, Arabic).
       - subject11Sci: Grade 11 Science subject (e.g. Physics, Math).
       - subject11Arts: Grade 11 Arts subject (e.g. History, Geography).
       - subject12Sci: Grade 12 Science subject.
       - subject12Arts: Grade 12 Arts subject.
    
    Output JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teachers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  department: { type: Type.STRING },
                  role: { type: Type.STRING, enum: ["mullahiz", "muraqib"] }
                }
              }
            },
            committees: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        subCount: { type: Type.NUMBER }
                    }
                }
            },
            schedule: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        dayOfWeek: { type: Type.STRING },
                        subject10: { type: Type.STRING },
                        subject11Sci: { type: Type.STRING },
                        subject11Arts: { type: Type.STRING },
                        subject12Sci: { type: Type.STRING },
                        subject12Arts: { type: Type.STRING },
                        date: { type: Type.STRING }
                    }
                }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");

    const data = JSON.parse(text);

    const observers: Observer[] = data.teachers.map((t: any, index: number) => ({
      id: `gen-${index}-${Date.now()}`,
      name: t.name,
      department: t.department || "عام",
      role: t.role || 'mullahiz'
    }));

    const committees: Committee[] = (data.committees || []).map((c: any, idx: number) => ({
      id: `comm-gen-${idx}-${Date.now()}`,
      name: c.name,
      subCommitteesCount: c.subCount || 8, 
      observersPerRoom: 2 // Explicitly 2 as requested
    }));

    return { observers, committees, schedule: data.schedule || [] };

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
