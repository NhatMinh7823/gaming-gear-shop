import React, { useState, useEffect } from 'react';
import AddressSelector from '../Address/AddressSelector';
import { calculateCartShipping, isAddressComplete } from '../../utils/shippingCalculator';
import { calculateShippingFee, getUserAddress } from '../../services/api';

const ShippingForm = ({ 
  shippingAddress, 
  onInputChange, 
  onShippingFeeChange, 
  errors,
  cartItems = [],
  isLoadingAddress = false
}) => {
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [userAddress, setUserAddress] = useState(null);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [shippingInfo, setShippingInfo] = useState(null);

  // Load user's default address on mount
  useEffect(() => {
    loadUserAddress();
  }, []);

  // Calculate shipping fee when address changes
  useEffect(() => {
    if (isAddressComplete(shippingAddress) && cartItems.length > 0) {
      calculateShippingFeeHandler();
    } else {
      // Reset shipping fee if address is incomplete
      if (onShippingFeeChange) {
        onShippingFeeChange(0);
      }
    }
  }, [shippingAddress?.district?.id, shippingAddress?.ward?.code, cartItems]);

  const loadUserAddress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await getUserAddress();
      if (response.data.success && response.data.address?.isComplete) {
        setUserAddress(response.data.address);
      }
    } catch (error) {
      console.error('Error loading user address:', error);
    }
  };

  const calculateShippingFeeHandler = async () => {
    setCalculatingFee(true);
    try {
      // Calculate cart shipping dimensions
      const cartShipping = calculateCartShipping(cartItems);
      
      const response = await calculateShippingFee({
        to_district_id: shippingAddress.district.id,
        to_ward_code: shippingAddress.ward.code,
        weight: cartShipping.weight,
        length: cartShipping.length,
        width: cartShipping.width,
        height: cartShipping.height
      });

      if (response.data.success) {
        const fee = response.data.fee;
        setShippingInfo({
          fee,
          estimatedDays: response.data.details?.expected_delivery_time || '2-3 ngày',
          serviceType: 'standard'
        });
        
        if (onShippingFeeChange) {
          onShippingFeeChange(fee);
        }
      } else {
        // Use fallback fee
        const fallbackFee = response.data.fee || 15000;
        setShippingInfo({
          fee: fallbackFee,
          estimatedDays: '2-3 ngày',
          serviceType: 'standard',
          fallback: true
        });
        
        if (onShippingFeeChange) {
          onShippingFeeChange(fallbackFee);
        }
      }
    } catch (error) {
      console.error('Error calculating shipping fee:', error);
      
      // Use fallback fee on error
      const fallbackFee = 15000;
      setShippingInfo({
        fee: fallbackFee,
        estimatedDays: '2-3 ngày',
        serviceType: 'standard',
        fallback: true,
        error: true
      });
      
      if (onShippingFeeChange) {
        onShippingFeeChange(fallbackFee);
      }
    } finally {
      setCalculatingFee(false);
    }
  };

  const handleUseDefaultAddress = (e) => {
    const checked = e.target.checked;
    setUseDefaultAddress(checked);
    
    if (checked && userAddress) {
      onInputChange({ target: { name: 'shippingAddress', value: userAddress } });
    } else {
      onInputChange({ target: { name: 'shippingAddress', value: {} } });
    }
  };

  const handleAddressChange = (newAddress) => {
    onInputChange({ target: { name: 'shippingAddress', value: newAddress } });
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold text-gray-100 mb-6 pb-4 border-b border-gray-700">
        Thông tin giao hàng
      </h2>

      {/* Loading Default Address */}
      {isLoadingAddress && (
        <div className="mb-6 p-3 bg-blue-600 bg-opacity-20 rounded-lg">
          <p className="text-blue-300 text-sm flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tải địa chỉ mặc định...
          </p>
        </div>
      )}

      {/* Auto-filled Address Notification */}
      {!isLoadingAddress && isAddressComplete(shippingAddress) && !useDefaultAddress && (
        <div className="mb-6 p-3 bg-green-600 bg-opacity-20 rounded-lg">
          <p className="text-green-300 text-sm flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ✅ Đã tự động điền địa chỉ mặc định của bạn
          </p>
        </div>
      )}

      {/* Use Default Address Option */}
      {userAddress && (
        <div className="mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={useDefaultAddress}
              onChange={handleUseDefaultAddress}
              className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-200">Sử dụng địa chỉ mặc định</span>
          </label>
          
          {userAddress && (
            <div className="mt-2 p-3 bg-gray-700 rounded-lg text-sm text-gray-300">
              <p className="font-medium">{userAddress.street}</p>
              <p>
                {userAddress.ward?.name}, {userAddress.district?.name}, {userAddress.province?.name}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Address Selector */}
      {!useDefaultAddress && (
        <div className="mb-6">
          <AddressSelector
            selectedAddress={shippingAddress}
            onAddressChange={handleAddressChange}
            showDetailedAddress={true}
            required={true}
          />
        </div>
      )}

      {/* Shipping Calculation Status */}
      {calculatingFee && (
        <div className="mb-4 p-3 bg-blue-600 bg-opacity-20 rounded-lg">
          <p className="text-blue-300 text-sm flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang tính phí vận chuyển...
          </p>
        </div>
      )}

      {/* Shipping Info Display */}
      {shippingInfo && !calculatingFee && (
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-200 font-medium">Phí vận chuyển:</span>
            <span className="text-green-400 font-bold">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(shippingInfo.fee)}
            </span>
          </div>
          
          <div className="text-sm text-gray-400">
            <p>🚚 Thời gian giao hàng: {shippingInfo.estimatedDays}</p>
            {shippingInfo.fallback && (
              <p className="text-yellow-400">⚠️ Sử dụng phí vận chuyển ước tính</p>
            )}
            {shippingInfo.error && (
              <p className="text-orange-400">⚠️ Không thể tính chính xác, sử dụng phí mặc định</p>
            )}
          </div>
        </div>
      )}

      {/* Address Requirement Notice */}
      {!isAddressComplete(shippingAddress) && !useDefaultAddress && (
        <div className="mt-4 p-3 bg-yellow-600 bg-opacity-20 rounded-lg">
          <p className="text-yellow-300 text-sm">
            ℹ️ Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã để tính phí vận chuyển
          </p>
        </div>
      )}

      {errors.shippingAddress && (
        <p className="mt-2 text-sm text-red-300">{errors.shippingAddress}</p>
      )}
    </div>
  );
};

export default ShippingForm;
