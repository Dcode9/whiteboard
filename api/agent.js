module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, strokes, backgroundColor, backgroundPattern, viewOffset, viewZoom } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.CEREBRAS_API) {
      return res.status(500).json({ error: 'CEREBRAS_API not configured' });
    }

    // Connect to Cerebras API
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CEREBRAS_API}`
      },
      body: JSON.stringify({
        model: 'gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: `You are an Agentic AI assistant embedded in a whiteboard application.
Your task is to modify the existing whiteboard state (strokes, background color, pattern, etc.) based on the user's prompt.
You must output valid JSON containing the new full state of the whiteboard.
Do not output anything other than the JSON object. No markdown formatting, no explanations.

The JSON schema must follow:
{
  "strokes": [
    {
      "tool": "pen|line|rect|circle|triangle",
      "color": "string (hex code)",
      "width": number,
      "points": [{"x": number, "y": number}, ...],
      "type": "string (optional)"
    }
  ],
  "backgroundColor": "string (hex code)",
  "backgroundPattern": "plain|grid|ruled",
  "viewOffset": {"x": number, "y": number},
  "viewZoom": number
}
`
          },
          {
            role: 'user',
            content: `Current whiteboard state:\n\n${JSON.stringify({ strokes, backgroundColor, backgroundPattern, viewOffset, viewZoom })}\n\nUser prompt: ${prompt}`
          }
        ],
        temperature: 0.1,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cerebras API error:', errorText);
      return res.status(response.status).json({ error: 'Failed to communicate with Agentic AI', details: errorText });
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content.trim();

    // Remove markdown code blocks if any
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (aiResponse.startsWith('```')) {
      aiResponse = aiResponse.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      const newState = JSON.parse(aiResponse);
      return res.json(newState);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      return res.status(500).json({ error: 'Agentic AI returned invalid format', details: aiResponse });
    }

  } catch (error) {
    console.error('Agent error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
