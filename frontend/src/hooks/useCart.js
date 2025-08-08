import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { CART, COUPON, formatToastMessage } from '../utils/toastMessages';
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
          toast.error(CART.FETCH_ERROR);
        }
      };
      fetchCart();
    }
  }, [dispatch, userInfo]);

  const handleUpdateQuantity = async (itemId, quantity, stock) => {
    if (quantity < 1) return;
    if (quantity > stock) {
      toast.error(formatToastMessage(CART.INSUFFICIENT_STOCK, { stock }));
      return;
    }

    try {
      const { data } = await updateCartItem(itemId, { quantity });
      dispatch(setCart(data.cart));
      toast.success(CART.UPDATE_SUCCESS);
    } catch (error) {
      toast.error(CART.UPDATE_ERROR);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const { data } = await removeCartItem(itemId);
      dispatch(setCart(data.cart));
      toast.success(CART.REMOVE_SUCCESS);
    } catch (error) {
      toast.error(CART.REMOVE_ERROR);
    }
  };

  const handleEmptyCart = async () => {
    if (window.confirm('Are you sure you want to empty your cart?')) {
      try {
        await clearCart();
        dispatch(clearCartAction());
        toast.success(CART.EMPTY_SUCCESS);
      } catch (error) {
        toast.error(CART.EMPTY_ERROR);
      }
    }
  };

  const handleApplyCoupon = async (onFreeshipChange, codeOverride) => {
    const codeToApply = codeOverride || couponCode;
    
    if (!codeToApply.trim()) {
      toast.error(COUPON.CODE_REQUIRED);
      return;
    }

    try {
      const upperCode = codeToApply.toUpperCase();
      
      // Handle freeship coupon via API to check minOrder
      if (upperCode === 'FREESHIP') {
        try {
          const { data } = await applyCoupon({
            couponCode: upperCode,
            totalPrice
          });
          
          if (data.success && data.couponData) {
            setCouponCode(upperCode);
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
            
            toast.success(COUPON.FREE_SHIPPING_APPLIED);
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Lỗi khi áp dụng mã giảm giá';
          toast.error(errorMessage);
        }
        return;
      }

      // Handle other coupons via API
      const { data } = await applyCoupon({
        couponCode: upperCode,
        totalPrice
      });

      if (data.success && data.couponData) {
        setCouponCode(upperCode); // Update couponCode state
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
        
        toast.success(formatToastMessage(COUPON.APPLIED_SUCCESS, { code: data.couponData.code }));
      }
    } catch (error) {
      // Hiển thị thông báo lỗi từ server hoặc thông báo mặc định
      const errorMessage = error.response?.data?.message || 'Lỗi khi áp dụng mã giảm giá';
      toast.error(errorMessage);
    }
  };

  const removeCoupon = () => {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    toast.info(COUPON.REMOVED);
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
