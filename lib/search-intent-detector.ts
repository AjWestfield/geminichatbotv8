export interface SearchIntent {
  needsSearch: boolean;
  searchQuery?: string;
  searchType?: 'current_events' | 'factual' | 'research' | 'comparison' | 'technical' | 'product';
  timeFilter?: string;
  domainFilter?: string[];
  queryType?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
  estimatedDuration?: number; // seconds
  requiresAsync?: boolean;
  temporalContext?: {
    hasExplicitTimeframe: boolean;
    detectedTimeframe?: string;
    suggestedRecencyFilter?: 'day' | 'week' | 'month' | 'year' | 'none';
    isHistoricalQuery: boolean;
    requiresFreshness: boolean;
  };
  enhancedQuery?: string; // Query enhanced with temporal keywords
}

// Export the detector function for backward compatibility
export function detectSearchIntent(userMessage: string): SearchIntent {
  const detector = new SearchIntentDetector();
  return detector.detectSearchIntent(userMessage);
}

export class SearchIntentDetector {
  // Keywords that indicate need for current information
  private currentInfoKeywords = [
    'latest', 'current', 'today', 'now', 'recent', 'news',
    'update', 'this year', 'this month',
    'right now', 'at the moment', 'currently', 'breaking',
    'live', 'ongoing', 'happening', 'fresh', 'new', 'just released'
  ];
  
  // Add current and recent years dynamically
  private getCurrentYearKeywords(): string[] {
    const currentYear = new Date().getFullYear();
    return [
      currentYear.toString(),
      (currentYear - 1).toString(), // Last year might still be "current"
      (currentYear + 1).toString()  // Future year for upcoming events
    ];
  }

  // Keywords that indicate factual search needs
  private factualKeywords = [
    'what is', 'who is', 'when did', 'where is', 'how does',
    'price of', 'cost of', 'statistics', 'data', 'facts about'
  ];

  // Keywords for research/comparison
  private researchKeywords = [
    'compare', 'versus', 'vs', 'difference between', 'best',
    'top', 'review', 'analysis', 'research', 'study'
  ];

  // Technical/product keywords
  private technicalKeywords = [
    'api', 'documentation', 'tutorial', 'guide', 'how to',
    'install', 'setup', 'configure', 'troubleshoot', 'error',
    'bug', 'issue', 'version', 'release notes', 'changelog'
  ];

  // Product-related keywords
  private productKeywords = [
    'product', 'service', 'tool', 'software', 'app',
    'platform', 'features', 'pricing', 'plans', 'specs',
    'specifications', 'requirements', 'compatibility'
  ];

  // Historical time indicators
  private historicalIndicators = [
    'in 2023', 'in 2022', 'in 2021', 'in 2020', 'last year',
    'years ago', 'decades ago', 'historically', 'in the past',
    'previously', 'before', 'old', 'vintage', 'classic',
    'original', 'first', 'when it started', 'history of'
  ];

