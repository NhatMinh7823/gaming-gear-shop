import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCart, updateCartItem, removeCartItem, clearCart, createOrder } from '../services/api';
import { setCart, clearCart as clearCartAction } from '../redux/slices/cartSlice';
import { FaShoppingCart, FaTruck, FaCreditCard, FaRegCreditCard, FaArrowLeft, FaArrowRight, FaMoneyBillWave, FaCheck } from 'react-icons/fa';

function CartPage() {
  const { cartItems, totalPrice } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Vietnam'
  });
  const [paymentMethod, setPaymentMethod] = useState('VNPay');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [isCartEmpty, setIsCartEmpty] = useState(true);
  const [errors, setErrors] = useState({});
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    setIsCartEmpty(cartItems.length === 0);
  }, [cartItems]);

  useEffect(() => {
    if (userInfo) {
      const fetchCart = async () => {
        try {
          const { data } = await getCart();
          dispatch(setCart(data.cart));
        } catch (error) {
          toast.error('Error fetching cart');
        }
      };
      fetchCart();
    }
  }, [dispatch, userInfo]);

  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity < 1) return;
    try {
      const { data } = await updateCartItem(itemId, { quantity });
      dispatch(setCart(data.cart));
      toast.success('Cart updated');
    } catch (error) {
      toast.error('Error updating cart');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const { data } = await removeCartItem(itemId);
      dispatch(setCart(data.cart));
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Error removing item');
    }
  };

  const handleEmptyCart = async () => {
    if (window.confirm('Are you sure you want to empty your cart?')) {
      try {
        await clearCart();
        dispatch(clearCartAction());
        toast.success('Cart emptied successfully');
      } catch (error) {
        toast.error('Error emptying cart');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateShippingForm = () => {
    const newErrors = {};
    const required = ['street', 'city', 'state', 'postalCode'];
    
    required.forEach(field => {
      if (!shippingAddress[field].trim()) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });
    
    if (shippingAddress.postalCode && !/^\d{5,6}$/.test(shippingAddress.postalCode)) {
      newErrors.postalCode = 'Postal code must be 5-6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (activeStep === 1) {
      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeStep === 2) {
      if (!validateShippingForm()) {
        toast.error('Please check shipping details and try again');
        return;
      }
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousStep = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    
    const validCoupons = {
      'WELCOME10': { code: 'WELCOME10', discount: 10, type: 'percentage' },
      'SAVE20': { code: 'SAVE20', discount: 20, type: 'percentage' },
      'FREESHIP': { code: 'FREESHIP', discount: 5, type: 'fixed' }
    };
    
    const coupon = validCoupons[couponCode.toUpperCase()];
    
    if (coupon) {
      const discount = coupon.type === 'percentage' 
        ? (totalPrice * coupon.discount) / 100 
        : coupon.discount;
      
      setDiscountAmount(discount);
      setAppliedCoupon(coupon);
      toast.success(`Coupon ${couponCode.toUpperCase()} applied successfully!`);
    } else {
      toast.error('Invalid coupon code');
    }
  };

  const removeCoupon = () => {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  const handleCheckout = async () => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    setIsCheckingOut(true);
    try {
      const orderData = {
        orderItems: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: item.price,
          product: item.product,
        })),
        shippingAddress,
        paymentMethod,
        taxPrice: 10,
        shippingPrice: 5,
        totalPrice: finalTotal,
        couponApplied: appliedCoupon?.code,
        discountAmount
      };

      const { data } = await createOrder(orderData);
      await clearCart();
      dispatch(clearCartAction());
      navigate(`/order/${data.order._id}`);
      toast.success('Order placed successfully');
    } catch (error) {
      toast.error('Error placing order');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const finalTotal = totalPrice + 15 - discountAmount;

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-10">
      <div className="w-full max-w-3xl flex justify-between">
        <div className="flex flex-col items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${activeStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'} mb-2 transition-all duration-300`}>
            <FaShoppingCart className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${activeStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>Cart</span>
        </div>
        
        <div className={`w-full h-1 max-w-[80px] self-center ${activeStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'} transition-all duration-300`} />
        
        <div className="flex flex-col items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${activeStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'} mb-2 transition-all duration-300`}>
            <FaTruck className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${activeStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>Shipping</span>
        </div>
        
        <div className={`w-full h-1 max-w-[80px] self-center ${activeStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'} transition-all duration-300`} />
        
        <div className="flex flex-col items-center">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full ${activeStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'} mb-2 transition-all duration-300`}>
            <FaCreditCard className="w-5 h-5" />
          </div>
          <span className={`text-xs font-medium ${activeStep >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>Payment</span>
        </div>
      </div>
    </div>
  );

  const EmptyCartState = () => (
    <div className="text-center py-16 bg-white rounded-xl shadow-md">
      <svg className="h-24 w-24 text-blue-100 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">Looks like you haven't added any products to your cart yet. Find amazing gaming gear in our store!</p>
      <Link
        to="/products"
        className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium shadow-md hover:bg-blue-700 transition duration-300 inline-block"
      >
        Browse Products
      </Link>
    </div>
  );

  const OrderSummary = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm sticky top-24">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Order Summary</h2>
      <div className="space-y-4">
        {cartItems.map((item) => (
          <div key={item._id} className="flex items-center py-2">
            <img
              src={item.image || 'https://via.placeholder.com/100'}
              alt={item.name}
              className="h-12 w-12 rounded-md object-cover mr-3"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-800 font-medium">{item.name}</p>
              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
            </div>
            <span className="text-sm text-gray-800 font-medium">
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(totalPrice)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Shipping</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(5)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tax</span>
            <span>
              {new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND'
              }).format(10)}
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
            <div className="flex justify-between font-semibold text-gray-800">
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StepIndicator />
        
        {isCartEmpty ? (
          <EmptyCartState />
        ) : (
          <div className="w-full">
            {activeStep === 1 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3">
                  <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-gray-800">Shopping Cart ({cartItems.length} items)</h2>
                      <button
                        onClick={handleEmptyCart}
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
                                <h3 className="text-sm font-medium text-gray-800">{item.name}</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND'
                                  }).format(item.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveItem(item._id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="mt-4 flex items-center">
                              <button
                                onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                </svg>
                              </button>
                              <span className="mx-2 text-gray-800">{item.quantity}</span>
                              <button
                                onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                                className="text-gray-500 hover:text-gray-700 p-1"
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
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={handleApplyCoupon}
                          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition duration-300"
                        >
                          Apply
                        </button>
                      </div>
                      
                      {appliedCoupon && (
                        <div className="mt-4 flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center">
                            <FaCheck className="text-green-500 mr-2" />
                            <span className="text-sm text-green-800">
                              Coupon {appliedCoupon.code} applied - {appliedCoupon.type === 'percentage' ? `${appliedCoupon.discount}% off` : `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(appliedCoupon.discount)} off`}
                            </span>
                          </div>
                          <button
                            onClick={removeCoupon}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Link
                      to="/products"
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition duration-300 flex items-center justify-center"
                    >
                      <FaArrowLeft className="mr-2" />
                      Continue Shopping
                    </Link>
                    <button
                      onClick={handleNextStep}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 flex items-center justify-center"
                    >
                      Continue to Shipping
                      <FaArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
                <div className="lg:w-1/3">
                  <OrderSummary />
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3 space-y-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                      Shipping Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          id="street"
                          name="street"
                          value={shippingAddress.street}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            errors.street ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="123 Main St"
                        />
                        {errors.street && <p className="mt-1 text-sm text-red-500">{errors.street}</p>}
                      </div>
                      
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={shippingAddress.city}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            errors.city ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Your City"
                        />
                        {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city}</p>}
                      </div>
                      
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                          State/Province
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={shippingAddress.state}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            errors.state ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Your State"
                        />
                        {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
                      </div>
                      
                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          value={shippingAddress.postalCode}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            errors.postalCode ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="12345"
                        />
                        {errors.postalCode && <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>}
                      </div>
                      
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          id="country"
                          name="country"
                          value={shippingAddress.country}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handlePreviousStep}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition duration-300 flex items-center justify-center"
                    >
                      <FaArrowLeft className="mr-2" />
                      Back to Cart
                    </button>
                    <button
                      onClick={handleNextStep}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 flex items-center justify-center"
                    >
                      Continue to Payment
                      <FaArrowRight className="ml-2" />
                    </button>
                  </div>
                </div>
                <div className="lg:w-1/3">
                  <OrderSummary />
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3 space-y-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                      Payment Method
                    </h2>
                    <div className="space-y-4">
                      <div 
                        className={`flex items-center p-4 border rounded-lg ${
                          paymentMethod === 'VNPay' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                        } cursor-pointer transition-colors duration-200`}
                        onClick={() => setPaymentMethod('VNPay')}
                      >
                        <input
                          type="radio"
                          id="vnpay"
                          name="paymentMethod"
                          checked={paymentMethod === 'VNPay'}
                          onChange={() => setPaymentMethod('VNPay')}
                          className="h-5 w-5 text-blue-600"
                        />
                        <label htmlFor="vnpay" className="ml-3 flex items-center cursor-pointer">
                          <FaRegCreditCard className="h-6 w-6 text-blue-500 mr-2" />
                          <div>
                            <span className="font-medium text-gray-800 block">VNPay</span>
                            <span className="text-xs text-gray-500">Pay securely with VNPay</span>
                          </div>
                          <div className="bg-blue-500 text-white py-1 px-3 rounded-full text-xs ml-auto">Recommended</div>
                        </label>
                      </div>

                      <div 
                        className={`flex items-center p-4 border rounded-lg ${
                          paymentMethod === 'CashOnDelivery' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                        } cursor-pointer transition-colors duration-200`}
                        onClick={() => setPaymentMethod('CashOnDelivery')}
                      >
                        <input
                          type="radio"
                          id="cod"
                          name="paymentMethod"
                          checked={paymentMethod === 'CashOnDelivery'}
                          onChange={() => setPaymentMethod('CashOnDelivery')}
                          className="h-5 w-5 text-blue-600"
                        />
                        <label htmlFor="cod" className="ml-3 flex items-center cursor-pointer">
                          <FaMoneyBillWave className="h-6 w-6 text-green-500 mr-2" />
                          <div>
                            <span className="font-medium text-gray-800 block">Cash on Delivery</span>
                            <span className="text-xs text-gray-500">Pay when you receive</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Review Order</h2>
                    <div className="mb-6 space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-800 mb-2 text-sm uppercase tracking-wider">Shipping Information</h3>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-700">
                            {shippingAddress.street}, {shippingAddress.city}, {shippingAddress.state}, {shippingAddress.postalCode}, {shippingAddress.country}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handlePreviousStep}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition duration-300 flex items-center justify-center"
                    >
                      <FaArrowLeft className="mr-2" />
                      Back to Shipping
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingOut ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          Place Order
                          <FaArrowRight className="ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="lg:w-1/3">
                  <OrderSummary />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CartPage;
