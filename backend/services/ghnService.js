const axios = require('axios');

class GHNService {
  constructor() {
    this.baseURL = process.env.GHN_API_URL;
    this.token = process.env.GHN_TOKEN;
    this.shopId = process.env.GHN_SHOP_ID;
    
    // Warehouse info - Xã Thới Thạnh, Huyện Thới Lai, Cần Thơ
    this.warehouse = {
      province_id: null, // Will be set after lookup
      district_id: null, // Will be set after lookup
      ward_code: null    // Will be set after lookup
    };
  }

  async getProvinces() {
    try {
      const response = await axios.get(`${this.baseURL}/master-data/province`, {
        headers: {
          'Token': this.token,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('GHN getProvinces error:', error);
      throw new Error('Failed to fetch provinces');
    }
  }

  async getDistricts(provinceId) {
    try {
      const response = await axios.post(`${this.baseURL}/master-data/district`, {
        province_id: parseInt(provinceId)
      }, {
        headers: {
          'Token': this.token,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('GHN getDistricts error:', error);
      throw new Error('Failed to fetch districts');
    }
  }

  async getWards(districtId) {
    try {
      const response = await axios.post(`${this.baseURL}/master-data/ward?district_id=${districtId}`, {
        district_id: parseInt(districtId)
      }, {
        headers: {
          'Token': this.token,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('GHN getWards error:', error);
      throw new Error('Failed to fetch wards');
    }
  }

  async calculateShippingFee({
    to_district_id,
    to_ward_code,
    weight = 200,
    length = 20,
    width = 20,
    height = 5,
    cod_value = 0,
    insurance_value = 0
  }) {
    try {
      const payload = {
        from_district_id: this.warehouse.district_id,
        from_ward_code: this.warehouse.ward_code,
        service_type_id: 2, // E-Commerce Delivery
        to_district_id: parseInt(to_district_id),
        to_ward_code: to_ward_code,
        height: parseInt(height),
        length: parseInt(length),
        weight: parseInt(weight),
        width: parseInt(width),
        insurance_value: parseInt(insurance_value),
        cod_value: parseInt(cod_value),
        coupon: null
      };

      const response = await axios.post(`${this.baseURL}/v2/shipping-order/fee`, payload, {
        headers: {
          'Token': this.token,
          'ShopId': this.shopId,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('GHN calculateShippingFee error:', error);
      
      // Fallback to default shipping fee
      return {
        success: false,
        fallbackFee: 15000,
        error: error.message
      };
    }
  }

  async initializeWarehouse() {
    try {
      // Get Cần Thơ province ID
      const provinces = await this.getProvinces();
      const canTho = provinces.data.find(p => 
        p.ProvinceName.toLowerCase().includes('cần thơ') || 
        p.ProvinceName.toLowerCase().includes('can tho')
      );
      
      if (!canTho) throw new Error('Cần Thơ province not found');
      this.warehouse.province_id = canTho.ProvinceID;

      // Get Thới Lai district ID
      const districts = await this.getDistricts(canTho.ProvinceID);
      const thoiLai = districts.data.find(d => 
        d.DistrictName.toLowerCase().includes('thới lai')
      );
      
      if (!thoiLai) throw new Error('Thới Lai district not found');
      this.warehouse.district_id = thoiLai.DistrictID;

      // Get Thới Thạnh ward code
      const wards = await this.getWards(thoiLai.DistrictID);
      const thoiThanh = wards.data.find(w => 
        w.WardName.toLowerCase().includes('thới thạnh')
      );
      
      if (!thoiThanh) throw new Error('Thới Thạnh ward not found');
      this.warehouse.ward_code = thoiThanh.WardCode;

      console.log('Warehouse initialized:', this.warehouse);
      return this.warehouse;
    } catch (error) {
      console.error('Failed to initialize warehouse:', error);
      throw error;
    }
  }
}

module.exports = new GHNService();
