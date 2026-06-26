exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY not set in Netlify environment variables' }) };
  }

  const TEXT_FIELDS = ['mission_statement','role_title','tasks','top_skills','student_requirements','specific_requirements','ideal_candidate','application_instructions','other_info'];

  let input;
  try {
    const body = JSON.parse(event.body || '{}');
    input = {};
    TEXT_FIELDS.forEach(k => { if (body[k]) input[k] = body[k]; });
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!Object.keys(input).length) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: '{}' };
  }

  const prompt = `You are cleaning up job listing content for a high school Work-Based Learning program.

Rules:
- Fix grammar, spelling, capitalization, and punctuation throughout
- "role_title": proper Title Case (e.g. "Marketing Intern")
- "mission_statement": polished 1–2 sentence paragraph, professional tone
- "tasks": rewrite as parallel gerund phrases (e.g. "- Assisting with..."), one per line, each starting with "- "
- "top_skills": one skill per line starting with "- ", concise noun phrases
- "ideal_candidate": 2–3 clear, professional sentences; approachable for high school students
- "student_requirements" / "specific_requirements": clean up phrasing, fix grammar
- "application_instructions": clean professional sentences
- "other_info": fix grammar and punctuation
- Do NOT alter company names, email addresses, URLs, dollar amounts, or specific times

Input:
${JSON.stringify(input, null, 2)}

Return ONLY valid JSON with the same field names. No markdown, no explanation.`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1500 }
  });

  // Try as API key first, then as Bearer token (handles both AIzaSy... and AQ... formats)
  let res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: requestBody }
  );

  if (!res.ok && (res.status === 401 || res.status === 403)) {
    res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: requestBody }
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    return { statusCode: res.status, body: JSON.stringify({ error: `Gemini ${res.status}: ${errText.slice(0, 200)}` }) };
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { statusCode: 500, body: JSON.stringify({ error: 'No JSON returned from Gemini' }) };
  }

  const result = JSON.parse(match[0]);
  const safe = {};
  TEXT_FIELDS.forEach(k => { if (result[k]) safe[k] = result[k]; });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(safe)
  };
};
