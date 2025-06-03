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
   * Create enhanced searchable content with precise category matching
   */
  createSearchableContent(product) {
    // Normalize category name
    const categoryName = product.category?.name?.toLowerCase() || "";
    
    // ULTRA HIGH PRIORITY - Product name and exact category matching
    const ultraHighPriority = [];
    ultraHighPriority.push(product.name.repeat(5)); // Product name gets highest weight
    
    // Category-specific EXACT keywords (repeated 4 times for very high weight)
    if (categoryName.includes("mice") || categoryName.includes("mouse")) {
      ultraHighPriority.push("chuột".repeat(4), "mouse".repeat(4));
      ultraHighPriority.push("chuột gaming".repeat(3), "gaming mouse".repeat(3));
    } else if (categoryName.includes("keyboard")) {
      ultraHighPriority.push("bàn phím".repeat(4), "keyboard".repeat(4));
      ultraHighPriority.push("bàn phím gaming".repeat(3), "gaming keyboard".repeat(3));
    } else if (categoryName.includes("monitor")) {
      ultraHighPriority.push("màn hình".repeat(4), "monitor".repeat(4));
      ultraHighPriority.push("màn hình gaming".repeat(3), "gaming monitor".repeat(3));
    } else if (categoryName.includes("headset")) {
      ultraHighPriority.push("tai nghe".repeat(4), "headset".repeat(4));
      ultraHighPriority.push("tai nghe gaming".repeat(3), "gaming headset".repeat(3));
    } else if (categoryName.includes("laptop")) {
      ultraHighPriority.push("laptop".repeat(4));
      ultraHighPriority.push("laptop gaming".repeat(3), "gaming laptop".repeat(3));
    } else if (categoryName.includes("pc") || categoryName.includes("case")) {
      ultraHighPriority.push("pc".repeat(4), "máy tính".repeat(4));
      if (product.name.toLowerCase().includes("case") || product.description?.toLowerCase().includes("case")) {
        ultraHighPriority.push("case".repeat(4), "vỏ máy tính".repeat(3));
      }
      ultraHighPriority.push("gaming pc".repeat(3));
    }
    
    // HIGH PRIORITY - Brand and specific product features
    const highPriority = [];
    if (product.brand) {
      highPriority.push(
        product.brand.repeat(3),
        `${product.brand} ${categoryName}`.repeat(2)
      );
    }
    
    // MEDIUM PRIORITY - Description and features
    const mediumPriority = [];
    if (product.description) {
      mediumPriority.push(product.description);
    }
    
    if (product.features && product.features.length > 0) {
      mediumPriority.push(product.features.join(" "));
    }
    
    // LOW PRIORITY - General gaming keywords (only if really relevant)
    const lowPriority = [];
    
    // Only add generic "gaming" if the product name specifically mentions gaming
    if (product.name?.toLowerCase().includes("gaming")) {
      lowPriority.push("gaming", "game");
    }
    
    // Category name
    if (product.category?.name) {
      lowPriority.push(product.category.name);
    }
    
    // Specifications (minimal weight)
    if (product.specifications) {
      const specsText = Object.entries(product.specifications)
        .map(([key, value]) => `${key} ${value}`)
        .join(" ");
      lowPriority.push(specsText);
    }
    
    // Combine with proper weighting
    const searchableContent = [
      ultraHighPriority.filter(Boolean).join(" "), // Ultra high weight
      highPriority.filter(Boolean).join(" "),      // High weight
      mediumPriority.filter(Boolean).join(" "),    // Medium weight
      lowPriority.filter(Boolean).join(" "),       // Low weight
      `Price ${product.price}`,                     // Minimal weight
      product.stock > 0 ? "available" : "out-of-stock" // Minimal weight
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
