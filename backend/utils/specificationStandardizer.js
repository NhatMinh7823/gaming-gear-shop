/**
 * Specification Standardizer - Chuẩn hóa và phân loại specifications
 */

class SpecificationStandardizer {
  constructor() {
    // Mapping cho chuẩn hóa specification keys
    this.keyMappings = {
      // Keyboards
      'type': 'type',
      'switches': 'switches', 
      'connectivity': 'connectivity',
      'backlight': 'backlight',
      'layout': 'layout',
      
      // Mice
      'sensor': 'sensor',
      'weight': 'weight',
      'battery': 'battery',
      'dpi': 'dpi',
      
      // Headsets
      'microphone': 'microphone',
      'frequency': 'frequency',
      
      // Monitors
      'size': 'size',
      'resolution': 'resolution',
      'refresh_rate': 'refresh_rate',
      'response_time': 'response_time',
      'panel': 'panel',
      
      // Laptops & Desktops - chuẩn hóa tiếng Việt/Anh
      'processor': 'processor',
      'Bộ xử lý': 'processor',
      'graphics': 'graphics',
      'Đồ họa': 'graphics',
      'memory': 'memory',
      'Bộ nhớ': 'memory',
      'storage': 'storage',
      'Lưu trữ': 'storage',
      'display': 'display',
      'Màn hình': 'display',
      'motherboard': 'motherboard'
    };

    // Chuẩn hóa giá trị
    this.valueStandardizers = {
      connectivity: this.standardizeConnectivity,
      type: this.standardizeType,
      switches: this.standardizeSwitches,
      backlight: this.standardizeBacklight,
      layout: this.standardizeLayout,
      weight: this.standardizeWeight,
      battery: this.standardizeBattery,
      dpi: this.standardizeDpi,
      processor: this.standardizeProcessor,
      graphics: this.standardizeGraphics,
      memory: this.standardizeMemory,
      storage: this.standardizeStorage
    };

    // Performance tier thresholds
    this.performanceTiers = {
      keyboards: {
        entry: { features: ['membrane', 'basic switches', 'wired only'] },
        mid: { features: ['mechanical', 'branded switches', 'some wireless'] },
        high: { features: ['premium switches', 'full wireless', 'advanced features'] }
      },
      mice: {
        entry: { maxDpi: 10000, features: ['basic sensor', 'wired'] },
        mid: { maxDpi: 25000, features: ['good sensor', 'mixed connectivity'] },
        high: { minDpi: 25000, features: ['top sensors', 'ultra-light', 'wireless'] }
      },
      laptops: {
        entry: { graphics: ['RTX 4050', 'RTX 4060'], memory: [8, 16] },
        mid: { graphics: ['RTX 4060', 'RTX 4070'], memory: [16, 32] },
        high: { graphics: ['RTX 4080', 'RTX 4090'], memory: [32, 64] }
      },
      monitors: {
        entry: { resolution: '1080p', refreshRate: [60, 144] },
        mid: { resolution: '1440p', refreshRate: [144, 240] },
        high: { resolution: ['4K', 'Ultrawide'], refreshRate: 240, panel: ['OLED', 'Mini-LED'] }
      }
    };

    // Use case mappings
    this.useCases = {
      competitive: {
        keywords: ['competitive', 'esports', 'pro', 'tournament'],
        requirements: {
          mice: { maxWeight: 80, minDpi: 20000 },
          keyboards: { layout: ['Tenkeyless', '60%'], switches: 'fast' },
          monitors: { minRefreshRate: 240, maxResponseTime: 1 }
        }
      },
      content: {
        keywords: ['content', 'creator', 'streaming', 'professional'],
        requirements: {
          monitors: { minResolution: '1440p', colorAccuracy: true },
          keyboards: { layout: 'Full-size', macroSupport: true }
        }
      },
      casual: {
        keywords: ['casual', 'gaming', 'rgb', 'wireless'],
        requirements: {
          balancedPerformance: true,
          rgbLighting: true,
          wirelessSupport: true
        }
      }
    };
  }

  /**
   * Chuẩn hóa specifications của một sản phẩm
   */
  standardizeProductSpecs(product) {
    if (!product.specifications) return product;

    const standardized = {};
    const originalSpecs = product.specifications;

    // Chuẩn hóa keys và values
    Object.entries(originalSpecs).forEach(([key, value]) => {
      const standardKey = this.keyMappings[key] || key.toLowerCase();
      const standardizer = this.valueStandardizers[standardKey];
      
      standardized[standardKey] = standardizer 
        ? standardizer.call(this, value)
        : this.standardizeGeneral(value);
    });

    return {
      ...product,
      specifications: standardized,
      originalSpecifications: originalSpecs
    };
  }

