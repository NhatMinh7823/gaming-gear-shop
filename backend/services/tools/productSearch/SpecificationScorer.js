class SpecificationScorer {
  /**
   * Calculate intelligent specification score based on semantic matching
   */
  static calculateSpecificationScore(query, specifications) {
    let totalScore = 0;
    let matches = [];
    
    // Normalize query and specs for better matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Create searchable text from specifications
    const specEntries = Object.entries(specifications).map(([key, value]) => ({
      key: key.toLowerCase(),
      value: String(value).toLowerCase(),
      combined: `${key} ${value}`.toLowerCase()
    }));
    
    // Semantic similarity patterns for common technical terms
    const technicalPatterns = {
      // Connection types
      'cổng': ['port', 'connector', 'connection', 'interface'],
      'kết nối': ['connectivity', 'connection', 'interface'],
      'thunderbolt': ['thunderbolt', 'tb3', 'tb4'],
      'usb': ['usb', 'usb-c', 'usb-a', 'usb3', 'usb2'],
      'hdmi': ['hdmi', 'high definition'],
      'displayport': ['displayport', 'dp', 'display port'],
      
      // Quantities
      'hai': ['2', 'two', 'dual', 'double'],
      'ba': ['3', 'three', 'triple'],
      'bốn': ['4', 'four', 'quad'],
      'một': ['1', 'one', 'single'],
      
      // Display specs
      'độ phân giải': ['resolution', 'pixel', 'dpi'],
      '4k': ['4k', '3840', '2160', 'uhd'],
      '8k': ['8k', '7680', '4320'],
      'full hd': ['1920', '1080', 'fhd', 'full hd'],
      
      // Performance
      'tần số': ['frequency', 'hz', 'rate', 'refresh'],
      'fps': ['fps', 'frame', 'rate'],
      'ms': ['ms', 'millisecond', 'response'],
      
      // Types
      'cơ học': ['mechanical', 'switch', 'tactile'],
      'không dây': ['wireless', 'bluetooth', 'wifi'],
      'gaming': ['gaming', 'game', 'esport'],
      'rgb': ['rgb', 'led', 'lighting', 'backlight']
    };
    
    // For each query word, find semantic matches in specifications
    queryWords.forEach(queryWord => {
      let wordScore = 0;
      let bestMatch = null;
      
      // Direct word matching
      specEntries.forEach(spec => {
        if (spec.combined.includes(queryWord)) {
          wordScore = Math.max(wordScore, 30);
          bestMatch = `${spec.key}:${spec.value}`;
        }
      });
      
      // Semantic pattern matching
      Object.entries(technicalPatterns).forEach(([vietnamese, englishTerms]) => {
        if (queryWord.includes(vietnamese)) {
          englishTerms.forEach(englishTerm => {
            specEntries.forEach(spec => {
              if (spec.combined.includes(englishTerm)) {
                const semanticScore = 25;
                if (semanticScore > wordScore) {
                  wordScore = semanticScore;
                  bestMatch = `${spec.key}:${spec.value} (semantic: ${vietnamese}→${englishTerm})`;
                }
              }
            });
          });
        }
        
        // Reverse matching (English in query, Vietnamese concept)
        englishTerms.forEach(englishTerm => {
          if (queryWord.includes(englishTerm)) {
            specEntries.forEach(spec => {
              if (spec.combined.includes(englishTerm) ||
                  (vietnamese === 'cơ học' && spec.combined.includes('mechanical')) ||
                  (vietnamese === 'không dây' && spec.combined.includes('wireless'))) {
                const semanticScore = 25;
                if (semanticScore > wordScore) {
                  wordScore = semanticScore;
                  bestMatch = `${spec.key}:${spec.value} (reverse: ${englishTerm}→${vietnamese})`;
                }
              }
            });
          }
        });
      });
      
      if (wordScore > 0) {
        totalScore += wordScore;
        matches.push(`${queryWord}(${wordScore})`);
      }
    });
    
    // Bonus for multiple specification matches
    if (matches.length > 2) {
      totalScore += 20;
      matches.push('MultiMatch(20)');
    }
    
    return {
      score: totalScore,
      matches: matches,
      details: matches.join('+')
    };
  }
}

module.exports = SpecificationScorer;