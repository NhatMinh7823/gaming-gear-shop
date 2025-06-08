import React from 'react';
import { toast } from 'react-toastify';
import { FaBoxOpen, FaCheck } from 'react-icons/fa';

const CartItems = ({ 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onEmptyCart,
  couponCode,
  setCouponCode,
  onApplyCoupon,
  appliedCoupon,
  onRemoveCoupon
}) => {
  const getStockStatusClass = (stock) => {
    if (stock <= 0) return 'text-red-500';
    if (stock <= 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStockStatusText = (stock) => {
    if (stock <= 0) return 'Hết hàng';
    if (stock <= 5) return `Còn ${stock} sản phẩm`;
    return 'Còn hàng';
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Shopping Cart ({cartItems.length} items)</h2>
        <button
          onClick={onEmptyCart}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Empty Cart
        </button>
      </div>

      <div className="divide-y">
        {cartItems.map((item) => (
          <div key={item._id} className="py-6 flex">
            <img
              src={item.image || 'https://via.placeholder.com/150'}
              alt={item.name}
              className="h-24 w-24 rounded-md object-cover"
            />
            <div className="ml-4 flex-1">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-100">{item.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(item.price)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <FaBoxOpen className={getStockStatusClass(item.product.stock)} />
                    <span className={`text-sm ${getStockStatusClass(item.product.stock)}`}>
                      {getStockStatusText(item.product.stock)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem(item._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center">
                <button
                  onClick={() => onUpdateQuantity(item._id, item.quantity - 1, item.product.stock)}
                  className="text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={item.quantity <= 1}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
                <span className="mx-2 text-gray-100">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item._id, item.quantity + 1, item.product.stock)}
                  className="text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={item.quantity >= item.product.stock}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-gray-200"
          />
          <button
            onClick={onApplyCoupon}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300"
          >
            Apply
          </button>
        </div>

        {appliedCoupon && (
          <div className="mt-4 flex items-center justify-between p-3 bg-green-900 rounded-lg">
            <div className="flex items-center">
              <FaCheck className="text-green-500 mr-2" />
              <span className="text-sm text-green-400">
                Coupon {appliedCoupon.code} applied - {appliedCoupon.type === 'percentage' ? `${appliedCoupon.discount}% off` : `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(appliedCoupon.discount)} off`}
              </span>
            </div>
            <button
              onClick={onRemoveCoupon}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartItems;
