const { StructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const Category = require("../../../models/categoryModel");

class CategoryListTool extends StructuredTool {
  schema = z.object({});

  name = "category_list";
  description = "Hiển thị danh sách tất cả danh mục sản phẩm";

  async _call() {
    try {
      console.log("Fetching category list...");
      const categories = await Category.find().select("name description");

      if (categories.length === 0) {
        return "❌ Không tìm thấy danh mục sản phẩm nào.";
      }

      const categoryList = categories
        .map(
          (category, index) =>
            `${index + 1}. 📁 **${category.name}**${
              category.description ? ` - ${category.description}` : ""
            }`
        )
        .join("\n");

      return `📂 **Danh mục sản phẩm Gaming Gear:**\n\n${categoryList}\n\n💡 Bạn muốn xem sản phẩm trong danh mục nào?`;
    } catch (error) {
      console.error("Error in category list tool:", error);
      return "❌ Lỗi khi lấy danh sách danh mục.";
    }
  }
}

module.exports = CategoryListTool;
