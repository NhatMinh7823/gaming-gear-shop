const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { FaissStore } = require("@langchain/community/vectorstores/faiss");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { getProductsWithPriceLabels } = require("../../controllers/productController");
const { embeddingsConfig } = require("../config/llmConfig");
const path = require("path");
const fs = require("fs");

const VI_EN_CATEGORY_MAP = {
  "Màn hình": "Monitor",
  "Bàn phím cơ": "Mechanical Keyboard",
  "Chuột": "Mouse",
  "Tai nghe": "Headset",
  "Gaming PCs": "Gaming PC",
  "Gaming Laptops": "Gaming Laptop",
};

const KEYWORD_TO_ENGLISH_CATEGORY_MAP = {
  "màn hình": "Monitor",
  "bàn phím": "Mechanical Keyboard",
  "chuột": "Mouse",
  "tai nghe": "Headset",
  "pc": "Gaming PC",
  "máy tính để bàn": "Gaming PC",
  "máy tính": "Gaming PC",
  "laptop": "Gaming Laptop",
  "laptop gaming": "Gaming Laptop",
};

class VectorStoreManager {
  constructor() {
    this.embeddings = null;
    this.vectorStore = null;
    this.isInitialized = false;
    this.vectorStorePath = path.join(__dirname, "../../data/vector_store");
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

      // List files in directory if it exists
      const debugDir = path.dirname(this.vectorStorePath);
      if (fs.existsSync(debugDir)) {
        const files = fs.readdirSync(debugDir);
        console.log("  Files in directory:", files);
      }
      console.log("Initializing FAISS vector store...");

      // Ensure directory exists
      const dir = path.dirname(this.vectorStorePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check for actual FAISS index files, not just directory existence
      const faissIndexPath = path.join(this.vectorStorePath, "faiss.index");
      const docstorePath = path.join(this.vectorStorePath, "docstore.json");

      if (
        fs.existsSync(this.vectorStorePath) &&
        fs.existsSync(faissIndexPath) &&
        fs.existsSync(docstorePath)
      ) {
        try {
          this.vectorStore = await FaissStore.load(
            this.vectorStorePath,
            this.embeddings
          );
          console.log("✅ Successfully loaded existing FAISS vector store");
        } catch (loadError) {
          console.error(
            "❌ Failed to load existing vector store:",
            loadError.message
          );
          console.log(
            "🆕 Creating new FAISS vector store due to load failure..."
          );
          this.vectorStore = new FaissStore(this.embeddings, {});
          console.log("✅ Created new FAISS vector store");
        }
      } else {
        if (fs.existsSync(this.vectorStorePath)) {
          console.log(
            "⚠️ Vector store directory exists but missing required index files"
          );
          console.log(
            `❌ Missing: ${
              !fs.existsSync(faissIndexPath) ? "faiss.index " : ""
            }${!fs.existsSync(docstorePath) ? "docstore.json" : ""}`
          );
        }
        console.log("🆕 Creating new FAISS vector store...");
        this.vectorStore = new FaissStore(this.embeddings, {});
        console.log("✅ Created new FAISS vector store");
      }

      this.isInitialized = true;
      console.log("FAISS vector store initialized successfully");
    } catch (error) {
      console.error("Error initializing FAISS vector store:", error);
      throw error;
    }
  }

