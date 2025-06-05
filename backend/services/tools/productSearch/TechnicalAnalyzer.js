class TechnicalAnalyzer {
  /**
   * Analyze technical requirements found in search results
   */
  static analyzeTechnicalRequirements(query, results) {
    const lowerQuery = query.toLowerCase();
    const topResults = results.slice(0, 3); // Analyze top 3 results
    
    let analysis = [];
    
    if (lowerQuery.includes('thunderbolt')) {
      const thunderboltProducts = topResults.filter(result => {
        const specs = result.metadata.specifications || {};
        const features = result.metadata.features || [];
        const allText = `${Object.values(specs).join(' ')} ${features.join(' ')}`.toLowerCase();
        return allText.includes('thunderbolt');
      });
      
      if (thunderboltProducts.length > 0) {
        analysis.push(`${thunderboltProducts.length} sản phẩm có Thunderbolt`);
        
        // Check for count requirements
        if (lowerQuery.includes('hai') || lowerQuery.includes('2')) {
          const twoPortProducts = thunderboltProducts.filter(result => {
            const specs = result.metadata.specifications || {};
            const allText = Object.values(specs).join(' ').toLowerCase();
            return allText.includes('2') || allText.includes('hai') || allText.includes('x2');
          });
          
          if (twoPortProducts.length > 0) {
            analysis.push(`trong đó ${twoPortProducts.length} có 2 cổng`);
          }
        }
      }
    }
    
    if (lowerQuery.includes('usb-c') || lowerQuery.includes('usb c')) {
      const usbcProducts = topResults.filter(result => {
        const specs = result.metadata.specifications || {};
        const allText = Object.values(specs).join(' ').toLowerCase();
        return allText.includes('usb-c') || allText.includes('usb c');
      });
      
      if (usbcProducts.length > 0) {
        analysis.push(`${usbcProducts.length} sản phẩm có USB-C`);
      }
    }
    
    return analysis.length > 0 ? analysis.join(', ') : null;
  }
}

module.exports = TechnicalAnalyzer;