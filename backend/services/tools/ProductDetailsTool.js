const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const Product = require("../../models/productModel");
const { formatPrice } = require("../config/utils");

class ProductDetailsTool extends StructuredTool {
  schema = z.object({
    productId: z.string().describe("ID của sản phẩm"),
  });

  name = "product_details";
  description = "Lấy thông tin chi tiết của một sản phẩm bằng ID";

  async _call(input) {
    try {
      const product = await Product.findById(input.productId).populate(
        "category",
        "name"
      );

      if (!product) {
        return "❌ Không tìm thấy sản phẩm với ID này.";
      }

      const priceFormatted = formatPrice(product.price);
      const discountPriceFormatted = product.discountPrice
        ? formatPrice(product.discountPrice)
        : null;
      const stockStatus =
        product.stock > 0
          ? `✅ Còn hàng (${product.stock} sản phẩm)`
          : "❌ Hết hàng";

      let details = `🎮 **${product.name}**\n\n`;
      details += `📝 **Mô tả:** ${product.description || "Không có mô tả"}\n\n`;
      details += `💰 **Giá:** ${priceFormatted} VND\n`;

      if (discountPriceFormatted) {
        details += `🏷️ **Giá khuyến mãi:** ${discountPriceFormatted} VND\n`;
      }

      details += `📁 **Danh mục:** ${product.category?.name || "N/A"}\n`;
      details += `🏷️ **Thương hiệu:** ${product.brand || "N/A"}\n`;
      details += `📦 **Tình trạng:** ${stockStatus}\n`;
      details += `🌟 **Đánh giá:** ${product.averageRating || 0}/5 (${
        product.numReviews || 0
      } lượt)\n`;
      details += `⚙️ **Thông số:** ${Object.entries(
        product.specifications || {}
      )
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}\n`;
      details += `✨ **Tính năng:** ${product.features?.join(", ") || "N/A"}\n`;

      if (product.images?.[0]?.url) {
        details += `🖼️ **Hình ảnh:** ${product.images[0].url}\n`;
      }

      return details;
    } catch (error) {
      console.error("Error in product details tool:", error);
      return "❌ Lỗi khi lấy thông tin chi tiết sản phẩm.";
    }
  }
}

module.exports = ProductDetailsTool;