  /**
   * Create enhanced searchable content using English keywords for core embedding.
   * It maps Vietnamese DB categories to English for better semantic search.
   * Returns: { content: string }
   */
  createSearchableContent(product) {
    const vietnameseCategoryName = product.category?.name || "Unknown Category";
    // Map Vietnamese category to English for embedding
    const englishCategoryName =
      VI_EN_CATEGORY_MAP[vietnameseCategoryName] || vietnameseCategoryName;

    // Handle price labels for "cheapest" or "most expensive"
    let priceLabelContent = "";
    if (product.priceLabel) {
      priceLabelContent = `product is the ${product.priceLabel} in ${englishCategoryName}`;
    }

    const productName = product.name || "";
    const brandName = product.brand || "Unknown Brand";

    // --- Contextual Keywords (in English) ---
    let contextualKeywords = [];
    const isGamingProduct =
      productName.toLowerCase().includes("gaming") ||
      (product.features &&
        product.features.join(" ").toLowerCase().includes("gaming"));

    if (
      ["Monitor", "Mouse", "Headset", "Mechanical Keyboard"].includes(
        englishCategoryName
      ) &&
      isGamingProduct
    ) {
      contextualKeywords.push(`gaming accessory`, `gaming gear`);
    }

    // --- Weighted Content Sections (using English category) ---

    // ULTRA HIGH PRIORITY: The unique identity of the product.
    const ultraHighPriority = [
      productName.repeat(2), // Name is key.
      `${brandName} ${productName}`,
      `${brandName} ${englishCategoryName}`, // Use English category.
    ];

    // HIGH PRIORITY: Key features and contextual terms.
    const highPriority = [
      englishCategoryName.repeat(2), // English category.
      brandName.repeat(2),
      contextualKeywords.join(" ").repeat(2),
      priceLabelContent, // Add the price label here
    ];
    if (product.features && product.features.length > 0) {
      highPriority.push(product.features.join(" "));
    }

    // MEDIUM PRIORITY: Detailed specifications.
    const mediumPriority = [];
    if (product.specifications && typeof product.specifications === 'object' && product.specifications !== null) {
      const specsEntries = Object.entries(product.specifications);
      if (specsEntries.length > 0) {
        const specsText = specsEntries
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        mediumPriority.push(specsText.repeat(2));
        
        // Debug logging for specifications
        if (process.env.NODE_ENV === 'development') {
          console.log(`📋 Product "${productName}" specifications:`, specsText);
        }
      } else {
        console.warn(`⚠️ Product "${productName}" has empty specifications object`);
      }
    } else {
      console.warn(`⚠️ Product "${productName}" has no specifications field`);
    }

    // LOW PRIORITY: Description (original language is fine here).
    const lowPriority = [];
    if (product.description) {
      lowPriority.push(product.description);
    }

    // Combine all parts into a single string for embedding.
    const searchableContent = [
      ultraHighPriority.filter(Boolean).join(". "),
      highPriority.filter(Boolean).join(". "),
      mediumPriority.filter(Boolean).join(". "),
      lowPriority.filter(Boolean).join(". "),
      // Add original Vietnamese name at low priority to bridge any gaps
      vietnameseCategoryName,
      `Price ${product.price}`,
      product.stock > 0 ? "available" : "out-of-stock",
    ]
      .filter((s) => s && s.trim())
      .join("\n");

    return searchableContent;
  }

  async loadProducts(products) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // [DEV-MODE] Uncomment the line below to force rebuild the vector store on every server restart.
      // Useful for testing changes in `createSearchableContent`.
      // await this.forceRebuildVectorStore();

      // Fetch all products from the database to get the total count
      const allProductsFromDB = products;
      const totalDbCount = allProductsFromDB.length;

      const currentVectorCount = await this.getProductCount();

      if (currentVectorCount > 0 && currentVectorCount === totalDbCount) {
        console.log(
          `✅ FAISS store is up-to-date with ${currentVectorCount} products. Skipping reload.`
        );
        return;
      }

      console.log(
        `📊 Rebuilding vector store. DB count: ${totalDbCount}, Vector count: ${currentVectorCount}`
      );
      await this.forceRebuildVectorStore();

      // --- Fetch and label products ---
      const categories = await Category.find({});
      const categoryIds = categories.map((c) => c._id);

      // Get the cheapest/most expensive products
      const labeledProducts = await getProductsWithPriceLabels(categoryIds);
      const labeledProductIds = new Set(
        labeledProducts.map((p) => p._id.toString())
      );

      // Get all other products, excluding the labeled ones
      const otherProducts = allProductsFromDB.filter(
        (p) => !labeledProductIds.has(p._id.toString())
      );

      // Combine the lists
      const allProductsToLoad = [...labeledProducts, ...otherProducts];

      console.log(
        `Loading ${allProductsToLoad.length} products to FAISS vector store...`
      );
      console.log(
        `(${labeledProducts.length} labeled, ${otherProducts.length} others)`
      );