  // Explicit timeframe patterns
  private timeframePatterns = [
    /\b(today|yesterday|this week|last week|this month|last month|this year|last year)\b/i,
    /\b(in the last|within the last|past|recent)\s+(\d+)\s+(days?|weeks?|months?|years?)\b/i,
    /\b(since|from)\s+(\d{4}|\w+\s+\d{4})\b/i,
    /\b(in|during)\s+(\d{4}|january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  ];

  // Action keywords that should NOT trigger search
  private actionExclusions = [
    'generate', 'create', 'make', 'produce', 'build', 'design',
    'draw', 'paint', 'compose', 'write', 'edit', 'modify',
    'dialogue', 'conversation', 'multi-speaker', 'voice', 'audio',
    'tts', 'text to speech', 'narrate', 'speak', 'say',
    'image', 'picture', 'photo', 'video', 'animation',
    'download', 'save', 'extract'
  ];

  // Patterns that indicate creative/generative intent
  private generativePatterns = [
    /\b(create|generate|make|produce)\s+(a|an|some)?\s*(dialogue|conversation|audio|voice|image|video)/i,
    /\b(dia\s*tts|wavespeed|multi.?speaker|voice\s*acting)\b/i,
    /\b(alice|bob|charlie|speaker\s*\d+).{0,20}(say|speak|voice)/i,
    /\bcharacters?\s+(talking|speaking|conversing)\b/i,
    /\b(draw|paint|design|illustrate)\s+(a|an|some)?\s*(picture|image|scene)/i
  ];

  detectSearchIntent(userMessage: string): SearchIntent {
    const lowerMessage = userMessage.toLowerCase();

    // First check for action/generation exclusions
    const hasActionKeyword = this.actionExclusions.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Check for generative patterns
    const hasGenerativePattern = this.generativePatterns.some(pattern =>
      pattern.test(userMessage)
    );

    // If it's a generative/action request, don't search
    if (hasActionKeyword || hasGenerativePattern) {
      return { needsSearch: false };
    }

    // Check for different types of information needs
    const needsCurrentInfo = this.currentInfoKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    ) || this.getCurrentYearKeywords().some(year => 
      lowerMessage.includes(year)
    );

    const needsFactualInfo = this.factualKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    const needsResearch = this.researchKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    const needsTechnicalInfo = this.technicalKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    const needsProductInfo = this.productKeywords.some(keyword =>
      lowerMessage.includes(keyword)
    );

    // Determine if search is needed
    const needsSearch = needsCurrentInfo || needsFactualInfo || needsResearch ||
                       needsTechnicalInfo || needsProductInfo;

    if (!needsSearch) {
      return { needsSearch: false };
    }

    // Analyze temporal context
    const temporalContext = this.analyzeTemporalContext(userMessage, lowerMessage);

    // Determine search type with enhanced logic
    let searchType: SearchIntent['searchType'] = 'factual';
    if (needsCurrentInfo) searchType = 'current_events';
    else if (needsResearch) searchType = 'research';
    else if (needsTechnicalInfo) searchType = 'technical';
    else if (needsProductInfo) searchType = 'product';

    // Extract time filter based on temporal context
    let timeFilter: string | undefined;
    if (temporalContext.hasExplicitTimeframe && temporalContext.detectedTimeframe) {
      timeFilter = temporalContext.detectedTimeframe;
    } else if (temporalContext.suggestedRecencyFilter && temporalContext.suggestedRecencyFilter !== 'none') {
      timeFilter = temporalContext.suggestedRecencyFilter;
    }

    // Extract potential domain filters
    const domainFilter = this.extractDomainFilter(lowerMessage);

    // Create enhanced query with temporal keywords
    const enhancedQuery = this.enhanceQueryWithTemporalContext(userMessage, temporalContext, searchType);

    // Assess query complexity
    const complexity = this.assessComplexity(userMessage, searchType);
    const requiresAsync = complexity === 'complex' || searchType === 'research';
    const estimatedDuration = this.estimateDuration(complexity, searchType);

    return {
      needsSearch: true,
      searchQuery: this.extractSearchQuery(userMessage),
      searchType,
      timeFilter,
      domainFilter,
      queryType: searchType,
      complexity,
      estimatedDuration,
      requiresAsync,
      temporalContext,
      enhancedQuery
    };
  }

  private analyzeTemporalContext(userMessage: string, lowerMessage: string) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    // Check for explicit timeframe mentions
    const hasExplicitTimeframe = this.timeframePatterns.some(pattern => pattern.test(userMessage));

    // Check for historical indicators
    const isHistoricalQuery = this.historicalIndicators.some(indicator =>
      lowerMessage.includes(indicator)
    );

    // Detect specific timeframes
    let detectedTimeframe: string | undefined;
    if (lowerMessage.includes('today') || lowerMessage.includes('right now')) {
      detectedTimeframe = 'day';
    } else if (lowerMessage.includes('this week') || lowerMessage.includes('last week')) {
      detectedTimeframe = 'week';
    } else if (lowerMessage.includes('this month') || lowerMessage.includes('last month')) {
      detectedTimeframe = 'month';
    } else if (lowerMessage.includes('this year') || lowerMessage.includes('last year')) {
      detectedTimeframe = 'year';
    }

    // Determine freshness requirements based on query type
    let requiresFreshness = false;
    let suggestedRecencyFilter: 'day' | 'week' | 'month' | 'year' | 'none' = 'none';

    if (!isHistoricalQuery && !hasExplicitTimeframe) {
      // Auto-determine recency filter based on content type
      if (this.currentInfoKeywords.some(keyword => lowerMessage.includes(keyword))) {
        // News/current events: last 7 days
        requiresFreshness = true;
        suggestedRecencyFilter = 'week';
      } else if (this.technicalKeywords.some(keyword => lowerMessage.includes(keyword))) {
        // Technical info: last 1 year
        suggestedRecencyFilter = 'year';
      } else if (this.productKeywords.some(keyword => lowerMessage.includes(keyword))) {
        // Product info: last 1 year
        suggestedRecencyFilter = 'year';
      } else {
        // General information: last 6 months
        suggestedRecencyFilter = 'month';
      }
    }

