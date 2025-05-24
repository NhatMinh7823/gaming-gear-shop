import React from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FaExclamationCircle, FaTimesCircle, FaArrowLeft } from 'react-icons/fa';

const PaymentErrorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const error = searchParams.get('error') || 'unknown';
  const orderId = searchParams.get('orderId');

  const getErrorMessage = () => {
    switch (error) {
      case 'order-cancelled':
        return 'Không thể thanh toán đơn hàng này vì đơn hàng đã bị hủy.';
      case 'amount-mismatch':
        return 'Số tiền thanh toán không khớp với giá trị đơn hàng.';
      default:
        return 'Đã xảy ra lỗi khi xử lý thanh toán của bạn. Vui lòng thử lại sau hoặc chọn phương thức thanh toán khác.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-700">
          <div className="text-center mb-6">
            {error === 'order-cancelled' ? (
              <FaTimesCircle className="mx-auto text-red-500 text-5xl mb-4" />
            ) : (
              <FaExclamationCircle className="mx-auto text-red-500 text-5xl mb-4" />
            )}

            <h2 className="text-2xl font-bold text-gray-100 mb-4">Thanh toán thất bại</h2>

            <p className="text-gray-300 mb-6">
              {getErrorMessage()}
            </p>

            <div className="flex flex-col space-y-4">
              {orderId && (
                <button
                  onClick={() => navigate(`/order/${orderId}`)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  Xem chi tiết đơn hàng
                </button>
              )}

              <button
                onClick={() => navigate('/orders')}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                Danh sách đơn hàng của tôi
              </button>

              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <FaArrowLeft />
                Quay lại trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentErrorPage;