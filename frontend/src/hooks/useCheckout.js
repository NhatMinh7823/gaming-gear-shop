import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { createOrder, clearCart, markCouponAsUsed, getUserAddress } from '../services/api';
import { clearCart as clearCartAction } from '../redux/slices/cartSlice';
import { isAddressComplete } from '../utils/shippingCalculator';

export const useCheckout = () => {
  const { cartItems, totalPrice } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('VNPay');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [shippingFee, setShippingFee] = useState(0);
  const [isFreeship, setIsFreeship] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const TAX_PRICE = 10000;

  // Tự động tải địa chỉ mặc định của user khi hook được khởi tạo
  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!userInfo || !userInfo.token) return;

      setIsLoadingAddress(true);
      try {
        const response = await getUserAddress();
        
        if (response.data.success && response.data.address?.isComplete) {
          setShippingAddress(response.data.address);
          console.log('✅ Đã tự động điền địa chỉ mặc định:', response.data.address);
        } else {
          console.log('ℹ️ Chưa có địa chỉ mặc định, cần người dùng nhập');
        }
      } catch (error) {
        console.error('Lỗi khi tải địa chỉ mặc định:', error);
        // Không hiển thị toast error ở đây để tránh làm phiền user
      } finally {
        setIsLoadingAddress(false);
      }
    };

    loadDefaultAddress();
  }, [userInfo]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'shippingAddress') {
      setShippingAddress(value);
    } else {
      setShippingAddress(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleShippingFeeChange = (fee) => {
    setShippingFee(fee);
  };

  const handleFreeshipChange = (isFreeshipActive) => {
    setIsFreeship(isFreeshipActive);
  };

  const validateShippingForm = () => {
    const newErrors = {};

    // Validate new address structure
    if (!isAddressComplete(shippingAddress)) {
      newErrors.shippingAddress = 'Vui lòng điền đầy đủ thông tin địa chỉ giao hàng';
    }

    if (!shippingAddress.street?.trim()) {
      newErrors.shippingAddress = 'Vui lòng nhập địa chỉ chi tiết';
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

    // Validate address before checkout
    if (!validateShippingForm()) {
      toast.error('Vui lòng kiểm tra thông tin địa chỉ giao hàng');
      return;
    }

    setIsCheckingOut(true);
    try {
      // Calculate final shipping fee (0 if freeship coupon applied)
      const finalShippingFee = isFreeship ? 0 : shippingFee;
      const finalTotal = totalPrice + finalShippingFee + TAX_PRICE - discountAmount;

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
        shippingPrice: finalShippingFee,
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
      toast.success('Đặt hàng thành công!');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Lỗi khi đặt hàng. Vui lòng thử lại!');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return {
    shippingAddress,
    shippingFee,
    isFreeship,
    paymentMethod,
    setPaymentMethod,
    isCheckingOut,
    activeStep,
    errors,
    isLoadingAddress,
    handleInputChange,
    handleShippingFeeChange,
    handleFreeshipChange,
    handleNextStep,
    handlePreviousStep,
    handleCheckout
  };
};
