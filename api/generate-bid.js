// api/generate-bid.js
// Vercel Serverless Function
// Uses CommonJS (module.exports) — required for Vercel Node.js runtime

module.exports = async function handler(req, res) {

  // ── CORS headers ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Check API key exists ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set');
    return res.status(500).json({
      error: 'API key not configured. Add ANTHROPIC_API_KEY in Vercel environment variables then redeploy.'
    });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided in request body' });
  }

  try {
    console.log('Calling Anthropic API with model: claude-haiku-4-5-20251001');

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
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API returned error:', JSON.stringify(data));
      return res.status(500).json({
        error: 'Anthropic error: ' + (data.error && data.error.message ? data.error.message : JSON.stringify(data))
      });
    }

    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Unexpected Anthropic response shape:', JSON.stringify(data));
      return res.status(500).json({ error: 'Unexpected response from AI. Please try again.' });
    }

    const result = data.content[0].text;
    console.log('Success. Response length:', result.length);

    return res.status(200).json({ result });

  } catch (err) {
    console.error('Caught error in handler:', err.message);
    return res.status(500).json({ error: 'Server exception: ' + err.message });
  }
};
