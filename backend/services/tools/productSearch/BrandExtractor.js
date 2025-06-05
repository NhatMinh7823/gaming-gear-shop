class BrandExtractor {
  /**
   * Extract brand name from query
   */
  static extractBrand(query) {
    const lowerQuery = query.toLowerCase();
    const brands = ['asus', 'msi', 'acer', 'lg', 'samsung', 'dell', 'hp', 'razer', 'logitech', 'corsair', 'steelseries', 'benq', 'nzxt'];
    
    for (const brand of brands) {
      if (lowerQuery.includes(brand)) {
        return brand;
      }
    }
    
    return null;
  }
}

module.exports = BrandExtractor;