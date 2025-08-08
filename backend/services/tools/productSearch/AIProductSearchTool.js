const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { llmConfig } = require("../../config/llmConfig");
const {
  formatProductFromMetadata,
  formatProductFromDB,
} = require("../../config/utils");

class AIProductSearchTool extends StructuredTool {
  constructor(options = {}) {
    super();
    const { vectorStoreManager } = options;
    if (!vectorStoreManager) {
      throw new Error(
        "AIProductSearchTool requires a valid vectorStoreManager in options."
      );
    }
    this.llm = new ChatGoogleGenerativeAI(llmConfig);
    this.vectorStoreManager = vectorStoreManager;
  }

  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(5).describe("Số lượng kết quả tối đa"),
  });

  name = "ai_product_search";
  description = `Tìm kiếm sản phẩm chung dựa trên các tiêu chí khách quan như tên, danh mục, hoặc thông số kỹ thuật.
    Dùng khi người dùng muốn xem danh sách sản phẩm mà không cần tư vấn cá nhân.
    **KHÔNG DÙNG** khi người dùng hỏi về sản phẩm 'phù hợp', 'dành cho tôi', hoặc cần tư vấn dựa trên sở thích.
    Trong trường hợp đó, hãy dùng 'ai_smart_wishlist'.
    Khi người dùng để cặp đến tìm kiếm dựa trên giá cả (đặt biệt là giá đắt nhất và rẻ nhất), hãy điều chỉnh QUERY với 2 từ khóa 'most expensive - cheapest' tương ứng và chỉ cần chọn limit là 2.
    Khi người dùng hỏi về các thông số kỹ thuật hay các tính năng cụ thể, hãy dịch yêu cầu đó của người dùng sang từ khóa tiếng Anh để tìm kiếm.
    Tai nghe là Headset.
    Khi hỏi về khoảng giá, hãy đảm bảo query đó match(/(từ|khoảng|giá|tầm)\s*(\d+)\s*(đến|-|tới)\s*(\d+)/i).
    categories = [
          "Bàn phím cơ",
          "Chuột",
          "Tai nghe",
          "Màn hình",
          "Gaming Laptops",
          "Gaming PCs",
        ]
    khi đã tìm thấy thì hãy dừng lại và tư vấn kết quả đã tìm được.
    `;

  async _call(input) {
    try {
      const query = input.query || "";
      const limit = input.limit || 5;

      console.log(
        `🤖 AIProductSearchTool called with query: "${query}", limit: ${limit}`
      );

      // Check for price range query
      const priceRangeMatch = query.match(
        /(từ|khoảng|giá|tầm)\s*(\d+)\s*(đến|-|tới)\s*(\d+)/i
      );
      if (priceRangeMatch) {
        console.log("🔍 Detected price range query:", priceRangeMatch);
        let minPrice = parseInt(priceRangeMatch[2]);
        let maxPrice = parseInt(priceRangeMatch[4]);
        if (/triệu/i.test(query)) {
          minPrice *= 1_000_000;
          maxPrice *= 1_000_000;
        }

        // Use direct DB search for price range queries (ưu tiên discountPrice nếu có, fallback price)
        const Product = require("../../../models/productModel");
        const filter = {
          $and: [
            {
              $or: [
                { discountPrice: { $gte: minPrice, $lte: maxPrice } },
                {
                  $and: [
                    {
                      $or: [
                        { discountPrice: { $exists: false } },
                        { discountPrice: null },
                      ],
                    },
                    { price: { $gte: minPrice, $lte: maxPrice } },
                  ],
                },
              ],
            },
          ],
        };
        const categories = [
          "Bàn phím cơ",
          "Chuột",
          "Tai nghe",
          "Màn hình",
          "Gaming Laptops",
          "Gaming PCs",
        ];
        let category = null;
        for (const cat of categories) {
          if (query.toLowerCase().includes(cat.toLowerCase())) {
            category = cat;
            break;
          }
        }
        const Category = require("../../../models/categoryModel");
        const foundCategory = await Category.findOne({ name: category });
        
        if (category && foundCategory) {
          console.log("🔍 Found category:", foundCategory.name);
          filter.$and.push({ category: foundCategory._id });
        }

        const products = await Product.find(filter).populate('category').limit(limit);

        if (!products || products.length === 0) {
          return "[TASK_COMPLETED: product_search] ❌ Không tìm thấy sản phẩm trong khoảng giá này.";
        }

        // Format results using formatProductFromDB
        const formattedProducts = products.map((product) =>
          formatProductFromDB(product)
        );
        return `[TASK_COMPLETED: product_search] 🔍 **Kết quả tìm kiếm cho "${query}"**\n\n## 📦 ${
          products.length
        } Sản phẩm được tìm thấy:\n\n${formattedProducts.join("\n\n")}`;
      }

      // Semantic search using vectorStoreManager for non-price queries
      if (!this.vectorStoreManager) {
        throw new Error("VectorStoreManager is not provided.");
      }
      const vectorResults = await this.vectorStoreManager.similaritySearch(
        query,
        limit
      );

      if (!vectorResults || vectorResults.length === 0) {
        return "[TASK_COMPLETED: product_search] ❌ Không tìm thấy sản phẩm phù hợp theo semantic search.";
      }

      // Use only metadata from vectorStore (no DB query)
      const productsForAI = vectorResults.map((res) => ({
        id: res.metadata?.id || "",
        name: res.metadata?.name || "",
        brand: res.metadata?.brand || "N/A",
        category: res.metadata?.category || "N/A",
        price: res.metadata?.price,
        discountPrice: res.metadata?.discountPrice || null,
        effectivePrice: res.metadata?.discountPrice || res.metadata?.price,
        description: res.metadata?.description || "",
        features: res.metadata?.features || [],
        specifications: res.metadata?.specifications || {},
        averageRating: res.metadata?.averageRating || 0,
        numReviews: res.metadata?.numReviews || 0,
        stock: res.metadata?.stock,
        inStock: res.metadata?.inStock,
      }));

      // Use LLM to select suitable products and generate response
      const prompt = `Dựa trên truy vấn: "${query}", hãy chọn các sản phẩm phù hợp nhất từ danh sách sau và định dạng chúng một cách đẹp đẽ để trả lời người dùng.\nDanh sách sản phẩm:\n${JSON.stringify(productsForAI, null, 2)}`;
      const aiResponse = await this.llm.invoke(prompt);
      const selectedProductsResponse = aiResponse.content;
      return `[TASK_COMPLETED: product_search] ${selectedProductsResponse}`;
    } catch (error) {
      console.error("❌ Error in AIProductSearchTool:", error);
      return `❌ Lỗi AI tìm kiếm sản phẩm: ${error.message}`;
    }
  }
}

module.exports = AIProductSearchTool;
