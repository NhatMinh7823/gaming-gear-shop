import React, { useState, useEffect } from 'react';
import { FaTicketAlt, FaCopy, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { COUPON, formatToastMessage } from '../../utils/toastMessages';
import { getAvailableCoupons } from '../../services/api';

const AvailableCoupons = ({ onSelectCoupon, appliedCoupon, userInfo }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    fetchAvailableCoupons();
  }, [userInfo]);

  const fetchAvailableCoupons = async () => {
    try {
      const { data } = await getAvailableCoupons();
      let allCoupons = [];
      
      if (data.success) {
        allCoupons = [...data.coupons];
      }
      
      // Add user's personal coupon if available and not used
      if (userInfo?.coupon && userInfo.coupon.code && !userInfo.coupon.used && userInfo.coupon.status !== 'used' && userInfo.coupon.status !== 'pending') {
        const userCoupon = {
          code: userInfo.coupon.code,
          discountPercent: userInfo.coupon.discountPercent || 30,
          type: 'percentage',
          description: `Giảm ${userInfo.coupon.discountPercent || 30}% cho đơn hàng đầu tiên`,
          minOrder: 0,
          maxDiscount: null,
          isPersonal: true
        };
        
        // Add personal coupon at the beginning
        allCoupons.unshift(userCoupon);
      }
      
      setCoupons(allCoupons);
    } catch (error) {
      console.error('Error fetching available coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(formatToastMessage(COUPON.COPY_SUCCESS, { code }));
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (error) {
      toast.error(COUPON.COPY_ERROR);
    }
  };

  const handleSelectCoupon = (coupon) => {
    onSelectCoupon(coupon.code);
    setShowCoupons(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const getCouponIcon = (type) => {
    switch (type) {
      case 'percentage':
        return '🎯';
      case 'freeship':
        return '🚚';
      default:
        return '🎫';
    }
  };

  const getCouponColor = (type) => {
    switch (type) {
      case 'percentage':
        return 'from-purple-500 to-pink-500';
      case 'freeship':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-green-500 to-emerald-500';
    }
  };

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-700 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowCoupons(!showCoupons)}
        className="flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
      >
        <FaTicketAlt className="mr-2" />
        {showCoupons ? 'Ẩn mã giảm giá có sẵn' : 'Xem mã giảm giá có sẵn'}
      </button>

      {showCoupons && (
        <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
          {coupons.map((coupon) => {
            const isApplied = appliedCoupon?.code === coupon.code;
            
            return (
              <div
                key={coupon.code}
                className={`p-3 rounded-lg border transition-all duration-200 ${
                  isApplied
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getCouponColor(coupon.type)} flex items-center justify-center text-white text-lg`}>
                      {getCouponIcon(coupon.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-100">{coupon.code}</span>
                        {coupon.isPersonal && (
                          <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                            Cá nhân
                          </span>
                        )}
                        {isApplied && (
                          <FaCheck className="text-green-400 text-sm" />
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{coupon.description}</p>
                      {coupon.minOrder > 0 && (
                        <p className="text-xs text-gray-400">
                          Đơn tối thiểu: {formatPrice(coupon.minOrder)}
                        </p>
                      )}
                      {coupon.maxDiscount && (
                        <p className="text-xs text-gray-400">
                          Giảm tối đa: {formatPrice(coupon.maxDiscount)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      className="p-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"
                      title="Sao chép mã"
                    >
                      {copiedCode === coupon.code ? (
                        <FaCheck className="text-green-400" />
                      ) : (
                        <FaCopy />
                      )}
                    </button>
                    
                    {!isApplied && (
                      <button
                        onClick={() => handleSelectCoupon(coupon)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                      >
                        Áp dụng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailableCoupons;