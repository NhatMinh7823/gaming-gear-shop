const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const {
  formatProductFromDB,
  getSortOptions,
  buildFilterSummary,
} = require("../config/utils");

class ProductFilterTool extends StructuredTool {
  schema = z.object({
    category: z.string().optional().describe("Danh mục sản phẩm"),
    minPrice: z.number().optional().describe("Giá tối thiểu"),
    maxPrice: z.number().optional().describe("Giá tối đa"),
    brand: z.string().optional().describe("Thương hiệu"),
    inStockOnly: z
      .boolean()
      .optional()
      .default(false)
      .describe("Chỉ sản phẩm còn hàng"),
    specifications: z
      .record(z.string())
      .optional()
      .describe("Thông số kỹ thuật"),
    limit: z.number().optional().default(8).describe("Số lượng kết quả tối đa"),
    sortBy: z
      .enum(["price_asc", "price_desc", "name_asc", "name_desc", "rating_desc"])
      .optional()
      .describe("Tiêu chí sắp xếp"),
  });

  name = "product_filter";
  description =
    "Lọc sản phẩm theo danh mục, giá, thương hiệu, thông số kỹ thuật, và các tiêu chí khác";

  async _call(input) {
    try {
      let query = {};

      // Filter by category
      if (input.category) {
        const category = await Category.findOne({
          name: { $regex: input.category, $options: "i" },
        });
        if (category) {
          query.category = category._id;
        }
      }

      // Filter by price range
      if (input.minPrice || input.maxPrice) {
        query.price = {};
        if (input.minPrice) query.price.$gte = input.minPrice;
        if (input.maxPrice) query.price.$lte = input.maxPrice;
      }

      // Filter by brand
      if (input.brand) {
        query.brand = { $regex: input.brand, $options: "i" };
      }

      // Filter by stock
      if (input.inStockOnly) {
        query.stock = { $gt: 0 };
      }

      // Filter by specifications
      if (input.specifications) {
        Object.entries(input.specifications).forEach(([key, value]) => {
          query[`specifications.${key}`] = { $regex: value, $options: "i" };
        });
      }

      const products = await Product.find(query)
        .populate("category", "name")
        .limit(input.limit || 8)
        .sort(getSortOptions(input.sortBy));

      if (products.length === 0) {
        return "❌ Không tìm thấy sản phẩm nào phù hợp.";
      }

      const productList = products
        .map((product) => formatProductFromDB(product))
        .join("\n\n");

      const filterSummary = buildFilterSummary(input);
      return `🔍 **Kết quả lọc${filterSummary}:**\n\n${productList}\n\n📊 Tìm thấy ${products.length} sản phẩm.`;
    } catch (error) {
      console.error("Error in product filter tool:", error);
      return "❌ Lỗi khi lọc sản phẩm.";
    }
  }
}

module.exports = ProductFilterTool;
