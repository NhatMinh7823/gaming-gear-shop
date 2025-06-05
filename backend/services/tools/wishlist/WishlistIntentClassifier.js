/**
 * WishlistIntentClassifier - Advanced intent classification for wishlist queries
 */
class WishlistIntentClassifier {
  constructor() {
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[WishlistIntentClassifier] ${message}`, ...args);
    }
  }

  /**
   * Phân tích pattern câu hỏi tiếng Việt
   */
  analyzeVietnamesePatterns(message) {
    const patterns = {
      // Pattern tư vấn cá nhân
      personalAdvice: [
        /tư vấn.*cho.*tôi/i,
        /gợi ý.*cho.*tôi/i,
        /đề xuất.*cho.*tôi/i,
        /recommend.*for.*me/i,
        /phù hợp.*với.*tôi/i,
        /suitable.*for.*me/i,
        /tôi.*nên.*mua/i,
        /tôi.*nên.*chọn/i,
        /mình.*nên.*lấy/i
      ],

      // Pattern wishlist trực tiếp
      directWishlist: [
        /wishlist.*của.*tôi/i,
        /danh sách.*yêu thích/i,
        /sản phẩm.*yêu thích/i,
        /có.*gì.*trong.*wishlist/i,
        /xem.*wishlist/i,
        /show.*my.*wishlist/i,
        /list.*favorite/i
      ],

      // Pattern thông tin cá nhân
      personalInfo: [
        /biết.*gì.*về.*tôi/i,
        /profile.*của.*tôi/i,
        /thông tin.*về.*tôi/i,
        /sở thích.*của.*tôi/i,
        /preference.*của.*tôi/i,
        /tôi.*thích.*gì/i,
        /what.*do.*i.*like/i,
        /my.*preferences/i
      ],

      // Pattern setup và gaming
      setupGaming: [
        /setup.*của.*tôi/i,
        /gaming.*setup/i,
        /bộ.*setup/i,
        /gear.*của.*tôi/i,
        /thiết bị.*gaming/i,
        /my.*gaming.*gear/i,
        /current.*setup/i,
        /đồ.*gaming.*hiện tại/i
      ],

      // Pattern so sánh và upgrade
      comparison: [
        /so.*với.*của.*tôi/i,
        /compare.*with.*my/i,
        /so sánh.*với.*tôi/i,
        /upgrade.*từ/i,
        /nâng cấp.*từ/i,
        /thay thế.*cho/i,
        /replace.*my/i,
        /better.*than.*my/i
      ],

      // Pattern thiếu sót và bổ sung
      complement: [
        /thiếu.*gì.*trong.*setup/i,
        /bổ sung.*thêm/i,
        /còn.*thiếu.*gì/i,
        /what.*am.*i.*missing/i,
        /complete.*my.*setup/i,
        /hoàn thiện.*setup/i,
        /missing.*from.*setup/i
      ]
    };

    const matches = {};
    let totalScore = 0;

    Object.keys(patterns).forEach(category => {
      const categoryPatterns = patterns[category];
      const matchCount = categoryPatterns.filter(pattern => pattern.test(message)).length;
      
      if (matchCount > 0) {
        matches[category] = matchCount;
        totalScore += matchCount;
      }
    });

    return { matches, totalScore };
  }

  /**
   * Phân tích ngữ cảnh từ khóa
   */
  analyzeKeywordContext(message) {
    const personalPronouns = ['tôi', 'mình', 'của tôi', 'cho tôi', 'với tôi', 'my', 'me', 'i'];
    const adviceKeywords = ['tư vấn', 'gợi ý', 'đề xuất', 'recommend', 'suggest', 'advice'];
    const comparisonKeywords = ['so với', 'compare', 'versus', 'vs', 'khác gì', 'better'];
    const setupKeywords = ['setup', 'gear', 'gaming', 'build', 'rig', 'thiết lập'];

    const personalCount = personalPronouns.filter(pronoun => 
      message.toLowerCase().includes(pronoun.toLowerCase())
    ).length;

    const adviceCount = adviceKeywords.filter(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())  
    ).length;

    const comparisonCount = comparisonKeywords.filter(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    const setupCount = setupKeywords.filter(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    return {
      personalCount,
      adviceCount, 
      comparisonCount,
      setupCount,
      hasPersonalContext: personalCount > 0,
      hasAdviceRequest: adviceCount > 0,
      hasComparisonIntent: comparisonCount > 0,
      hasSetupContext: setupCount > 0
    };
  }

  /**
   * Tính toán confidence score cho wishlist intent
   */
  calculateWishlistConfidence(message) {
    const patternAnalysis = this.analyzeVietnamesePatterns(message);
    const keywordAnalysis = this.analyzeKeywordContext(message);
    
    let confidence = 0;
    const reasons = [];

    // Điểm từ pattern matching
    if (patternAnalysis.matches.directWishlist) {
      confidence += 50;
      reasons.push('Direct wishlist pattern detected');
    }

    if (patternAnalysis.matches.personalAdvice) {
      confidence += 40;
      reasons.push('Personal advice pattern detected');
    }

    if (patternAnalysis.matches.personalInfo) {
      confidence += 35;
      reasons.push('Personal info pattern detected');
    }

    if (patternAnalysis.matches.setupGaming) {
      confidence += 30;
      reasons.push('Gaming setup pattern detected');
    }

    if (patternAnalysis.matches.comparison) {
      confidence += 25;
      reasons.push('Comparison pattern detected');
    }

    if (patternAnalysis.matches.complement) {
      confidence += 25;
      reasons.push('Complement pattern detected');
    }

    // Điểm từ keyword analysis
    if (keywordAnalysis.hasPersonalContext && keywordAnalysis.hasAdviceRequest) {
      confidence += 20;
      reasons.push('Personal context + advice request');
    }

    if (keywordAnalysis.personalCount >= 2) {
      confidence += 15;
      reasons.push('Multiple personal pronouns');
    }

    if (keywordAnalysis.hasSetupContext) {
      confidence += 10;
      reasons.push('Gaming setup context');
    }

    // Bonus cho combination patterns
    if (patternAnalysis.totalScore >= 2) {
      confidence += 10;
      reasons.push('Multiple patterns matched');
    }

    return {
      confidence: Math.min(confidence, 100),
      reasons,
      patternAnalysis,
      keywordAnalysis
    };
  }

  /**
   * Đề xuất action phù hợp cho wishlist tool
   */
  suggestOptimalAction(message, analysis) {
    const { patternAnalysis, keywordAnalysis } = analysis;

    // Priority-based action selection
    if (patternAnalysis.matches.directWishlist) {
      return 'get_wishlist';
    }

    if (patternAnalysis.matches.personalAdvice) {
      if (/gợi ý|recommend|suggest|tương tự/i.test(message)) {
        return 'get_recommendations';
      }
      return 'analyze_preferences';
    }

    if (patternAnalysis.matches.complement || /thiếu|missing|bổ sung/i.test(message)) {
      return 'suggest_complementary';
    }

    if (patternAnalysis.matches.comparison || keywordAnalysis.hasComparisonIntent) {
      return 'analyze_preferences';
    }

    if (patternAnalysis.matches.setupGaming) {
      return 'suggest_complementary';
    }

    if (patternAnalysis.matches.personalInfo) {
      return 'analyze_preferences';
    }

    // Default fallback
    return 'get_wishlist';
  }

  /**
   * Phân loại intent chính
   */
  classifyIntent(message) {
    this.log(`Classifying intent for: "${message}"`);
    
    const analysis = this.calculateWishlistConfidence(message);
    const shouldUseWishlist = analysis.confidence >= 25; // Threshold 25%
    const suggestedAction = this.suggestOptimalAction(message, analysis);

    const result = {
      shouldUseWishlist,
      confidence: analysis.confidence,
      reasons: analysis.reasons,
      suggestedAction,
      analysis: {
        patterns: analysis.patternAnalysis.matches,
        keywords: analysis.keywordAnalysis,
        totalPatternScore: analysis.patternAnalysis.totalScore
      },
      recommendation: this.generateRecommendation(shouldUseWishlist, analysis.confidence, suggestedAction)
    };

    this.log('Classification result:', result);
    return result;
  }

  /**
   * Tạo recommendation cho chatbot
   */
  generateRecommendation(shouldUse, confidence, action) {
    if (shouldUse) {
      return {
        action: 'USE_WISHLIST_TOOL',
        message: `🎯 HIGH CONFIDENCE (${confidence}%) - Use wishlist_tool`,
        workflow: [
          `1. Call wishlist_tool with action="${action}"`,
          `2. Analyze results for personalization`,
          `3. Provide tailored recommendations`,
          `4. Follow up with related product search if needed`
        ]
      };
    } else {
      return {
        action: 'STANDARD_PROCESSING',  
        message: `❌ LOW CONFIDENCE (${confidence}%) - Process as standard query`,
        workflow: [
          `1. Handle as general product inquiry`,
          `2. Use product_search or other tools as appropriate`,
          `3. Provide general recommendations`
        ]
      };
    }
  }
}

module.exports = WishlistIntentClassifier;