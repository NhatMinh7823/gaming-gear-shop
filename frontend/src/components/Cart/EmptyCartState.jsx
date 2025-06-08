import React from 'react';
import { Link } from 'react-router-dom';

const EmptyCartState = () => {
  return (
    <div className="text-center py-16 bg-gray-800 rounded-xl shadow-md">
      <svg className="h-24 w-24 text-blue-100 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h2 className="text-2xl font-bold text-gray-100 mb-4">Your Cart is Empty</h2>
      <p className="text-gray-400 mb-8 max-w-md mx-auto">
        Looks like you haven't added any products to your cart yet. Find amazing gaming gear in our store!
      </p>
      <Link
        to="/products"
        className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium shadow-md hover:bg-blue-700 transition duration-300 inline-block"
      >
        Browse Products
      </Link>
    </div>
  );
};

export default EmptyCartState;
