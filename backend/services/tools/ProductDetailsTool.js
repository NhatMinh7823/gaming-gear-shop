const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const mongoose = require("mongoose");
const Product = require("../../models/productModel");
const { formatPrice } = require("../config/utils");

class ProductDetailsTool extends StructuredTool {
  schema = z.object({
    productId: z
      .string()
      .describe(
        "ID hoặc tên của sản phẩm (có thể tìm bằng ID hoặc tên sản phẩm)"
      ),
  });

  name = "product_details";
  description =
    "Lấy thông tin chi tiết của một sản phẩm bằng ID hoặc tên sản phẩm";

  async _call(input) {
    try {
      // Ensure DB connection is established
      await this._ensureDbConnection();

      let product = null;
      const productQuery = input.productId.trim();

      // Try to find by ID first if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(productQuery)) {
        console.log(`Searching product by ID: ${productQuery}`);
        product = await Product.findById(productQuery).populate(
          "category",
          "name"
        );
      }

      // If not found by ID or not a valid ID, try by name
      if (!product) {
        console.log(`Searching product by name: ${productQuery}`);
        product = await this._findByName(productQuery);
      }

      if (!product) {
        return "❌ Không tìm thấy sản phẩm với ID hoặc tên này.";
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
      console.log("Failed product query:", input.productId);

      // Handle specific error types
      if (error.name === "CastError") {
        return `❌ Lỗi định dạng ID: "${input.productId}" không phải là một ID sản phẩm hợp lệ. Vui lòng thử tìm bằng tên sản phẩm.`;
      } else if (
        error.name === "MongoTimeoutError" ||
        error.message?.includes("timeout")
      ) {
        return "❌ Lỗi hết thời gian kết nối cơ sở dữ liệu. Vui lòng thử lại sau.";
      }

      return "❌ Lỗi khi lấy thông tin chi tiết sản phẩm.";
    }
  }
  /**
   * Ensure database connection is established
   * @private
   */
  async _ensureDbConnection() {
    if (mongoose.connection.readyState !== 1) {
      console.log("Waiting for database connection...");
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Database connection timeout"));
        }, 10000); // 10 second timeout

        const checkConnection = () => {
          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 500);
          }
        };

        checkConnection();

        mongoose.connection.on("connected", () => {
          clearTimeout(timeout);
          resolve();
        });

        mongoose.connection.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
  }

  /**
   * Handle queries by product name that might return multiple results
   * @private
   */
  async _findByName(name) {
    try {
      if (!name || typeof name !== "string") {
        console.log("Invalid product name:", name);
        return null;
      }

      // Sanitize name for regex - escape special characters
      const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

      // Try to find product by exact name match first
      let product = await Product.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, "i") },
      }).populate("category", "name");

      // If not found by exact match, try partial match
      if (!product) {
        // Try a more flexible search
        const products = await Product.find({
          name: { $regex: escapedName, $options: "i" },
        })
          .populate("category", "name")
          .limit(1);

        if (products.length > 0) {
          product = products[0];
        }
      }

      // If still not found, try searching by keywords
      if (!product) {
        const keywords = name
          .split(" ")
          .filter((word) => word.length > 2)
          .map(
            (word) => `(?=.*${word.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`
          )
          .join("");

        if (keywords) {
          const keywordRegex = new RegExp(keywords, "i");
          const products = await Product.find({
            name: keywordRegex,
          })
            .populate("category", "name")
            .limit(1);

          if (products.length > 0) {
            product = products[0];
          }
        }
      }

      return product;
    } catch (error) {
      console.error("Error finding product by name:", error);
      return null;
    }
  }
}

module.exports = ProductDetailsTool;
