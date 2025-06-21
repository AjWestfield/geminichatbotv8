import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient } from '@/lib/perplexity-client';
import { SearchIntentDetector } from '@/lib/search-intent-detector';

export async function POST(req: NextRequest) {
  try {
    const { messages, forceSearch = false } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Get the last user message
    const lastUserMessage = messages
      .filter((m: any) => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'No user message found' },
        { status: 400 }
      );
    }

    // Detect if search is needed
    const detector = new SearchIntentDetector();
    const searchIntent = detector.detectSearchIntent(lastUserMessage.content);

    // If no search needed and not forced, return indicator
    if (!searchIntent.needsSearch && !forceSearch) {
      return NextResponse.json({
        needsSearch: false,
        message: 'No web search required for this query'
      });
    }

    // Prepare search options based on enhanced intent
    const searchOptions: any = {
      search_mode: 'web',
      return_images: true, // Always request images for better visual results
      return_related_questions: true
    };

    // Apply temporal filtering with enhanced logic
    if (searchIntent.timeFilter) {
      searchOptions.search_recency_filter = searchIntent.timeFilter;
    } else if (searchIntent.temporalContext?.suggestedRecencyFilter &&
               searchIntent.temporalContext.suggestedRecencyFilter !== 'none') {
      searchOptions.search_recency_filter = searchIntent.temporalContext.suggestedRecencyFilter;
    }

    if (searchIntent.domainFilter) {
      searchOptions.search_domain_filter = searchIntent.domainFilter;
    }

    // Enhance system prompt with temporal context
    const currentDate = new Date()
    const dateString = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let temporalGuidance = ''
    if (searchIntent.temporalContext?.requiresFreshness) {
      temporalGuidance = '\nPrioritize the most recent information and clearly indicate when information was published or last updated.'
    } else if (searchIntent.temporalContext?.isHistoricalQuery) {
      temporalGuidance = '\nFocus on historical information as requested by the user.'
    } else {
      temporalGuidance = '\nProvide current information while noting the publication date when relevant.'
    }

    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant with access to real-time web search.
Today's date is ${dateString}.
Current time: ${currentDate.toLocaleTimeString('en-US')}.
${temporalGuidance}
Always provide the most current and up-to-date information based on search results.
Always cite your sources when using searched information.
Format citations as [Source Name](URL) when referencing search results.
When information might be time-sensitive, clearly indicate the publication date or last update time.`
    };

    // Use enhanced query if available for better temporal results
    const queryToUse = searchIntent.enhancedQuery || lastUserMessage.content

    console.log('[Perplexity Search] Query enhancement:', {
      original: lastUserMessage.content,
      enhanced: searchIntent.enhancedQuery,
      using: queryToUse,
      temporalContext: searchIntent.temporalContext
    })

    // For Perplexity API, we only send system message + last user message
    // to comply with their strict alternating message requirement
    const perplexityMessages = [
      systemMessage,
      {
        role: lastUserMessage.role,
        content: queryToUse
      }
    ];

    // Perform the search
    const client = new PerplexityClient();
    const response = await client.search(perplexityMessages, searchOptions);

    // Log the full response to see what data is available
    console.log('[Perplexity API] Full response structure:', {
      hasChoices: !!response.choices,
      hasCitations: !!response.citations,
      hasSearchResults: !!response.search_results,
      hasImages: !!(response as any).images,
      responseKeys: Object.keys(response),
      // Log first few items if they exist
      firstSearchResult: response.search_results?.[0],
      firstImage: (response as any).images?.[0]
    });

    return NextResponse.json({
      needsSearch: true,
      response,
      searchIntent,
      citations: response.citations,
      searchResults: response.search_results,
      images: response.images // Pass through images if available
    });

  } catch (error: any) {
    console.error('Perplexity search error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        details: error.response?.data || error.message
      },
      { status: 500 }
    );
  }
}
