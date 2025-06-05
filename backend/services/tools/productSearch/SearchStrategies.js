const Product = require("../../../models/productModel");
const CategoryDetector = require("./CategoryDetector");
const BrandExtractor = require("./BrandExtractor");
const PriceAnalyzer = require("./PriceAnalyzer");
const SpecificationScorer = require("./SpecificationScorer");
const FeatureScorer = require("./FeatureScorer");

class SearchStrategies {
  /**
   * Category-first search: Search within specific category using direct database filtering
   */
  static async categoryFirstSearch(query, detectedCategory, limit) {
    try {
      console.log(`🎯 Category-first search for "${query}" in category "${detectedCategory}"`);
      
      // Get all products from the detected category
      const categoryProducts = await Product.find()
        .populate("category", "name")
        .where("category")
        .in(await CategoryDetector.getCategoryIds(detectedCategory));
      
      console.log(`📦 Found ${categoryProducts.length} products in category "${detectedCategory}"`);
      
      if (categoryProducts.length === 0) {
        return [];
      }
      
      // Simple text-based scoring for category products
      const lowerQuery = query.toLowerCase();
      const priceRange = PriceAnalyzer.extractPriceRange(query);
      
      const scoredProducts = categoryProducts.map(product => {
        let score = 0;
        let scoreBreakdown = [];
        
        // Name match (highest priority)
        if (product.name.toLowerCase().includes(lowerQuery)) {
          score += 100;
          scoreBreakdown.push('Name(100)');
        }
        
        // Brand match
        const extractedBrand = BrandExtractor.extractBrand(query);
        if (extractedBrand && product.brand?.toLowerCase().includes(extractedBrand)) {
          score += 50;
          scoreBreakdown.push('Brand(50)');
        }
        
        // Description match
        if (product.description?.toLowerCase().includes(lowerQuery)) {
          score += 30;
        }
        
        // Intelligent Features matching (semantic understanding)
        if (product.features?.length > 0) {
          const featureScore = FeatureScorer.calculateFeatureScore(lowerQuery, product.features);
          if (featureScore.score > 0) {
            score += featureScore.score;
            scoreBreakdown.push(`Features(${featureScore.score})`);
          }
        }
        
        // Intelligent Specifications matching (semantic understanding)
        if (product.specifications && Object.keys(product.specifications).length > 0) {
          const specScore = SpecificationScorer.calculateSpecificationScore(lowerQuery, product.specifications);
          if (specScore.score > 0) {
            score += specScore.score;
            scoreBreakdown.push(`Specs(${specScore.score})`);
          }
        }
        
        // Gaming bonus
        if (lowerQuery.includes('gaming') && product.name.toLowerCase().includes('gaming')) {
          score += 25;
        }
        
        // Quality indicators (new)
        if (product.averageRating >= 4.5) {
          score += 15; // Bonus for highly rated products
        }
        
        if (product.isFeatured) {
          score += 10; // Bonus for featured products
        }
        
        if (product.isNewArrival) {
          score += 5; // Small bonus for new products
        }
        
        // Popularity bonus (new)
        if (product.sold > 50) {
          score += 10; // Popular products bonus
        }
        
        // Category-specific bonuses
        if (detectedCategory === "Mice") {
          if (lowerQuery.includes('mouse') || lowerQuery.includes('chuột')) {
            score += 30;
          }
        }
        
        // Price range matching (very important for recommendations)
        if (priceRange) {
          const effectivePrice = product.discountPrice || product.price;
          const originalPrice = product.price;
          
          // Check if effective price (discounted or original) fits the range
          if (effectivePrice >= priceRange.min && effectivePrice <= priceRange.max) {
            score += 200; // High bonus for price match
            
            // Extra bonus if it's a discounted product within range
            if (product.discountPrice && product.discountPrice < originalPrice) {
              score += 50; // Bonus for discount
            }
          }
          // Penalize products outside price range
          else if (effectivePrice > priceRange.max * 1.2 || effectivePrice < priceRange.min * 0.8) {
            score -= 100; // Heavy penalty for being way outside range
          }
        }
        
        return {
          metadata: {
            id: product._id.toString(),
            name: product.name,
            price: product.price,
            discountPrice: product.discountPrice || null,
            category: product.category?.name || "N/A",
            brand: product.brand || "N/A",
            inStock: product.stock > 0,
            specifications: product.specifications || {},
            features: product.features || [],
            averageRating: product.averageRating || 0,
            numReviews: product.numReviews || 0,
            isFeatured: product.isFeatured || false,
            isNewArrival: product.isNewArrival || false,
            imageUrl: product.images?.[0]?.url || "",
          },
          score,
          scoreBreakdown
        };
      });
      
      // Sort by score and return top results (remove duplicates by ID)
      const uniqueProducts = scoredProducts.reduce((acc, current) => {
        const existing = acc.find(item => item.metadata.id === current.metadata.id);
        if (!existing || current.score > existing.score) {
          return [...acc.filter(item => item.metadata.id !== current.metadata.id), current];
        }
        return acc;
      }, []);
      
      const results = uniqueProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      console.log(`✅ Category-first search returned ${results.length} unique results:`);
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.metadata.name} (${result.metadata.brand}) - Score: ${result.score} [${result.scoreBreakdown?.join(', ') || 'No breakdown'}]`);
      });
      
      return results;
      
    } catch (error) {
      console.error("❌ Error in category-first search:", error);
      return [];
    }
  }
}

module.exports = SearchStrategies;