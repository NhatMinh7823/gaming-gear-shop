import React from 'react';
import { FaRegCreditCard, FaMoneyBillWave } from 'react-icons/fa';

const PaymentMethod = ({ paymentMethod, onPaymentMethodChange, shippingAddress }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-100 mb-6 pb-4 border-b border-gray-700">
          Payment Method
        </h2>
        <div className="space-y-4">
          <div
            className={`flex items-center p-4 border rounded-lg ${
              paymentMethod === 'VNPay'
                ? 'border-blue-600 bg-gray-700'
                : 'border-gray-600 bg-gray-800'
            } cursor-pointer transition-colors duration-200`}
            onClick={() => onPaymentMethodChange('VNPay')}
          >
            <input
              type="radio"
              id="vnpay"
              name="paymentMethod"
              checked={paymentMethod === 'VNPay'}
              onChange={() => onPaymentMethodChange('VNPay')}
              className="h-5 w-5 text-blue-600"
            />
            <label htmlFor="vnpay" className="ml-3 flex items-center cursor-pointer">
              <FaRegCreditCard className="h-6 w-6 text-blue-500 mr-2" />
              <div>
                <span className="font-medium text-gray-100 block">VNPay</span>
                <span className="text-xs text-gray-400">Pay securely with VNPay</span>
              </div>
              <div className="bg-blue-600 text-white py-1 px-3 rounded-full text-xs ml-auto">
                Recommended
              </div>
            </label>
          </div>

          <div
            className={`flex items-center p-4 border rounded-lg ${
              paymentMethod === 'CashOnDelivery'
                ? 'border-blue-600 bg-gray-700'
                : 'border-gray-600 bg-gray-800'
            } cursor-pointer transition-colors duration-200`}
            onClick={() => onPaymentMethodChange('CashOnDelivery')}
          >
            <input
              type="radio"
              id="cod"
              name="paymentMethod"
              checked={paymentMethod === 'CashOnDelivery'}
              onChange={() => onPaymentMethodChange('CashOnDelivery')}
              className="h-5 w-5 text-blue-600"
            />
            <label htmlFor="cod" className="ml-3 flex items-center cursor-pointer">
              <FaMoneyBillWave className="h-6 w-6 text-green-500 mr-2" />
              <div>
                <span className="font-medium text-gray-100 block">Cash on Delivery</span>
                <span className="text-xs text-gray-400">Pay when you receive</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold text-gray-100 mb-4 pb-3 border-b border-gray-700">
          Review Order
        </h2>
        <div className="mb-6 space-y-4">
          <div>
            <h3 className="font-medium text-gray-100 mb-2 text-sm uppercase tracking-wider">
              Shipping Information
            </h3>
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <div className="space-y-2">
                {shippingAddress.street && (
                  <p className="text-gray-200 font-medium">📍 {shippingAddress.street}</p>
                )}
                <p className="text-gray-300 text-sm">
                  {[
                    shippingAddress.ward?.name,
                    shippingAddress.district?.name,
                    shippingAddress.province?.name
                  ].filter(Boolean).join(', ')}
                </p>
                {!shippingAddress.street && (
                  <p className="text-gray-400 italic">Chưa có thông tin địa chỉ giao hàng</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;
