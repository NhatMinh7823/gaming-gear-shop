const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const VectorStoreManager = require("../chatbot/VectorStoreManager");
const { formatProductFromMetadata } = require("../config/utils");

class ProductSearchTool extends StructuredTool {
  schema = z.object({
    query: z.string().describe("Từ khóa tìm kiếm"),
    limit: z.number().optional().default(5).describe("Số lượng kết quả tối đa"),
  });

  name = "product_search";
  description =
    "Tìm kiếm sản phẩm theo tên, mô tả, thương hiệu, thông số, tính năng, hoặc từ khóa liên quan";

  async _call(input) {
    try {
      const vectorStoreManager = VectorStoreManager.getInstance();
      const results = await vectorStoreManager.similaritySearch(
        input.query || "",
        input.limit || 5
      );

      if (results.length === 0) {
        return "Không tìm thấy sản phẩm nào phù hợp. Hãy thử từ khóa khác.";
      }

      const productList = results
        .map((result) => formatProductFromMetadata(result.metadata))
        .join("\n\n");

      return `🔍 **Tìm thấy ${results.length} sản phẩm:**\n\n${productList}\n\n💡 Cần thêm chi tiết?`;
    } catch (error) {
      console.error("Error in product search tool:", error);
      return "❌ Lỗi khi tìm kiếm sản phẩm.";
    }
  }
}

module.exports = ProductSearchTool;
