import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const NavigationButtons = ({ 
  activeStep, 
  onPreviousStep, 
  onNextStep, 
  onCheckout, 
  isCheckingOut 
}) => {
  const renderButtons = () => {
    switch (activeStep) {
      case 1:
        return (
          <>
            <Link
              to="/products"
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-200 hover:bg-gray-700 font-medium rounded-lg transition duration-300 flex items-center justify-center"
            >
              <FaArrowLeft className="mr-2" />
              Tiếp tục mua sắm
            </Link>
            <button
              onClick={onNextStep}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 flex items-center justify-center"
            >
              Tiếp tục đến giao hàng
              <FaArrowRight className="ml-2" />
            </button>
          </>
        );

      case 2:
        return (
          <>
            <button
              onClick={onPreviousStep}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-200 hover:bg-gray-700 font-medium rounded-lg transition duration-300 flex items-center justify-center"
            >
              <FaArrowLeft className="mr-2" />
              Quay lại giỏ hàng
            </button>
            <button
              onClick={onNextStep}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 flex items-center justify-center"
            >
              Tiếp tục tạo đơn hàng
              <FaArrowRight className="ml-2" />
            </button>
          </>
        );

      case 3:
        return (
          <>
            <button
              onClick={onPreviousStep}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-200 hover:bg-gray-700 font-medium rounded-lg transition duration-300 flex items-center justify-center"
            >
              <FaArrowLeft className="mr-2" />
              Quay lại giao hàng
            </button>
            <button
              onClick={onCheckout}
              disabled={isCheckingOut}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingOut ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  Tạo đơn hàng
                  <FaArrowRight className="ml-2" />
                </>
              )}
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex space-x-4">
      {renderButtons()}
    </div>
  );
};

export default NavigationButtons;
