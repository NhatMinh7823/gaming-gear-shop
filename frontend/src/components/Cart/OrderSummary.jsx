import React from 'react';

const OrderSummary = ({ cartItems, totalPrice, discountAmount }) => {
  const SHIPPING_PRICE = 15000;
  const TAX_PRICE = 10000;
  const finalTotal = totalPrice + SHIPPING_PRICE + TAX_PRICE - discountAmount;

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-sm sticky top-24">
      <h2 className="text-xl font-semibold text-gray-100 mb-4 pb-3 border-b border-gray-700">Order Summary</h2>
      <div className="space-y-4">
        {cartItems.map((item) => (
          <div key={item._id} className="flex items-center py-2">
            <img
              src={item.image || 'https://via.placeholder.com/100'}
              alt={item.name}
              className="h-12 w-12 rounded-md object-cover mr-3"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-100 font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
            </div>
            <span className="text-sm text-gray-100 font-medium">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(totalPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Shipping</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(SHIPPING_PRICE)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Tax</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(TAX_PRICE)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>
                -{new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(discountAmount)}
              </span>
            </div>
          )}
          <div className="pt-2 border-t">
            <div className="flex justify-between font-semibold text-gray-100">
              <span>Total</span>
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
