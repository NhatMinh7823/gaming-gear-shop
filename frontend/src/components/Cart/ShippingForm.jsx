import React from 'react';

const ShippingForm = ({ shippingAddress, onInputChange, errors }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold text-gray-100 mb-6 pb-4 border-b border-gray-700">
        Shipping Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="street" className="block text-sm font-medium text-gray-200 mb-2">
            Street Address
          </label>
          <input
            type="text"
            id="street"
            name="street"
            value={shippingAddress.street}
            onChange={onInputChange}
            className={`w-full px-4 py-2 border rounded-lg bg-gray-700 text-gray-200 ${
              errors.street ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123 Main St"
          />
          {errors.street && <p className="mt-1 text-sm text-red-300">{errors.street}</p>}
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-200 mb-2">
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={shippingAddress.city}
            onChange={onInputChange}
            className={`w-full px-4 py-2 border rounded-lg bg-gray-700 text-gray-200 ${
              errors.city ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your City"
          />
          {errors.city && <p className="mt-1 text-sm text-red-300">{errors.city}</p>}
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-200 mb-2">
            State/Province
          </label>
          <input
            type="text"
            id="state"
            name="state"
            value={shippingAddress.state}
            onChange={onInputChange}
            className={`w-full px-4 py-2 border rounded-lg bg-gray-700 text-gray-200 ${
              errors.state ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your State"
          />
          {errors.state && <p className="mt-1 text-sm text-red-300">{errors.state}</p>}
        </div>

        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-200 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={shippingAddress.postalCode}
            onChange={onInputChange}
            className={`w-full px-4 py-2 border rounded-lg bg-gray-700 text-gray-200 ${
              errors.postalCode ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="12345"
          />
          {errors.postalCode && <p className="mt-1 text-sm text-red-300">{errors.postalCode}</p>}
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-200 mb-2">
            Country
          </label>
          <input
            type="text"
            id="country"
            name="country"
            value={shippingAddress.country}
            onChange={onInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-500 text-gray-200"
            disabled
          />
        </div>
      </div>
    </div>
  );
};

export default ShippingForm;