    return {
      hasExplicitTimeframe,
      detectedTimeframe,
      suggestedRecencyFilter,
      isHistoricalQuery,
      requiresFreshness
    };
  }

  private enhanceQueryWithTemporalContext(
    originalQuery: string,
    temporalContext: any,
    searchType: SearchIntent['searchType']
  ): string {
    const currentYear = new Date().getFullYear();
    let enhancedQuery = originalQuery;

    // Don't enhance if user specified historical timeframe
    if (temporalContext.isHistoricalQuery || temporalContext.hasExplicitTimeframe) {
      return enhancedQuery;
    }

    // Add temporal keywords based on search type
    switch (searchType) {
      case 'current_events':
        if (!enhancedQuery.toLowerCase().includes(currentYear.toString()) && !enhancedQuery.toLowerCase().includes('latest')) {
          enhancedQuery += ` latest ${currentYear}`;
        }
        break;
      case 'technical':
        if (!enhancedQuery.toLowerCase().includes(currentYear.toString()) && !enhancedQuery.toLowerCase().includes('current')) {
          enhancedQuery += ` current ${currentYear}`;
        }
        break;
      case 'product':
        if (!enhancedQuery.toLowerCase().includes(currentYear.toString()) && !enhancedQuery.toLowerCase().includes('latest')) {
          enhancedQuery += ` latest ${currentYear}`;
        }
        break;
      case 'factual':
        // Only add year for factual queries that might have recent updates
        if (this.mightHaveRecentUpdates(originalQuery)) {
          enhancedQuery += ` ${currentYear}`;
        }
        break;
    }

    return enhancedQuery.trim();
  }

  private mightHaveRecentUpdates(query: string): boolean {
    const updatableTopics = [
      'statistics', 'data', 'population', 'economy', 'market',
      'technology', 'software', 'app', 'service', 'company',
      'price', 'cost', 'value', 'rate', 'percentage'
    ];

    return updatableTopics.some(topic =>
      query.toLowerCase().includes(topic)
    );
  }

  private extractSearchQuery(message: string): string {
    // Remove common question words to create better search query
    return message
      .replace(/^(what|who|when|where|how|why|is|are|can|could|would|should)\s+/i, '')
      .replace(/\?$/, '')
      .trim();
  }

  private extractDomainFilter(message: string): string[] | undefined {
    // Look for specific domain mentions
    const domains: string[] = [];

    if (message.includes('reddit')) domains.push('reddit.com');
    if (message.includes('wikipedia')) domains.push('wikipedia.org');
    if (message.includes('github')) domains.push('github.com');
    if (message.includes('stackoverflow')) domains.push('stackoverflow.com');

    return domains.length > 0 ? domains : undefined;
  }

  private assessComplexity(message: string, searchType: SearchIntent['searchType']): SearchIntent['complexity'] {
    const wordCount = message.split(/\s+/).length;
    const hasMultipleQuestions = (message.match(/\?/g) || []).length > 1;
    const hasComplexTerms = /\b(analyze|compare|evaluate|investigate|comprehensive|detailed)\b/i.test(message);
    const hasMultipleConcepts = this.countConcepts(message) > 2;

    // Research type queries are inherently complex
    if (searchType === 'research' || searchType === 'comparison') {
      return 'complex';
    }

    // Technical queries can be complex if they involve troubleshooting
    if (searchType === 'technical' && /\b(error|bug|issue|problem|troubleshoot|fix)\b/i.test(message)) {
      return 'moderate';
    }

    // Score complexity
    let complexityScore = 0;
    if (wordCount > 50) complexityScore += 2;
    else if (wordCount > 20) complexityScore += 1;

    if (hasMultipleQuestions) complexityScore += 2;
    if (hasComplexTerms) complexityScore += 1;
    if (hasMultipleConcepts) complexityScore += 1;

    // Determine complexity level
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  private countConcepts(message: string): number {
    // Simple concept counting based on named entities and key terms
    const concepts = new Set<string>();

    // Extract potential concepts (simplified - could use NLP library)
    const words = message.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'when', 'where', 'who', 'how', 'why']);

    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        concepts.add(word);
      }
    }

    return concepts.size;
  }

  private estimateDuration(complexity: SearchIntent['complexity'], searchType?: SearchIntent['searchType']): number {
    // Base duration estimates in seconds
    const baseDurations = {
      simple: {
        current_events: 2,
        factual: 3,
        research: 10,
        comparison: 8,
        technical: 5,
        product: 4
      },
      moderate: {
        current_events: 5,
        factual: 8,
        research: 30,
        comparison: 20,
        technical: 12,
        product: 10
      },
      complex: {
        current_events: 10,
        factual: 15,
        research: 60,
        comparison: 40,
        technical: 25,
        product: 20
      }
    };

    const complexityDurations = baseDurations[complexity || 'simple'];
    return complexityDurations[searchType || 'factual'] || 5;
  }
}
