const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un assistant qui categorise des articles web. Retourne UNIQUEMENT un JSON valide avec 3 champs :
- summary (string, resume en 2-3 phrases en francais)
- category (string, une parmi : {{categories}})
- priority (number 1-5, 5 = tres important pour un professionnel du web/SEO)

Pas de markdown, pas de backticks, juste le JSON brut.`;

async function analyzeArticle(title, url, apiKey, model, categories) {
  const systemPrompt = SYSTEM_PROMPT.replace("{{categories}}", categories.join(", "));

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://read-later",
      "X-Title": "Read Later Extension",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Titre: ${title}\nURL: ${url}` },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Reponse vide de l'API");

  const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const result = JSON.parse(cleaned);

  if (!result.summary || !result.category || result.priority === undefined) {
    throw new Error("Champs manquants dans la reponse IA");
  }

  const validPriority = Math.max(1, Math.min(5, Math.round(result.priority)));
  const validCategory = categories.includes(result.category) ? result.category : "Autre";

  return {
    summary: result.summary,
    category: validCategory,
    priority: validPriority,
  };
}

async function testApiKey(apiKey, model) {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://read-later",
      "X-Title": "Read Later Extension",
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: "Reponds juste OK." }],
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorBody}`);
  }

  return true;
}
