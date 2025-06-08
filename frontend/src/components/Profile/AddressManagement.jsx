import React, { useState, useEffect } from 'react';
import AddressSelector from '../Address/AddressSelector';
import { formatAddress } from '../../utils/shippingCalculator';
import { toast } from 'react-toastify';
import { getUserAddress, updateUserAddress } from '../../services/api';

const AddressManagement = ({ userInfo }) => {
  const [address, setAddress] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserAddress();
  }, []);

  const loadUserAddress = async () => {
    setIsLoading(true);
    try {
      const response = await getUserAddress();
      
      if (response.data.success) {
        setAddress(response.data.address || {});
      }
    } catch (error) {
      console.error('Error loading address:', error);
      toast.error('Không thể tải địa chỉ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!address.province?.id || !address.district?.id || !address.ward?.code) {
      toast.error('Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, phường/xã');
      return;
    }

    if (!address.street?.trim()) {
      toast.error('Vui lòng nhập địa chỉ chi tiết');
      return;
    }

    setIsSaving(true);
    try {
      const response = await updateUserAddress({
        street: address.street.trim(),
        ward: address.ward,
        district: address.district,
        province: address.province,
        isDefault: true
      });

      if (response.data.success) {
        toast.success('Cập nhật địa chỉ thành công');
        setIsEditing(false);
        loadUserAddress();
      }
    } catch (error) {
      toast.error('Lỗi khi cập nhật địa chỉ');
      console.error('Error saving address:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadUserAddress(); // Reset to original address
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-xl p-8 mb-8 border border-gray-700">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="animate-pulse flex-1">
            <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl rounded-xl p-8 mb-8 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-100">Địa chỉ giao hàng</h2>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 transform hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{address.isComplete ? 'Chỉnh sửa' : 'Thêm địa chỉ'}</span>
          </button>
        )}
      </div>

      {address.isComplete && !isEditing ? (
        // Display existing address
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-100 font-semibold text-lg">Địa chỉ mặc định</span>
                  <span className="ml-2 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Đã xác minh</span>
                </div>
                
                <div className="space-y-2 ml-11">
                  <p className="text-gray-200 font-medium">{address.street}</p>
                  <p className="text-gray-300">
                    {address.ward?.name}, {address.district?.name}
                  </p>
                  <p className="text-gray-300">{address.province?.name}</p>
                </div>
                
                <div className="mt-4 ml-11 flex items-center space-x-4 text-sm">
                  <span className="flex items-center text-green-400">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Địa chỉ hoàn chỉnh
                  </span>
                  <span className="flex items-center text-blue-400">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Sẵn sàng giao hàng
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 text-sm text-blue-300">
                <p className="font-medium mb-1">Thông tin quan trọng</p>
                <p>Địa chỉ này sẽ được sử dụng làm mặc định khi đặt hàng. Bạn có thể thay đổi địa chỉ giao hàng khác trong quá trình thanh toán.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Address form
        <div className="space-y-6">
          <AddressSelector
            selectedAddress={address}
            onAddressChange={setAddress}
            showDetailedAddress={true}
            required={true}
          />
          
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
            {isEditing && (
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Hủy</span>
              </button>
            )}
            
            <button
              onClick={handleSaveAddress}
              disabled={isSaving}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Lưu địa chỉ</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressManagement;
