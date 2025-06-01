const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const { formatProductFromDB, formatPrice } = require("../config/utils");

class PriceRangeTool extends StructuredTool {
  schema = z.object({
    minPrice: z.number().describe("Giá tối thiểu"),
    maxPrice: z.number().describe("Giá tối đa"),
    categoryFilter: z.string().optional().describe("Danh mục để lọc"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Số lượng kết quả tối đa"),
  });

  name = "price_range_search";
  description =
    "Tìm kiếm sản phẩm trong khoảng giá, có thể kết hợp với lọc theo danh mục";

  async getCategoryId(categoryName) {
    try {
      const category = await Category.findOne({
        name: { $regex: categoryName, $options: "i" },
      });
      return category ? category._id : null;
    } catch (error) {
      return null;
    }
  }

  async _call(input) {
    try {
      const categoryId = input.categoryFilter
        ? await this.getCategoryId(input.categoryFilter)
        : null;

      const products = await Product.find({
        price: { $gte: input.minPrice, $lte: input.maxPrice },
        ...(categoryId && { category: categoryId }),
      })
        .populate("category", "name")
        .sort({ price: 1 })
        .limit(input.limit || 10);

      if (products.length === 0) {
        return `❌ Không tìm thấy sản phẩm nào trong khoảng giá ${formatPrice(
          input.minPrice
        )} - ${formatPrice(input.maxPrice)} VND.`;
      }

      const productList = products
        .map((product) => formatProductFromDB(product))
        .join("\n\n");

      const priceRangeFormatted = `${formatPrice(
        input.minPrice
      )} - ${formatPrice(input.maxPrice)} VND`;

      return `💰 **Sản phẩm trong khoảng giá ${priceRangeFormatted}:**\n\n${productList}\n\n📊 Tìm thấy ${products.length} sản phẩm.`;
    } catch (error) {
      console.error("Error in price range tool:", error);
      return "❌ Lỗi khi tìm kiếm sản phẩm theo giá.";
    }
  }
}

module.exports = PriceRangeTool;
