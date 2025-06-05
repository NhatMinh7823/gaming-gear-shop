const { StructuredTool } = require("langchain/tools");
const { z } = require("zod");
const WishlistIntentClassifier = require("./WishlistIntentClassifier");

/**
 * IntentDetector - Tool để phát hiện intent về wishlist một cách thông minh
 */
class IntentDetector extends StructuredTool {
  constructor() {
    super();
    this.name = "intent_detector";
    this.description = "Phát hiện intent của người dùng về wishlist và tư vấn cá nhân bằng AI classifier nâng cao";
    this.classifier = new WishlistIntentClassifier();
    this.schema = z.object({
      message: z.string().describe("Tin nhắn của người dùng cần phân tích intent"),
    });
  }

  /**
   * Phát hiện các từ khóa wishlist trực tiếp
   */
  detectDirectWishlistKeywords(message) {
    const directKeywords = [
      'wishlist', 'danh sách yêu thích', 'sản phẩm yêu thích',
      'quan tâm', 'đã lưu', 'bookmark', 'đánh dấu',
      'favorite', 'liked', 'saved'
    ];
    
    return directKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Phát hiện intent tư vấn cá nhân
   */
  detectPersonalAdviceIntent(message) {
    const personalPronouns = ['tôi', 'mình', 'của tôi', 'cho tôi', 'với tôi'];
    const adviceKeywords = [
      'tư vấn', 'gợi ý', 'đề xuất', 'recommend', 'suggest',
      'nên mua', 'nên chọn', 'phù hợp', 'suitable', 'match'
    ];
    
    const hasPersonalContext = personalPronouns.some(pronoun =>
      message.toLowerCase().includes(pronoun.toLowerCase())
    );
    
    const hasAdviceRequest = adviceKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return hasPersonalContext && hasAdviceRequest;
  }

  /**
   * Phát hiện intent thông tin cá nhân
   */
  detectPersonalInfoIntent(message) {
    const personalInfoPatterns = [
      /biết.*gì.*về.*tôi/i,
      /thông tin.*về.*tôi/i,
      /profile.*của.*tôi/i,
      /sở thích.*của.*tôi/i,
      /preference.*của.*tôi/i,
      /setup.*của.*tôi/i,
      /gear.*hiện tại/i,
      /(tôi|mình).*có.*gì/i,
      /(tôi|mình).*đang.*dùng/i
    ];
    
    return personalInfoPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Phát hiện intent so sánh và upgrade
   */
  detectComparisonIntent(message) {
    const comparisonKeywords = [
      'so với', 'compare', 'so sánh', 'upgrade', 'nâng cấp',
      'thay thế', 'replace', 'better than', 'tốt hơn',
      'khác gì', 'difference', 'vs', 'versus'
    ];
    
    const hasComparison = comparisonKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const hasPersonalReference = ['tôi có', 'mình có', 'đang dùng', 'hiện tại'].some(ref =>
      message.toLowerCase().includes(ref.toLowerCase())
    );
    
    return hasComparison && hasPersonalReference;
  }

  /**
   * Phát hiện intent setup gaming
   */
  detectSetupIntent(message) {
    const setupKeywords = [
      'setup', 'gaming setup', 'bộ setup', 'thiết lập',
      'thiếu gì', 'bổ sung', 'complete', 'hoàn thiện',
      'build', 'rig', 'workstation'
    ];
    
    const gamingKeywords = [
      'gaming', 'game', 'chơi game', 'streamer', 'streaming'
    ];
    
    const hasSetupKeyword = setupKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const hasGamingContext = gamingKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return hasSetupKeyword || hasGamingContext;
  }

  /**
   * Phát hiện intent mua sắm dựa trên lịch sử
   */
  detectHistoryBasedIntent(message) {
    const historyKeywords = [
      'dựa trên', 'based on', 'theo', 'similar',
      'tương tự', 'giống', 'pattern', 'lịch sử',
      'thường mua', 'hay dùng', 'style', 'phong cách'
    ];
    
    return historyKeywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Tính điểm confidence cho wishlist intent
   */
  calculateWishlistConfidence(message) {
    let score = 0;
    let reasons = [];

    if (this.detectDirectWishlistKeywords(message)) {
      score += 40;
      reasons.push('Direct wishlist keywords detected');
    }

    if (this.detectPersonalAdviceIntent(message)) {
      score += 30;
      reasons.push('Personal advice intent detected');
    }

    if (this.detectPersonalInfoIntent(message)) {
      score += 25;
      reasons.push('Personal info intent detected');
    }

    if (this.detectComparisonIntent(message)) {
      score += 20;
      reasons.push('Comparison intent detected');
    }

    if (this.detectSetupIntent(message)) {
      score += 15;
      reasons.push('Setup intent detected');
    }

    if (this.detectHistoryBasedIntent(message)) {
      score += 15;
      reasons.push('History-based intent detected');
    }

    // Bonus điểm nếu có nhiều personal pronouns
    const personalCount = (message.match(/(tôi|mình|của tôi|cho tôi)/gi) || []).length;
    if (personalCount >= 2) {
      score += 10;
      reasons.push('Multiple personal pronouns');
    }

    return { score: Math.min(score, 100), reasons };
  }

  /**
   * Gợi ý action phù hợp cho wishlist tool
   */
  suggestWishlistAction(message) {
    if (/xem|show|hiển thị|có gì|list/i.test(message)) {
      return 'get_wishlist';
    }
    
    if (/gợi ý|recommend|suggest|tương tự|similar/i.test(message)) {
      return 'get_recommendations';
    }
    
    if (/phân tích|analyze|pattern|xu hướng|sở thích/i.test(message)) {
      return 'analyze_preferences';
    }
    
    if (/thiếu|missing|bổ sung|complete|setup|upgrade/i.test(message)) {
      return 'suggest_complementary';
    }
    
    return 'get_wishlist'; // Default action
  }

  async _call({ message }) {
    try {
      const confidence = this.calculateWishlistConfidence(message);
      const shouldUseWishlist = confidence.score >= 25; // Threshold 25%
      const suggestedAction = this.suggestWishlistAction(message);
      
      const result = {
        shouldUseWishlist,
        confidence: confidence.score,
        reasons: confidence.reasons,
        suggestedAction,
        message: message,
        analysis: {
          directWishlist: this.detectDirectWishlistKeywords(message),
          personalAdvice: this.detectPersonalAdviceIntent(message),
          personalInfo: this.detectPersonalInfoIntent(message),
          comparison: this.detectComparisonIntent(message),
          setup: this.detectSetupIntent(message),
          historyBased: this.detectHistoryBasedIntent(message)
        }
      };

      if (shouldUseWishlist) {
        return `🎯 INTENT DETECTED: Nên sử dụng wishlist_tool
Confidence: ${confidence.score}%
Action: ${suggestedAction}
Reasons: ${confidence.reasons.join(', ')}

Recommended flow:
1. Call wishlist_tool with action="${suggestedAction}"
2. Use results for personalized recommendation
3. Provide detailed advice based on user's preferences`;
      } else {
        return `❌ INTENT NOT DETECTED: Không nên sử dụng wishlist_tool
Confidence: ${confidence.score}% (dưới ngưỡng 25%)
Suggested: Xử lý như câu hỏi thông thường về sản phẩm`;
      }
      
    } catch (error) {
      return `Error in intent detection: ${error.message}`;
    }
  }
}

module.exports = IntentDetector;