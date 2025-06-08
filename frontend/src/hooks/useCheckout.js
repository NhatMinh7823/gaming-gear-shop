import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { createOrder, clearCart, markCouponAsUsed } from '../services/api';
import { clearCart as clearCartAction } from '../redux/slices/cartSlice';

export const useCheckout = () => {
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
  const [errors, setErrors] = useState({});

  const SHIPPING_PRICE = 15000;
  const TAX_PRICE = 10000;

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

  const handleCheckout = async (appliedCoupon, discountAmount) => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    setIsCheckingOut(true);
    try {
      const finalTotal = totalPrice + SHIPPING_PRICE + TAX_PRICE - discountAmount;

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
        taxPrice: TAX_PRICE,
        shippingPrice: SHIPPING_PRICE,
        totalPrice: finalTotal,
        couponCode: appliedCoupon?.code,
        discountAmount
      };

      const { data } = await createOrder(orderData);

      // Mark coupon as used if it's not a fixed coupon
      if (appliedCoupon && appliedCoupon.code && !appliedCoupon.code.match(/^(WELCOME10|SAVE20|FREESHIP)$/)) {
        await markCouponAsUsed(appliedCoupon.code, data.order._id);
      }

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

  return {
    shippingAddress,
    paymentMethod,
    setPaymentMethod,
    isCheckingOut,
    activeStep,
    errors,
    handleInputChange,
    handleNextStep,
    handlePreviousStep,
    handleCheckout
  };
};
