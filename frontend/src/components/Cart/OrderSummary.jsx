import React from 'react';

const OrderSummary = ({ 
  cartItems, 
  totalPrice, 
  shippingFee = 0,
  discountAmount = 0,
  couponCode = null,
  isFreeship = false 
}) => {
  const TAX_PRICE = 10000;
  const finalShippingFee = isFreeship ? 0 : shippingFee;
  const finalTotal = totalPrice + finalShippingFee + TAX_PRICE - discountAmount;

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-sm sticky top-24">
      <h2 className="text-xl font-semibold text-gray-100 mb-4 pb-3 border-b border-gray-700">
        Tóm tắt đơn hàng
      </h2>
      
      <div className="space-y-4">
        {/* Cart Items */}
        {cartItems.map((item) => (
          <div key={item._id} className="flex items-center py-2">
            <img
              src={item.image || 'https://via.placeholder.com/100'}
              alt={item.name}
              className="h-12 w-12 rounded-md object-cover mr-3"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-100 font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">Số lượng: {item.quantity}</p>
            </div>
            <span className="text-sm text-gray-100 font-medium">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(item.price * item.quantity)}
            </span>
          </div>
        ))}

        {/* Summary */}
        <div className="border-t pt-4 space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tạm tính</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(totalPrice)}
            </span>
          </div>

          {/* Shipping */}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Phí vận chuyển</span>
            <div className="text-right">
              {isFreeship && shippingFee > 0 ? (
                <>
                  <span className="line-through text-gray-500">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(shippingFee)}
                  </span>
                  <div className="text-green-500 font-medium">MIỄN PHÍ</div>
                </>
              ) : (
                <span>
                  {shippingFee > 0 ? (
                    new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(shippingFee)
                  ) : (
                    'Đang tính...'
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Tax */}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Thuế</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(TAX_PRICE)}
            </span>
          </div>

          {/* Discount */}
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Giảm giá {couponCode && `(${couponCode})`}</span>
              <span>
                -{new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(discountAmount)}
              </span>
            </div>
          )}

          {/* Freeship Badge */}
          {isFreeship && shippingFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-500">🚚 Miễn phí vận chuyển</span>
              <span className="text-green-500 font-medium">
                -{new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(shippingFee)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="pt-2 border-t">
            <div className="flex justify-between font-semibold text-lg text-gray-100">
              <span>Tổng cộng</span>
              <span>
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(finalTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;
