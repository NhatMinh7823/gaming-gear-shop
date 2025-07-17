class WorkflowIntentDetector {
  static detectWorkflowIntent(message) {
    const lowerMessage = message.toLowerCase();

    const purchaseWithProductPatterns = [
      /đặt hàng.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
      /mua.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
      /tôi muốn mua.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
      /cần mua.*(?:tai nghe|mouse|chuột|bàn phím|keyboard|laptop|gaming|màn hình|monitor)/,
    ];

    const generalPurchasePatterns = [
      /tôi muốn mua/,
      /mua.*tầm.*triệu/,
      /tìm và mua/,
      /mua.*gaming/,
    ];

    const wishlistPurchasePatterns = [
      /mua.*wishlist/,
      /đặt hàng.*yêu thích/,
      /mua.*từ.*danh sách/,
    ];

    const categoryBrowsePatterns = [/xem.*danh mục/, /loại.*sản phẩm/];

    const searchPatterns = [
      /tìm/,
      /tư vấn/,
      /gợi ý/,
      /recommend/,
      /có gì/,
      /xem.*sản phẩm/,
    ];

    const hasProductKeywords = WorkflowIntentDetector.hasProductKeywords(lowerMessage);

    if (purchaseWithProductPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "purchase";
    }

    if (
      hasProductKeywords &&
      generalPurchasePatterns.some((pattern) => pattern.test(lowerMessage))
    ) {
      return "purchase";
    }

    if (hasProductKeywords && /đặt hàng|order/.test(lowerMessage)) {
      return "purchase";
    }

    if (wishlistPurchasePatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "wishlist_purchase";
    }

    if (
      !hasProductKeywords &&
      generalPurchasePatterns.some((pattern) => pattern.test(lowerMessage))
    ) {
      return "purchase";
    }

    if (categoryBrowsePatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "category_browse";
    }

    if (searchPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return "search";
    }

    return null;
  }

  static hasProductKeywords(message) {
    const productKeywords = [
      "tai nghe",
      "headset",
      "gaming headset",
      "mouse",
      "chuột",
      "gaming mouse",
      "bàn phím",
      "keyboard",
      "gaming keyboard",
      "màn hình",
      "monitor",
      "gaming monitor",
      "laptop",
      "gaming laptop",
      "laptop gaming",
      "pc",
      "gaming pc",
      "pc gaming",
      "máy tính",
      "máy tính gaming",
      "logitech",
      "razer",
      "steelseries",
      "corsair",
      "asus",
      "msi",
      "alienware",
      "acer",
      "hp",
      "benq",
      "aoc",
      "samsung",
      "lg",
      "gaming",
      "game",
      "chơi game",
      "sản phẩm",
    ];

    return productKeywords.some((keyword) => message.includes(keyword));
  }

  static shouldUseCompleteWorkflow(message, workflowIntent) {
    if (workflowIntent) {
      return true;
    }

    const lowerMessage = message.toLowerCase();
    const hasOrderKeywords = /đặt hàng|order|mua/.test(lowerMessage);
    const hasProductKeywords = WorkflowIntentDetector.hasProductKeywords(lowerMessage);

    return hasOrderKeywords && hasProductKeywords;
  }
}

module.exports = WorkflowIntentDetector;