  /**
   * Phân loại performance tier
   */
  classifyPerformanceTier(product, category) {
    const specs = product.specifications;
    const categoryKey = this.getCategoryKey(category);
    const tiers = this.performanceTiers[categoryKey];
    
    if (!tiers) return 'unknown';

    // Logic phân loại theo từng category
    switch (categoryKey) {
      case 'mice':
        return this.classifyMouseTier(specs);
      case 'keyboards':
        return this.classifyKeyboardTier(specs);
      case 'laptops':
        return this.classifyLaptopTier(specs);
      case 'monitors':
        return this.classifyMonitorTier(specs);
      default:
        return 'mid';
    }
  }

  /**
   * Phân loại use case
   */
  classifyUseCase(product) {
    const name = product.name.toLowerCase();
    const description = product.description.toLowerCase();
    const specs = product.specifications;
    
    const scores = {
      competitive: this.calculateCompetitiveScore(name, description, specs),
      content: this.calculateContentScore(name, description, specs),
      casual: this.calculateCasualScore(name, description, specs)
    };

    // Trả về use case có điểm cao nhất
    return Object.entries(scores).reduce((max, [useCase, score]) => 
      score > max.score ? { useCase, score } : max, 
      { useCase: 'casual', score: 0 }
    ).useCase;
  }

  // ============ VALUE STANDARDIZERS ============

  standardizeConnectivity(value) {
    const val = String(value).toLowerCase();
    if (val.includes('wireless') && val.includes('bluetooth')) return 'Hybrid Wireless';
    if (val.includes('wireless') || val.includes('bluetooth')) return 'Wireless';
    if (val.includes('wired') || val.includes('usb')) return 'Wired';
    return value;
  }

  standardizeType(value) {
    const val = String(value).toLowerCase();
    if (val.includes('mechanical') || val.includes('cơ học')) return 'Mechanical';
    if (val.includes('optical')) return 'Optical-Mechanical';
    if (val.includes('membrane')) return 'Membrane';
    if (val.includes('over-ear')) return 'Over-ear';
    return value;
  }

  standardizeSwitches(value) {
    const val = String(value);
    // Chuẩn hóa tên switches
    return val.replace(/\s+/g, ' ').trim();
  }

  standardizeBacklight(value) {
    const val = String(value).toLowerCase();
    if (val.includes('rgb') || val.includes('chroma')) return 'RGB';
    if (val.includes('white') || val.includes('led')) return 'White LED';
    return 'None';
  }

  standardizeLayout(value) {
    const val = String(value).toLowerCase();
    if (val.includes('full') || val.includes('100%')) return 'Full-size';
    if (val.includes('tenkeyless') || val.includes('tkl') || val.includes('80%')) return 'Tenkeyless';
    if (val.includes('65%')) return '65%';
    if (val.includes('60%')) return '60%';
    return value;
  }

  standardizeWeight(value) {
    const val = String(value);
    const match = val.match(/(\d+(?:\.\d+)?)\s*g/);
    return match ? `${match[1]}g` : value;
  }

  standardizeBattery(value) {
    const val = String(value);
    if (val.toLowerCase().includes('up to')) return val;
    const match = val.match(/(\d+)\s*hour/i);
    return match ? `Up to ${match[1]} hours` : value;
  }

  standardizeDpi(value) {
    const val = String(value);
    if (val.toLowerCase().includes('up to')) return val;
    const match = val.match(/(\d+(?:,\d+)?)/);
    return match ? `Up to ${match[1].replace(',', '')}` : value;
  }