      const documents = allProductsToLoad.map((product) => {
        // Enhanced specifications handling for metadata
        let processedSpecs = {};
        if (product.specifications && typeof product.specifications === 'object' && product.specifications !== null) {
          processedSpecs = { ...product.specifications };
        }
        
        // Debug logging for products with missing specifications
        if (Object.keys(processedSpecs).length === 0 && process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ Product "${product.name}" (ID: ${product._id}) has no specifications in vector store`);
        }
        
        return {
          pageContent: this.createSearchableContent(product),
          metadata: {
            id: product._id.toString(),
            name: product.name,
            price: product.price,
            discountPrice: product.discountPrice || null,
            category: product.category?.name || "N/A",
            brand: product.brand || "N/A",
            inStock: product.stock > 0,
            specifications: processedSpecs,
            features: product.features || [],
            averageRating: product.averageRating || 0,
            numReviews: product.numReviews || 0,
            isFeatured: product.isFeatured || false,
          },
        };
      });

      if (documents.length > 0) {
        await this.vectorStore.addDocuments(documents);

        // Save to disk only when we actually added new documents
        await this.saveVectorStore();

        console.log(
          `✅ Successfully loaded ${documents.length} products to FAISS vector store`
        );
      }
    } catch (error) {
      console.error("Error loading products to vector store:", error);
      throw error;
    }
  }

  /**
   * Detects category from a Vietnamese query and translates it to an English keyword.
   * It also returns a modified query with the keyword translated to English.
   * @returns {{detectedCategory: string|null, modifiedQuery: string}}
   */
  detectCategoryFromQuery(query) {
    if (!query) return { detectedCategory: null, modifiedQuery: query };

    const lowerQuery = query.toLowerCase();
    for (const [keyword, englishCategory] of Object.entries(
      KEYWORD_TO_ENGLISH_CATEGORY_MAP
    )) {
      if (lowerQuery.includes(keyword)) {
        // Replace the Vietnamese keyword with the English one for the search
        const modifiedQuery = lowerQuery.replace(
          keyword,
          englishCategory.toLowerCase()
        );
        return { detectedCategory: englishCategory, modifiedQuery };
      }
    }

    // If no category keyword is found, return the original query
    return { detectedCategory: null, modifiedQuery: query };
  }

  /**
   * Performs similarity search using an English-first approach.
   * It translates Vietnamese queries, searches with English keywords,
   * and then filters results by mapping DB categories to English.
   */
  async similaritySearch(query, limit = 5) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 1. Detect category and get the English-translated query
    const { detectedCategory, modifiedQuery } =
      this.detectCategoryFromQuery(query);

    console.log(
      `🔍 Searching for: "${query}" (Translated to: "${modifiedQuery}", Category: ${
        detectedCategory || "N/A"
      })`
    );

    // 2. If no category is detected, use the original query and old behavior
    if (!detectedCategory) {
      try {
        const results = await this.vectorStore.similaritySearch(query, limit);
        return results;
      } catch (error) {
        console.error("Error in standard similarity search:", error);
        return [];
      }
    }

    // 3. If a category is detected, search with the modified English query and then filter
    try {
      // Search wider to ensure we find enough items of the correct category
      const broadLimit = limit * 4; // Increased to 4 for better filtering
      const results = await this.vectorStore.similaritySearch(
        modifiedQuery,
        broadLimit
      );

      // Filter and prioritize results that match the detected English category
      const correctCategory = [];
      const others = [];
      for (const item of results) {
        const itemVietnameseCategory = item.metadata?.category;
        if (itemVietnameseCategory) {
          // Map the item's Vietnamese category to English for comparison
          const itemEnglishCategory =
            VI_EN_CATEGORY_MAP[itemVietnameseCategory] ||
            itemVietnameseCategory;
          if (itemEnglishCategory === detectedCategory) {
            correctCategory.push(item);
          } else {
            others.push(item);
          }
        } else {
          others.push(item);
        }
      }

      // Combine the lists, prioritizing the correct category
      const finalResults = [...correctCategory, ...others].slice(0, limit);

      // Debug log
      console.log(
        `📋 Found ${finalResults.length} results for query: "${query}" (category: ${detectedCategory})`
      );
      if (finalResults.length > 0) {
        console.log(`🎯 Search results:`);
        finalResults.forEach((result, index) => {
          console.log(
            `  ${index + 1}. ${result.metadata.name} (${
              result.metadata.brand
            }) [${result.metadata.category}]`
          );
        });
      } else {
        console.log(`❌ No results found for: "${query}"`);
      }

      return finalResults;
    } catch (error) {
      console.error("Error in category-prioritized similarity search:", error);
      return [];
    }
  }

  async saveVectorStore() {
    try {
      if (this.vectorStore) {
        await this.vectorStore.save(this.vectorStorePath);
        console.log("💾 FAISS vector store saved to disk");
      }
    } catch (error) {
      console.error("Error saving vector store:", error);
      throw error;
    }
  }

  async getProductCount() {
    if (!this.vectorStore) return 0;

    try {
      // Search với một chuỗi rỗng để lấy tất cả các vector, như 1 mẹo để đếm
      const results = await this.vectorStore.similaritySearch("", 1000);
      return results.length;
    } catch (error) {
      return 0;
    }
  }

  getVectorStore() {
    return this.vectorStore;
  }

  /**
   * Force rebuild vector store by clearing existing data
   */
  async forceRebuildVectorStore() {
    try {
      console.log("🔄 Force rebuilding vector store...");

      // Create a fresh vector store
      this.vectorStore = new FaissStore(this.embeddings, {});

      // Delete existing files
      if (fs.existsSync(this.vectorStorePath)) {
        const files = fs.readdirSync(this.vectorStorePath);
        for (const file of files) {
          const filePath = path.join(this.vectorStorePath, file);
          fs.unlinkSync(filePath);
        }
        console.log("🗑️ Deleted old vector store files");
      }

      console.log("✅ Vector store reset completed");
    } catch (error) {
      console.error("Error rebuilding vector store:", error);
      throw error;
    }
  }
}

module.exports = VectorStoreManager;
