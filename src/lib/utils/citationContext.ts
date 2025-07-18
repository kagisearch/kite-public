import type { Article } from '$lib/types';

export interface CitationMapping {
  // Maps citation identifier (e.g., "nytimes.com#2") to global citation number
  citationToNumber: Map<string, number>;
  // Maps global citation number to article
  numberToArticle: Map<number, Article>;
  // Total number of unique citations
  totalCitations: number;
}

/**
 * Extract all citations from a text string
 */
function extractCitations(text: string): string[] {
  const citations: string[] = [];
  // Match both [domain#position] and [common] formats
  const citationPattern = /\[((?:[^#\]]+#\d+)|common)\]/g;
  let match;
  
  while ((match = citationPattern.exec(text)) !== null) {
    citations.push(match[1]);
  }
  
  return citations;
}

/**
 * Build a global citation mapping for a story
 * Scans all text fields in the story to find citations and assigns them global numbers
 */
export function buildCitationMapping(story: any, articles: Article[]): CitationMapping {
  const citationToNumber = new Map<string, number>();
  const numberToArticle = new Map<number, Article>();
  let citationCounter = 1;
  
  
  // Helper to find article by domain and position
  const findArticle = (domain: string, position: number): Article | undefined => {
    const searchDomain = domain.toLowerCase();
    
    // Step 1: Try exact match
    const exactMatches = articles.filter(article => 
      article.domain.toLowerCase() === searchDomain
    );
    
    if (exactMatches.length > 0) {
      return exactMatches[position - 1];
    }
    
    // Step 2: If search domain has no extension, try exact base domain match
    if (!searchDomain.includes('.')) {
      // Look for exact base domain match (e.g., "time" matches "time.com" but not "times.com" or "nytimes.com")
      const exactBaseMatches = articles.filter(article => {
        const articleBaseDomain = article.domain.toLowerCase().split('.')[0];
        return articleBaseDomain === searchDomain;
      });
      
      if (exactBaseMatches.length > 0) {
        // Get unique domains from exact base matches
        const uniqueDomains = [...new Set(exactBaseMatches.map(a => a.domain))];
        
        if (uniqueDomains.length === 1) {
          // Only one domain with this exact base - use it
          return exactBaseMatches[position - 1];
        } else {
          // Multiple domains with same base (e.g., time.com, time.org) - ambiguous
          console.warn(`Citation [${domain}#${position}] is ambiguous - multiple domains with base "${searchDomain}": ${uniqueDomains.join(', ')}`);
          console.warn('Removing this citation to avoid showing incorrect information');
          return undefined;
        }
      }
    }
    
    // Step 3: Try partial matches (domain contains the search string)
    const partialMatches = articles.filter(article => 
      article.domain.toLowerCase().includes(searchDomain)
    );
    
    if (partialMatches.length > 0) {
      // Get unique domains from partial matches
      const uniqueDomains = [...new Set(partialMatches.map(a => a.domain))];
      
      if (uniqueDomains.length === 1) {
        // Only one domain contains the search string - use it
        const domainArticles = partialMatches.filter(article => 
          article.domain === uniqueDomains[0]
        );
        return domainArticles[position - 1];
      } else {
        // Multiple domains contain the search string - ambiguous
        console.warn(`Citation [${domain}#${position}] is ambiguous - multiple partial matches: ${uniqueDomains.join(', ')}`);
        console.warn('Removing this citation to avoid showing incorrect information');
        return undefined;
      }
    }
    
    // Step 4: No matches found at all
    console.warn(`Could not find article for citation [${domain}#${position}] - no matching domains found`);
    const availableDomains = [...new Set(articles.map(a => a.domain))];
    console.warn(`Available domains: ${availableDomains.join(', ')}`);
    return undefined;
  };
  
  // Helper to process citations in any text field
  const processCitations = (text: string | undefined) => {
    if (!text || typeof text !== 'string') return;
    
    const citations = extractCitations(text);
    
    
    for (const citation of citations) {
      // Skip if we've already assigned a number to this citation
      if (citationToNumber.has(citation)) continue;
      
      // Handle [common] citations specially
      if (citation === 'common') {
        // Assign special marker for common knowledge
        citationToNumber.set('common', -1); // Use -1 as special marker for common knowledge
        continue;
      }
      
      // Parse domain and position
      const match = citation.match(/^([^#]+)#(\d+)$/);
      if (!match) continue;
      
      const domain = match[1];
      const position = parseInt(match[2]);
      
      // Find the corresponding article
      const article = findArticle(domain, position);
      if (!article) {
        // Get available domains for better error message
        const availableDomains = [...new Set(articles.map(a => a.domain))];
        const matchingDomains = availableDomains.filter(d => d.toLowerCase().includes(domain.toLowerCase()));
        
        if (matchingDomains.length === 0) {
          console.warn(`Could not find article for citation [${domain}#${position}] - no domains contain "${domain}"`);
          console.warn(`Available domains: ${availableDomains.join(', ')}`);
        } else {
          console.warn(`Could not find article for citation [${domain}#${position}] - position ${position} not found`);
          console.warn(`Matching domain(s): ${matchingDomains.join(', ')}`);
          const articlesFromDomain = articles.filter(a => matchingDomains.includes(a.domain));
          console.warn(`Articles available from matching domain(s): ${articlesFromDomain.length}`);
        }
        continue;
      }
      
      // Assign a global citation number
      citationToNumber.set(citation, citationCounter);
      numberToArticle.set(citationCounter, article);
      citationCounter++;
    }
  };
  
  // Process all text fields in the story that might contain citations
  processCitations(story.short_summary);
  processCitations(story.historical_background);
  processCitations(story.humanitarian_impact);
  processCitations(story.business_angle_text);
  processCitations(story.technical_specifications);
  processCitations(story.design_principles);
  processCitations(story.league_standings);
  processCitations(story.did_you_know);
  processCitations(story.quote);
  processCitations(story.title); // Titles can have citations too
  processCitations(story.location); // Location might have citations
  
  // Process array fields
  if (story.talking_points?.length) {
    story.talking_points.forEach((point: string) => processCitations(point));
  }
  
  if (story.perspectives?.length) {
    story.perspectives.forEach((perspective: any) => {
      processCitations(perspective.text);
      processCitations(perspective.source);
    });
  }
  
  if (story.technical_details?.length) {
    story.technical_details.forEach((detail: string) => processCitations(detail));
  }
  
  if (story.business_angle_points?.length) {
    story.business_angle_points.forEach((point: string) => processCitations(point));
  }
  
  if (story.scientific_significance?.length) {
    story.scientific_significance.forEach((point: string) => processCitations(point));
  }
  
  if (story.travel_advisory?.length) {
    story.travel_advisory.forEach((point: string) => processCitations(point));
  }
  
  if (story.performance_statistics?.length) {
    story.performance_statistics.forEach((stat: string) => processCitations(stat));
  }
  
  if (story.user_experience_impact?.length) {
    story.user_experience_impact.forEach((impact: string) => processCitations(impact));
  }
  
  if (story.gameplay_mechanics?.length) {
    story.gameplay_mechanics.forEach((mechanic: string) => processCitations(mechanic));
  }
  
  if (story.gaming_industry_impact?.length) {
    story.gaming_industry_impact.forEach((impact: string) => processCitations(impact));
  }
  
  if (story.timeline?.length) {
    story.timeline.forEach((event: any) => {
      if (typeof event === 'string') {
        processCitations(event);
      } else if (typeof event === 'object') {
        processCitations(event.date);
        processCitations(event.description);
        processCitations(event.event);
        processCitations(event.details);
      }
    });
  }
  
  if (story.international_reactions?.length) {
    story.international_reactions.forEach((reaction: any) => {
      if (typeof reaction === 'string') {
        processCitations(reaction);
      } else if (typeof reaction === 'object') {
        processCitations(reaction.country);
        processCitations(reaction.reaction);
        processCitations(reaction.response);
      }
    });
  }
  
  if (story.suggested_qna?.length) {
    story.suggested_qna.forEach((qna: any) => {
      processCitations(qna.question);
      processCitations(qna.answer);
    });
  }
  
  if (story.user_action_items?.length) {
    story.user_action_items.forEach((item: string) => processCitations(item));
  }
  
  const mapping = {
    citationToNumber,
    numberToArticle,
    totalCitations: citationCounter - 1
  };
  
  
  return mapping;
}

/**
 * Replace domain-based citations with numbered citations using the global mapping
 */
export function replaceWithNumberedCitations(text: string, mapping: CitationMapping): string {
  if (!text || typeof text !== 'string') return text;
  
  return text.replace(/\[((?:[^#\]]+#\d+)|common)\]/g, (match, citation) => {
    const number = mapping.citationToNumber.get(citation);
    if (number === -1) {
      // Special case for common knowledge
      return '[*]';
    } else if (number) {
      return `[${number}]`;
    } else {
      // Citation couldn't be mapped - remove it
      console.log(`Removing unmapped citation: ${match}`);
      return '';
    }
  }).replace(/\s+/g, ' ').trim(); // Clean up any extra spaces left by removed citations
}