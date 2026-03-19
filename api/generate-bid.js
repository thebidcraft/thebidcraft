// api/generate-bid.js
// Vercel Serverless Function — CommonJS format

module.exports = async function handler(req, res) {

  // ── CORS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Check API key ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'API key not configured in Vercel environment variables.' });
  }

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Anthropic error: ' + (data.error && data.error.message ? data.error.message : JSON.stringify(data))
      });
    }

    // ── Get raw text from AI response ──
    let result = data.content[0].text;

    // ── Strip markdown code fences if AI wrapped the JSON ──
    // Handles: ```json ... ``` or ``` ... ```
    result = result.trim();
    if (result.startsWith('```')) {
      result = result
        .replace(/^```(?:json)?\s*/i, '')  // remove opening ```json or ```
        .replace(/\s*```\s*$/i, '')         // remove closing ```
        .trim();
    }

    // ── Validate it is actually JSON before sending back ──
    try {
      JSON.parse(result);
    } catch (parseErr) {
      console.error('AI returned invalid JSON after stripping:', result);
      return res.status(500).json({
        error: 'AI returned an unexpected format. Please try generating again.'
      });
    }

    console.log('Success — returning clean JSON');
    return res.status(200).json({ result });

  } catch (err) {
    console.error('Server exception:', err.message);
    return res.status(500).json({ error: 'Server exception: ' + err.message });
  }
};
