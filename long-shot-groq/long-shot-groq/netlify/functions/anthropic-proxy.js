// Netlify Function to proxy Groq API calls (FREE!)
// Groq provides 14,400 free requests per day

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get the request body from Anthropic format
    const anthropicRequest = JSON.parse(event.body);

    // Convert Anthropic format to Groq format
    const groqRequest = {
      model: "llama-3.3-70b-versatile", // Free & powerful Groq model
      messages: anthropicRequest.messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : 
                 msg.content.map(c => c.text || '').join('\n')
      })),
      max_tokens: anthropicRequest.max_tokens || 4000,
      temperature: 0.7
    };

    // Add tools if provided (for web search)
    if (anthropicRequest.tools) {
      // Note: Groq doesn't support tools yet, so we'll ignore this
      // The app will still work without web search
    }

    // Make the request to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}` // Secret key stored in Netlify
      },
      body: JSON.stringify(groqRequest)
    });

    const groqData = await response.json();

    // Convert Groq response back to Anthropic format
    const anthropicResponse = {
      id: groqData.id,
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: groqData.choices[0].message.content
        }
      ],
      model: groqData.model,
      stop_reason: "end_turn",
      usage: groqData.usage
    };

    // Return the response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(anthropicResponse)
    };

  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        details: 'Check Netlify function logs for more info'
      })
    };
  }
};