  standardizeProcessor(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  standardizeGraphics(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  standardizeMemory(value) {
    const val = String(value);
    const match = val.match(/(\d+)GB\s*(DDR\d+)?/i);
    return match ? `${match[1]}GB ${match[2] || 'DDR5'}` : value;
  }

  standardizeStorage(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  standardizeGeneral(value) {
    return String(value).trim();
  }

  // ============ TIER CLASSIFICATION ============

  classifyMouseTier(specs) {
    const dpiMatch = specs.dpi?.match(/(\d+(?:,\d+)?)/);
    const dpi = dpiMatch ? parseInt(dpiMatch[1].replace(',', '')) : 0;
    const weightMatch = specs.weight?.match(/(\d+(?:\.\d+)?)/);
    const weight = weightMatch ? parseFloat(weightMatch[1]) : 100;

    if (dpi >= 25000 && weight <= 80 && specs.connectivity?.includes('Wireless')) return 'high';
    if (dpi >= 15000 && weight <= 100) return 'mid';
    return 'entry';
  }

  classifyKeyboardTier(specs) {
    const isWireless = specs.connectivity?.includes('Wireless');
    const hasPremiumSwitches = specs.switches?.includes('Cherry MX') || 
                               specs.switches?.includes('Razer') ||
                               specs.switches?.includes('Corsair OPX');
    const hasRGB = specs.backlight === 'RGB';

    if (isWireless && hasPremiumSwitches && hasRGB) return 'high';
    if (specs.type === 'Mechanical' && (hasPremiumSwitches || hasRGB)) return 'mid';
    return 'entry';
  }

  classifyLaptopTier(specs) {
    const graphics = specs.graphics || '';
    const memoryMatch = specs.memory?.match(/(\d+)GB/);
    const memory = memoryMatch ? parseInt(memoryMatch[1]) : 8;

    if (graphics.includes('RTX 4090') || graphics.includes('RTX 4080') || memory >= 32) return 'high';
    if (graphics.includes('RTX 4070') || graphics.includes('RTX 4060') || memory >= 16) return 'mid';
    return 'entry';
  }

  classifyMonitorTier(specs) {
    const resolution = specs.resolution || '';
    const refreshMatch = specs.refresh_rate?.match(/(\d+)Hz/);
    const refreshRate = refreshMatch ? parseInt(refreshMatch[1]) : 60;
    const panel = specs.panel || '';

    if (resolution.includes('4K') || panel.includes('OLED') || refreshRate >= 240) return 'high';
    if (resolution.includes('1440') || refreshRate >= 144) return 'mid';
    return 'entry';
  }

  // ============ USE CASE SCORING ============

  calculateCompetitiveScore(name, description, specs) {
    let score = 0;
    
    // Keyword matching
    if (name.includes('pro') || name.includes('competitive') || name.includes('esport')) score += 30;
    if (description.includes('cạnh tranh') || description.includes('chuyên nghiệp')) score += 20;
    
    // Spec-based scoring
    if (specs.layout === 'Tenkeyless' || specs.layout === '60%') score += 25;
    if (specs.refresh_rate && parseInt(specs.refresh_rate) >= 240) score += 30;
    if (specs.response_time && parseFloat(specs.response_time) <= 1) score += 25;
    
    return score;
  }

  calculateContentScore(name, description, specs) {
    let score = 0;
    
    if (name.includes('creator') || name.includes('professional')) score += 30;
    if (description.includes('sáng tạo') || description.includes('chuyên nghiệp')) score += 20;
    
    if (specs.resolution && (specs.resolution.includes('4K') || specs.resolution.includes('1440'))) score += 25;
    if (specs.layout === 'Full-size') score += 20;
    if (specs.panel && (specs.panel.includes('IPS') || specs.panel.includes('OLED'))) score += 15;
    
    return score;
  }

  calculateCasualScore(name, description, specs) {
    let score = 0;
    
    if (name.includes('gaming') || name.includes('rgb')) score += 20;
    if (description.includes('chơi game') || description.includes('rgb')) score += 15;
    
    if (specs.backlight === 'RGB') score += 25;
    if (specs.connectivity?.includes('Wireless')) score += 20;
    
    return score;
  }

  // ============ UTILITIES ============

  getCategoryKey(categoryId) {
    // Map ObjectId to category keys - cần update theo actual category IDs
    const categoryMap = {
      '6826a6ade2250e6613f42bd8': 'keyboards',
      '6826a6ade2250e6613f42bd9': 'mice', 
      '6826a6ade2250e6613f42bda': 'headsets',
      '6826a6ade2250e6613f42bdb': 'monitors',
      '6826a6ade2250e6613f42bdc': 'laptops',
      '6826a6ade2250e6613f42bdd': 'desktops'
    };
    
    return categoryMap[categoryId] || 'unknown';
  }

  /**
   * Phân tích và phân loại toàn bộ danh sách sản phẩm
   */
  analyzeProducts(products) {
    return products.map(product => {
      const standardized = this.standardizeProductSpecs(product);
      const categoryId = product.category?._id || product.category?.$oid || product.category;
      
      return {
        ...product, // Preserve all original fields (images, stock, etc.)
        ...standardized, // Add standardized specs and original specs
        performanceTier: this.classifyPerformanceTier(standardized, categoryId),
        useCase: this.classifyUseCase(standardized),
        categoryKey: this.getCategoryKey(categoryId)
      };
    });
  }

  /**
   * Tạo báo cáo phân tích specifications
   */
  generateAnalysisReport(products) {
    const analyzed = this.analyzeProducts(products);
    
    const report = {
      totalProducts: analyzed.length,
      categories: {},
      performanceTiers: { entry: 0, mid: 0, high: 0 },
      useCases: { competitive: 0, content: 0, casual: 0 },
      specifications: {}
    };

    analyzed.forEach(product => {
      // Category analysis
      if (!report.categories[product.categoryKey]) {
        report.categories[product.categoryKey] = 0;
      }
      report.categories[product.categoryKey]++;

      // Performance tier analysis
      report.performanceTiers[product.performanceTier]++;

      // Use case analysis  
      report.useCases[product.useCase]++;

      // Specifications analysis
      Object.keys(product.specifications).forEach(specKey => {
        if (!report.specifications[specKey]) {
          report.specifications[specKey] = new Set();
        }
        report.specifications[specKey].add(product.specifications[specKey]);
      });
    });

    // Convert Sets to Arrays for JSON serialization
    Object.keys(report.specifications).forEach(key => {
      report.specifications[key] = Array.from(report.specifications[key]);
    });

    return { analyzed, report };
  }
}

module.exports = SpecificationStandardizer;
