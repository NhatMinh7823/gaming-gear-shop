import React, { useState, useEffect } from 'react';
import { getProvinces, getDistricts, getWards } from '../../services/api';

const AddressSelector = ({ 
  selectedAddress, 
  onAddressChange, 
  showDetailedAddress = true,
  required = false 
}) => {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState({
    provinces: false,
    districts: false,
    wards: false
  });

  // Load provinces on component mount
  useEffect(() => {
    loadProvinces();
  }, []);

  // Auto-load districts and wards when selectedAddress changes (for auto-filled address)
  useEffect(() => {
    if (selectedAddress?.province?.id) {
      // Check if we need to load districts for this province
      const needsDistrictsReload = districts.length === 0 || 
        (districts.length > 0 && !districts.some(d => d.DistrictID === selectedAddress.district?.id));
      
      if (needsDistrictsReload) {
        console.log('Auto-loading districts for province:', selectedAddress.province);
        loadDistricts(selectedAddress.province.id);
      }
    }
  }, [selectedAddress?.province?.id, selectedAddress?.district?.id]);

  useEffect(() => {
    if (selectedAddress?.district?.id && districts.length > 0) {
      // Check if we need to load wards for this district
      const needsWardsReload = wards.length === 0 || 
        (wards.length > 0 && !wards.some(w => w.WardCode === selectedAddress.ward?.code));
      
      if (needsWardsReload) {
        console.log('Auto-loading wards for district:', selectedAddress.district);
        loadWards(selectedAddress.district.id);
      }
    }
  }, [selectedAddress?.district?.id, selectedAddress?.ward?.code, districts.length]);

  const loadProvinces = async () => {
    setLoading(prev => ({ ...prev, provinces: true }));
    try {
      const response = await getProvinces();
      if (response.data.success) {
        setProvinces(response.data.data);
      }
    } catch (error) {
      console.error('Error loading provinces:', error);
    } finally {
      setLoading(prev => ({ ...prev, provinces: false }));
    }
  };

  const loadDistricts = async (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      setWards([]);
      return;
    }

    setLoading(prev => ({ ...prev, districts: true }));
    try {
      const response = await getDistricts(provinceId);
      if (response.data.success) {
        setDistricts(response.data.data);
        setWards([]); // Reset wards when province changes
      }
    } catch (error) {
      console.error('Error loading districts:', error);
    } finally {
      setLoading(prev => ({ ...prev, districts: false }));
    }
  };

  const loadWards = async (districtId) => {
    if (!districtId) {
      setWards([]);
      return;
    }

    setLoading(prev => ({ ...prev, wards: true }));
    try {
      const response = await getWards(districtId);
      if (response.data.success) {
        setWards(response.data.data);
      }
    } catch (error) {
      console.error('Error loading wards:', error);
    } finally {
      setLoading(prev => ({ ...prev, wards: false }));
    }
  };

  const handleProvinceChange = (e) => {
    const provinceId = parseInt(e.target.value);
    const province = provinces.find(p => p.ProvinceID === provinceId);
    
    const newAddress = {
      ...selectedAddress,
      province: province ? {
        id: province.ProvinceID,
        name: province.ProvinceName
      } : null,
      district: null,
      ward: null
    };
    
    onAddressChange(newAddress);
    
    if (provinceId) {
      loadDistricts(provinceId);
    } else {
      setDistricts([]);
      setWards([]);
    }
  };

  const handleDistrictChange = (e) => {
    const districtId = parseInt(e.target.value);
    const district = districts.find(d => d.DistrictID === districtId);
    
    const newAddress = {
      ...selectedAddress,
      district: district ? {
        id: district.DistrictID,
        name: district.DistrictName
      } : null,
      ward: null
    };
    
    onAddressChange(newAddress);
    
    if (districtId) {
      loadWards(districtId);
    } else {
      setWards([]);
    }
  };

  const handleWardChange = (e) => {
    const wardCode = e.target.value;
    const ward = wards.find(w => w.WardCode === wardCode);
    
    const newAddress = {
      ...selectedAddress,
      ward: ward ? {
        code: ward.WardCode,
        name: ward.WardName
      } : null
    };
    
    onAddressChange(newAddress);
  };

  const handleStreetChange = (e) => {
    const newAddress = {
      ...selectedAddress,
      street: e.target.value
    };
    onAddressChange(newAddress);
  };

  return (
    <div className="space-y-4">
      {/* Province Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Tỉnh/Thành phố {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedAddress?.province?.id || ''}
          onChange={handleProvinceChange}
          disabled={loading.provinces}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
          required={required}
        >
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
          {provinces.map(province => (
            <option key={province.ProvinceID} value={province.ProvinceID}>
              {province.ProvinceName}
            </option>
          ))}
        </select>
        {loading.provinces && (
          <p className="text-sm text-gray-400 mt-1">Đang tải tỉnh/thành phố...</p>
        )}
      </div>

      {/* District Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Quận/Huyện {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedAddress?.district?.id || ''}
          onChange={handleDistrictChange}
          disabled={loading.districts || !selectedAddress?.province?.id}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          required={required}
        >
          <option value="">-- Chọn Quận/Huyện --</option>
          {districts.map(district => (
            <option key={district.DistrictID} value={district.DistrictID}>
              {district.DistrictName}
            </option>
          ))}
        </select>
        {loading.districts && (
          <p className="text-sm text-gray-400 mt-1">Đang tải quận/huyện...</p>
        )}
      </div>

      {/* Ward Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Phường/Xã {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedAddress?.ward?.code || ''}
          onChange={handleWardChange}
          disabled={loading.wards || !selectedAddress?.district?.id}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          required={required}
        >
          <option value="">-- Chọn Phường/Xã --</option>
          {wards.map(ward => (
            <option key={ward.WardCode} value={ward.WardCode}>
              {ward.WardName}
            </option>
          ))}
        </select>
        {loading.wards && (
          <p className="text-sm text-gray-400 mt-1">Đang tải phường/xã...</p>
        )}
      </div>

      {/* Detailed Address */}
      {showDetailedAddress && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Địa chỉ chi tiết {required && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={selectedAddress?.street || ''}
            onChange={handleStreetChange}
            placeholder="Số nhà, tên đường..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-700 text-gray-200 focus:outline-none focus:border-blue-500"
            required={required}
          />
        </div>
      )}
    </div>
  );
};

export default AddressSelector;
