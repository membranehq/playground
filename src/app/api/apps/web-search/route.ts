import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export interface WebSearchApp {
  name: string;
  url: string;
  description: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ apps: [] });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ apps: [], error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      tools: {
        web_search: anthropic.tools.webSearch_20250305(),
      },
      maxSteps: 3,
      prompt: `Search the web for SaaS applications matching "${query}". Find the top 5 most relevant SaaS/software applications.

Return ONLY a JSON array of objects with these fields:
- name: The app's official name
- url: The app's official website URL (homepage, not a subpage)
- description: A brief one-sentence description of what the app does

Return ONLY the JSON array, no other text. Example format:
[{"name": "Slack", "url": "https://slack.com", "description": "Team messaging and collaboration platform"}]`,
    });

    const text = result.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ apps: [] });
    }

    const apps: WebSearchApp[] = JSON.parse(jsonMatch[0]);
    const validApps = apps.filter((app) => app.name && app.url && app.description);

    return NextResponse.json({ apps: validApps });
  } catch (error) {
    console.error('[Web Search] Error:', error);
    return NextResponse.json({ apps: [], error: 'Failed to search for apps' });
  }
}
