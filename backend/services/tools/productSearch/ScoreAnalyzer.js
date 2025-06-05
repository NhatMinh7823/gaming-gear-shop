class ScoreAnalyzer {
  /**
   * Analyze score gaps to identify top-tier products with significant score separation
   */
  static analyzeScoreGaps(results) {
    if (results.length === 0) {
      return { topTierProducts: [], summary: "No products to analyze" };
    }
    
    // Sort by score descending (should already be sorted)
    const sortedResults = results.sort((a, b) => b.score - a.score);
    const scores = sortedResults.map(r => r.score);
    
    // Calculate score gaps between consecutive products
    const gaps = [];
    for (let i = 0; i < scores.length - 1; i++) {
      gaps.push({
        position: i,
        gap: scores[i] - scores[i + 1],
        scoreHigh: scores[i],
        scoreLow: scores[i + 1]
      });
    }
    
    // Find significant gaps (threshold: 20% of max score or minimum 30 points)
    const maxScore = scores[0];
    const significantGapThreshold = Math.max(maxScore * 0.2, 30);
    
    console.log(`📊 Score analysis: Max: ${maxScore}, Gap threshold: ${significantGapThreshold}`);
    gaps.forEach((gap, i) => {
      console.log(`   Gap ${i}: ${gap.scoreHigh} -> ${gap.scoreLow} (diff: ${gap.gap})`);
    });
    
    // Find the first significant gap
    const firstSignificantGap = gaps.find(gap => gap.gap >= significantGapThreshold);
    
    let topTierProducts;
    let summary;
    
    if (firstSignificantGap) {
      // Include products before the first significant gap
      const cutoffPosition = firstSignificantGap.position + 1;
      topTierProducts = sortedResults.slice(0, cutoffPosition);
      
      summary = `${cutoffPosition} sản phẩm hàng đầu (điểm ${firstSignificantGap.scoreHigh}-${topTierProducts[topTierProducts.length-1].score}), cách biệt ${firstSignificantGap.gap} điểm với nhóm tiếp theo`;
    } else {
      // No significant gaps found, check for score clusters
      const scoreGroups = this.groupProductsByScore(sortedResults, 15); // Group within 15 points
      
      if (scoreGroups.length > 1 && scoreGroups[0].products.length <= 5) {
        // Take the highest scoring group if it's reasonable sized
        topTierProducts = scoreGroups[0].products;
        summary = `${topTierProducts.length} sản phẩm cùng nhóm điểm cao (${scoreGroups[0].minScore}-${scoreGroups[0].maxScore})`;
      } else {
        // Fall back to top 3 or all if less than 3
        topTierProducts = sortedResults.slice(0, Math.min(3, sortedResults.length));
        summary = `Top ${topTierProducts.length} sản phẩm (không có cách biệt điểm rõ rệt)`;
      }
    }
    
    console.log(`🎯 Final selection: ${summary}`);
    topTierProducts.forEach((product, i) => {
      console.log(`   ${i+1}. ${product.metadata.name} - Score: ${product.score}`);
    });
    
    return {
      topTierProducts,
      summary,
      totalProducts: results.length,
      focusedCount: topTierProducts.length,
      significantGap: firstSignificantGap
    };
  }

  /**
   * Group products by similar scores
   */
  static groupProductsByScore(products, tolerance = 15) {
    const groups = [];
    let currentGroup = null;
    
    products.forEach(product => {
      if (!currentGroup || product.score < currentGroup.minScore - tolerance) {
        // Start new group
        currentGroup = {
          products: [product],
          maxScore: product.score,
          minScore: product.score
        };
        groups.push(currentGroup);
      } else {
        // Add to current group
        currentGroup.products.push(product);
        currentGroup.minScore = Math.min(currentGroup.minScore, product.score);
      }
    });
    
    return groups;
  }
}

module.exports = ScoreAnalyzer;