export async function getAiRating(title: string, author: string, contextBooks: string[]): Promise<{
  score: number;
  intro: string;
  readingAdvice: string;
  scoreExplanation: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.warn("Missing OPENROUTER_API_KEY, returning mock data");
    return {
      score: 50,
      intro: "API Key missing. Please set OPENROUTER_API_KEY in .env.local",
      readingAdvice: "Cannot generate advice without API key.",
      scoreExplanation: "Mock score. Configure API to get real ratings."
    };
  }

  const prompt = `
    Rate the book "${title}" by ${author} for a reading challenge.
    
    Context - the reader is also reading these books:
    ${contextBooks.join(", ")}
    
    Provide:
    1. Book Score (0-100): A score reflecting the TIME and ENERGY required to read this book. Consider:
       - Reading complexity (dense prose, technical jargon, philosophical depth)
       - Length and time commitment
       - Mental effort required
       - Compare relatively to the other books in the list (without naming them) - is this harder or easier?
       Higher score = more challenging = more reward.
    2. Intro: A brief introduction to the book (2-3 sentences, no spoilers).
    3. Reading Advice: Tips for reading this book effectively (no spoilers).
    4. Score Explanation: Why this score compared to a typical book or others in the list (don't name specific books).
    
    Return JSON only: { "score": number, "intro": "string", "readingAdvice": "string", "scoreExplanation": "string" }
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free",
        messages: [
          { role: "system", content: "You are a literary critic and difficulty assessor. Output JSON only." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Rating Error:", error);
    return {
      score: 0,
      intro: "Failed to get AI rating. Please try again.",
      readingAdvice: "",
      scoreExplanation: ""
    };
  }
}
