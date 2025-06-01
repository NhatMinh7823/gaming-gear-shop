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

      // Don't load products automatically - let the service handle it
      // console.log("Loading products to vector store...");
      // await this.loadProductsToVectorStore();

      this.isInitialized = true;
      console.log("Vector store initialized successfully");
    } catch (error) {
      console.error("Error initializing vector store:", error);
      throw error;
    }
  }

  async loadProducts(products) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const documents = products.map((product) => ({
        pageContent: `${product.name} - ${product.description} - Danh mục: ${
          product.category?.name || "N/A"
        } - Giá: ${product.price} VND - Thương hiệu: ${
          product.brand || "N/A"
        } - Đặc điểm: ${
          product.features?.join(", ") || "N/A"
        } - Thông số: ${Object.entries(product.specifications || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")} - Đánh giá: ${product.averageRating || "N/A"} (${
          product.numReviews || 0
        } lượt) - Nổi bật: ${product.isFeatured ? "Có" : "Không"} - Mới: ${
          product.isNewArrival ? "Có" : "Không"
        }`,
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
        console.log(`Loaded ${documents.length} products to vector store`);
      }
    } catch (error) {
      console.error("Error loading products to vector store:", error);
      throw error;
    }
  }

  async loadProductsToVectorStore() {
    try {
      const products = await Product.find().populate("category", "name");
      const documents = products.map((product) => ({
        pageContent: `${product.name} - ${product.description} - Danh mục: ${
          product.category?.name || "N/A"
        } - Giá: ${product.price} VND - Thương hiệu: ${
          product.brand || "N/A"
        } - Đặc điểm: ${
          product.features?.join(", ") || "N/A"
        } - Thông số: ${Object.entries(product.specifications || {})
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")} - Đánh giá: ${product.averageRating || "N/A"} (${
          product.numReviews || 0
        } lượt) - Nổi bật: ${product.isFeatured ? "Có" : "Không"} - Mới: ${
          product.isNewArrival ? "Có" : "Không"
        }`,
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
        console.log(`Loaded ${documents.length} products to vector store`);
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
    return await this.vectorStore.similaritySearch(query, limit);
  }

  getVectorStore() {
    return this.vectorStore;
  }
}

module.exports = VectorStoreManager;
