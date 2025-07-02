import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'gemini-chatbot-v7',
    timestamp: new Date().toISOString()
  });
}