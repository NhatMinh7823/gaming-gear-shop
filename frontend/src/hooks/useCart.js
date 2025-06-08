import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getCart, updateCartItem, removeCartItem, clearCart, applyCoupon, markCouponAsUsed } from '../services/api';
import { setCart, clearCart as clearCartAction } from '../redux/slices/cartSlice';

export const useCart = () => {
  const { cartItems, totalPrice } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

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

  const handleUpdateQuantity = async (itemId, quantity, stock) => {
    if (quantity < 1) return;
    if (quantity > stock) {
      toast.error(`Only ${stock} items available in stock`);
      return;
    }

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

  const handleApplyCoupon = async (onFreeshipChange) => {
    if (!couponCode.trim()) {
      toast.error('Vui lòng nhập mã giảm giá');
      return;
    }

    try {
      const upperCode = couponCode.toUpperCase();
      
      // Handle freeship coupon on frontend
      if (upperCode === 'FREESHIP') {
        setAppliedCoupon({
          code: 'FREESHIP',
          discount: 0,
          type: 'freeship'
        });
        setDiscountAmount(0);
        
        // Notify parent component about freeship status
        if (onFreeshipChange) {
          onFreeshipChange(true);
        }
        
        toast.success('🚚 Mã miễn phí vận chuyển đã được áp dụng!');
        return;
      }

      // Handle other coupons via API
      const { data } = await applyCoupon({
        couponCode: upperCode,
        totalPrice
      });

      if (data.success && data.couponData) {
        setDiscountAmount(data.couponData.discountAmount);
        setAppliedCoupon({
          code: data.couponData.code,
          discount: data.couponData.discountPercent || data.couponData.discountAmount,
          type: data.couponData.type
        });
        
        // Reset freeship if a different coupon is applied
        if (onFreeshipChange) {
          onFreeshipChange(false);
        }
        
        toast.success(`Mã giảm giá ${data.couponData.code} đã được áp dụng!`);
      }
    } catch (error) {
      // Chỉ xử lý error, không có client-side fallback
      if (error.response?.status === 400) {
        toast.error('Mã giảm giá đã được sử dụng');
      } else if (error.response?.status === 404) {
        toast.error('Mã giảm giá không hợp lệ');
      } else {
        toast.error('Lỗi khi áp dụng mã giảm giá');
      }
    }
  };

  const removeCoupon = () => {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info('Coupon removed');
  };

  return {
    cartItems,
    totalPrice,
    couponCode,
    setCouponCode,
    discountAmount,
    appliedCoupon,
    handleUpdateQuantity,
    handleRemoveItem,
    handleEmptyCart,
    handleApplyCoupon,
    removeCoupon
  };
};
