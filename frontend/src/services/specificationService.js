import api from './api';

/**
 * Specification Service - Dịch vụ frontend cho các API specifications
 */

const specificationService = {
  /**
   * Phân tích tất cả sản phẩm theo specifications
   */
  analyzeProducts: async () => {
    try {
      const response = await api.get('/specifications/analyze');
      return response.data;
    } catch (error) {
      console.error('Error analyzing products:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Lọc sản phẩm theo specifications nâng cao
   */
  filterBySpecifications: async (filterOptions) => {
    try {
      const response = await api.post('/specifications/filter', filterOptions);
      return response.data;
    } catch (error) {
      console.error('Error filtering by specifications:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Lấy specifications của một danh mục
   */
  getCategorySpecifications: async (categoryId) => {
    try {
      const response = await api.get(`/specifications/category/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting category specifications:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * So sánh specifications của nhiều sản phẩm
   */
  compareProducts: async (productIds) => {
    try {
      const response = await api.post('/specifications/compare', {
        productIds
      });
      return response.data;
    } catch (error) {
      console.error('Error comparing products:', error);
      throw error.response?.data || error.message;
    }
  },

  /**
   * Gợi ý sản phẩm dựa trên specifications
   */
  recommendProducts: async (criteria) => {
    try {
      const response = await api.post('/specifications/recommend', criteria);
      return response.data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error.response?.data || error.message;
    }
  }
};

export default specificationService;

// Export individual functions for convenience
export const {
  analyzeProducts,
  filterBySpecifications,
  getCategorySpecifications,
  compareProducts,
  recommendProducts
} = specificationService;
