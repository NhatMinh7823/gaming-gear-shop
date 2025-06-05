class FeatureScorer {
  /**
   * Calculate intelligent feature score based on semantic matching
   */
  static calculateFeatureScore(query, features) {
    let totalScore = 0;
    let matches = [];
    
    // Normalize query
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Normalize features for better matching
    const normalizedFeatures = features.map(f => f.toLowerCase());
    
    // Vietnamese to English feature translations
    const featurePatterns = {
      // Connectivity & Ports
      'có thể tháo rời': ['detachable', 'removable', 'modular'],
      'hoán đổi': ['swappable', 'hot-swap', 'interchangeable'],
      'kết nối': ['connectivity', 'connection', 'wireless', 'bluetooth'],
      'không dây': ['wireless', 'cordless', 'bluetooth'],
      
      // Lighting & Visual
      'rgb': ['rgb', 'lighting', 'backlight', 'illuminated'],
      'đèn nền': ['backlight', 'lighting', 'illuminated'],
      'tùy chỉnh': ['customizable', 'programmable', 'configurable'],
      
      // Programming & Control
      'lập trình': ['programmable', 'macro', 'configurable'],
      'phím': ['key', 'button', 'switch'],
      'macro': ['macro', 'programmable', 'shortcut'],
      
      // Audio & Sound
      'khử tiếng ồn': ['noise cancelling', 'noise reduction', 'anc'],
      'âm thanh': ['audio', 'sound', 'acoustic'],
      'mic': ['microphone', 'mic', 'voice'],
      
      // Performance & Gaming
      'gaming': ['gaming', 'esports', 'competitive'],
      'độ trễ thấp': ['low latency', 'lag-free', 'responsive'],
      'tốc độ': ['speed', 'fast', 'quick'],
      
      // Build & Design
      'cơ học': ['mechanical', 'tactile', 'clicky'],
      'chống nước': ['waterproof', 'water-resistant', 'splash-proof'],
      'ergonomic': ['ergonomic', 'comfortable', 'grip']
    };
    
    // For each query word, find semantic matches in features
    queryWords.forEach(queryWord => {
      let wordScore = 0;
      let bestMatch = null;
      
      // Direct word matching in features
      normalizedFeatures.forEach(feature => {
        if (feature.includes(queryWord)) {
          wordScore = Math.max(wordScore, 40);
          bestMatch = feature;
        }
        
        // Partial phrase matching
        const queryPhrases = query.split(' ').filter(phrase => phrase.length > 3);
        queryPhrases.forEach(phrase => {
          if (feature.includes(phrase.toLowerCase())) {
            wordScore = Math.max(wordScore, 35);
            bestMatch = feature;
          }
        });
      });
      
      // Semantic pattern matching for features
      Object.entries(featurePatterns).forEach(([vietnamese, englishTerms]) => {
        if (queryWord.includes(vietnamese) || query.includes(vietnamese)) {
          englishTerms.forEach(englishTerm => {
            normalizedFeatures.forEach(feature => {
              if (feature.includes(englishTerm)) {
                const semanticScore = 30;
                if (semanticScore > wordScore) {
                  wordScore = semanticScore;
                  bestMatch = `${feature} (semantic: ${vietnamese}→${englishTerm})`;
                }
              }
            });
          });
        }
        
        // Reverse matching (English in query, Vietnamese concept)
        englishTerms.forEach(englishTerm => {
          if (queryWord.includes(englishTerm)) {
            normalizedFeatures.forEach(feature => {
              // Check if feature contains Vietnamese equivalent
              if (feature.includes(vietnamese) ||
                  feature.includes(englishTerm)) {
                const semanticScore = 30;
                if (semanticScore > wordScore) {
                  wordScore = semanticScore;
                  bestMatch = `${feature} (reverse: ${englishTerm}→${vietnamese})`;
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
    
    // Bonus for comprehensive feature matches
    if (matches.length > 1) {
      totalScore += 15;
      matches.push('MultiFeature(15)');
    }
    
    return {
      score: totalScore,
      matches: matches,
      details: matches.join('+')
    };
  }
}

module.exports = FeatureScorer;