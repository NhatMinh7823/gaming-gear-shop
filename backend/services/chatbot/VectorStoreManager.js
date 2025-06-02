const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const Product = require("../../models/productModel");
const { embeddingsConfig } = require("../config/llmConfig");

class VectorStoreManager {
  constructor() {
    this.embeddings = null;
    this.vectorStore = null;
    this.isInitialized = false;
  }

  static getInstance() {
    if (!VectorStoreManager.instance) {
      VectorStoreManager.instance = new VectorStoreManager();
    }
    return VectorStoreManager.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log("Initializing embeddings...");
      this.embeddings = new GoogleGenerativeAIEmbeddings(embeddingsConfig);

      console.log("Initializing vector store...");
      this.vectorStore = new MemoryVectorStore(this.embeddings);

      this.isInitialized = true;
      console.log("Vector store initialized successfully");
    } catch (error) {
      console.error("Error initializing vector store:", error);
      throw error;
    }
  }

  /**
   * Create enhanced searchable content for better brand and product recognition
   */
  createSearchableContent(product) {
    // Create brand variations for better matching
    const brandVariations = product.brand ? [
      product.brand,
      product.brand.toLowerCase(),
      product.brand.toUpperCase(),
      `thương hiệu ${product.brand}`,
      `brand ${product.brand}`,
      `sản phẩm ${product.brand}`,
      `của ${product.brand}`,
      `từ ${product.brand}`
    ].join(" ") : "";

    // Category variations
    const categoryVariations = product.category?.name ? [
      product.category.name,
      `danh mục ${product.category.name}`,
      `loại ${product.category.name}`,
      `category ${product.category.name}`,
      `thuộc nhóm ${product.category.name}`
    ].join(" ") : "";

    // Name variations
    const nameVariations = [
      product.name,
      product.name.toLowerCase(),
      `sản phẩm ${product.name}`,
      `model ${product.name}`,
      `màn hình ${product.name}`, // Specific for monitors
      `gaming monitor ${product.name}`
    ].join(" ");

    // Features and specifications as searchable text
    const featuresText = product.features?.join(" ") || "";
    const specsText = Object.entries(product.specifications || {})
      .map(([key, value]) => `${key} ${value} ${key}:${value}`)
      .join(" ");

    // Additional search keywords based on product type
    const additionalKeywords = [];
    if (product.category?.name?.toLowerCase().includes('monitor')) {
      additionalKeywords.push('màn hình', 'monitor', 'display', 'screen');
    }
    if (product.name?.toLowerCase().includes('gaming')) {
      additionalKeywords.push('gaming', 'game', 'chơi game', 'esports');
    }

    // Combine all searchable content
    const searchableContent = [
      nameVariations,
      brandVariations,
      categoryVariations,
      product.description,
      `Giá: ${product.price} VND`,
      `Price: ${product.price}`,
      featuresText,
      specsText,
      `Đánh giá: ${product.averageRating || "chưa có"} sao`,
      `Rating: ${product.averageRating || "no rating"}`,
      `${product.numReviews || 0} lượt đánh giá`,
      `${product.numReviews || 0} reviews`,
      product.isFeatured ? "sản phẩm nổi bật featured hot recommend" : "",
      product.isNewArrival ? "sản phẩm mới new arrival latest" : "",
      product.stock > 0 ? "còn hàng available in stock" : "hết hàng out of stock sold out",
      additionalKeywords.join(" ")
    ].filter(Boolean).join(" ");

    return searchableContent;
  }

  async loadProducts(products) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`Loading ${products.length} products to vector store...`);
      
      const documents = products.map((product) => ({
        pageContent: this.createSearchableContent(product),
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
      }));

      if (documents.length > 0) {
        await this.vectorStore.addDocuments(documents);
        console.log(`✅ Successfully loaded ${documents.length} products to vector store`);
        
        // Log some brand information for debugging
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
        console.log(`📊 Loaded brands: ${brands.join(', ')}`);
      }
    } catch (error) {
      console.error("Error loading products to vector store:", error);
      throw error;
    }
  }

  async loadProductsToVectorStore() {
    try {
      console.log("🔄 Fetching products from database...");
      const products = await Product.find().populate("category", "name");
      console.log(`📦 Found ${products.length} products in database`);
      
      if (products.length === 0) {
        console.warn("⚠️ No products found in database");
        return;
      }

      const documents = products.map((product) => ({
        pageContent: this.createSearchableContent(product),
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
      }));

      if (documents.length > 0) {
        await this.vectorStore.addDocuments(documents);
        console.log(`✅ Successfully loaded ${documents.length} products to vector store`);
        
        // Log detailed brand information for debugging
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
        console.log(`📊 Available brands: ${brands.join(', ')}`);
        
        // Check specifically for BenQ products
        const benqProducts = products.filter(p => 
          p.brand?.toLowerCase().includes('benq') || 
          p.name?.toLowerCase().includes('benq')
        );
        if (benqProducts.length > 0) {
          console.log(`🎯 Found ${benqProducts.length} BenQ products:`);
          benqProducts.forEach(p => console.log(`  - ${p.name} (${p.brand})`));
        } else {
          console.log(`❓ No BenQ products found in current dataset`);
        }
      }
    } catch (error) {
      console.error("Error loading products to vector store:", error);
      throw error;
    }
  }

  async similaritySearch(query, limit = 5) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`🔍 Searching for: "${query}" (limit: ${limit})`);
    
    try {
      const results = await this.vectorStore.similaritySearch(query, limit);
      console.log(`📋 Found ${results.length} results for query: "${query}"`);
      
      // Log search results for debugging
      if (results.length > 0) {
        console.log(`🎯 Search results:`);
        results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.metadata.name} (${result.metadata.brand})`);
        });
      } else {
        console.log(`❌ No results found for: "${query}"`);
      }
      
      return results;
    } catch (error) {
      console.error("Error in similarity search:", error);
      return [];
    }
  }

  async testSearch(query) {
    console.log(`🧪 Testing search for: "${query}"`);
    const results = await this.similaritySearch(query, 10);
    return results;
  }

  getVectorStore() {
    return this.vectorStore;
  }

  // Debug method to check loaded products
  async getLoadedProductsInfo() {
    if (!this.vectorStore) {
      return { count: 0, brands: [] };
    }
    
    try {
      // This is a workaround since MemoryVectorStore doesn't expose documents directly
      const testResults = await this.vectorStore.similaritySearch("", 1000);
      const brands = [...new Set(testResults.map(r => r.metadata.brand).filter(Boolean))];
      
      return {
        count: testResults.length,
        brands: brands,
        hasbenq: brands.some(b => b.toLowerCase().includes('benq'))
      };
    } catch (error) {
      console.error("Error getting loaded products info:", error);
      return { count: 0, brands: [], error: error.message };
    }
  }
}

module.exports = VectorStoreManager;
