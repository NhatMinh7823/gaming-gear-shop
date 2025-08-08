import React from 'react';
import { FaShoppingCart, FaTruck, FaCreditCard } from 'react-icons/fa';

const StepIndicator = ({ activeStep }) => {
  return (
    <div className="flex items-center justify-center mb-10">
      <div className="w-full max-w-3xl flex justify-between">
        <div className="flex flex-col items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${activeStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'} mb-2 transition-all duration-300`}>
            <FaShoppingCart className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${activeStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>Giỏ hàng</span>
        </div>

        <div className={`w-full h-1 max-w-[80px] self-center ${activeStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'} transition-all duration-300`} />

        <div className="flex flex-col items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${activeStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'} mb-2 transition-all duration-300`}>
            <FaTruck className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${activeStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>Vận chuyển</span>
        </div>

        <div className={`w-full h-1 max-w-[80px] self-center ${activeStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'} transition-all duration-300`} />

        <div className="flex flex-col items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${activeStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'} mb-2 transition-all duration-300`}>
            <FaCreditCard className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${activeStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>Tạo đơn hàng</span>
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
