import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { sessionId, query, actions, context } = await request.json();
    
    if (!sessionId || !query) {
      return NextResponse.json(
        { error: 'Session ID and query are required' },
        { status: 400 }
      );
    }

    console.log('[Browser Agent Generate] Creating response for:', { sessionId, query });

    // Create a prompt for Gemini based on browser actions
    const actionsSummary = actions.map((action: any) => 
      `- ${action.description} at ${new Date(action.timestamp).toLocaleTimeString()}`
    ).join('\n');

    const prompt = `
You are analyzing web research results from browser automation.

Research Query: ${query}

Browser Actions Performed:
${actionsSummary}

Current URL: ${context || 'Unknown'}

Based on the browser actions performed and the research query, provide a comprehensive response that:
1. Summarizes what was found during the research
2. Answers the user's query based on the information gathered
3. Provides relevant insights and analysis
4. Suggests follow-up actions if needed

Keep the response conversational and helpful.
`;

    // Generate response with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    console.log('[Browser Agent Generate] Response generated');
    
    return NextResponse.json({ 
      response,
      sessionId,
      actions: actions.length 
    });
    
  } catch (error) {
    console.error('[Browser Agent Generate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
