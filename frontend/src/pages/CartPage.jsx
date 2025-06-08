import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

// Components
import StepIndicator from '../components/Cart/StepIndicator';
import EmptyCartState from '../components/Cart/EmptyCartState';
import OrderSummary from '../components/Cart/OrderSummary';
import CartItems from '../components/Cart/CartItems';
import ShippingForm from '../components/Cart/ShippingForm';
import PaymentMethod from '../components/Cart/PaymentMethod';
import NavigationButtons from '../components/Cart/NavigationButtons';

// Hooks
import { useCart } from '../hooks/useCart';
import { useCheckout } from '../hooks/useCheckout';

function CartPage() {
  const { cartItems } = useSelector((state) => state.cart);
  const [isCartEmpty, setIsCartEmpty] = useState(true);

  // Custom hooks
  const {
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
  } = useCart();

  const {
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
  } = useCheckout();

  useEffect(() => {
    setIsCartEmpty(cartItems.length === 0);
  }, [cartItems]);

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StepIndicator activeStep={activeStep} />

        {isCartEmpty ? (
          <EmptyCartState />
        ) : (
          <div className="w-full">
            {activeStep === 1 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3">
                  <CartItems
                    cartItems={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onEmptyCart={handleEmptyCart}
                    couponCode={couponCode}
                    setCouponCode={setCouponCode}
                    onApplyCoupon={() => handleApplyCoupon(handleFreeshipChange)}
                    appliedCoupon={appliedCoupon}
                    onRemoveCoupon={removeCoupon}
                  />
                  <NavigationButtons
                    activeStep={activeStep}
                    onNextStep={handleNextStep}
                    onPreviousStep={handlePreviousStep}
                    onCheckout={() => handleCheckout(appliedCoupon, discountAmount)}
                    isCheckingOut={isCheckingOut}
                  />
                </div>
                <div className="lg:w-1/3">
                  <OrderSummary
                    cartItems={cartItems}
                    totalPrice={totalPrice}
                    shippingFee={shippingFee}
                    discountAmount={discountAmount}
                    couponCode={appliedCoupon?.code}
                    isFreeship={isFreeship}
                  />
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3 space-y-6">
                  <ShippingForm
                    shippingAddress={shippingAddress}
                    onInputChange={handleInputChange}
                    onShippingFeeChange={handleShippingFeeChange}
                    errors={errors}
                    cartItems={cartItems}
                    isLoadingAddress={isLoadingAddress}
                  />
                  <NavigationButtons
                    activeStep={activeStep}
                    onNextStep={handleNextStep}
                    onPreviousStep={handlePreviousStep}
                    onCheckout={() => handleCheckout(appliedCoupon, discountAmount)}
                    isCheckingOut={isCheckingOut}
                  />
                </div>
                <div className="lg:w-1/3">
                  <OrderSummary
                    cartItems={cartItems}
                    totalPrice={totalPrice}
                    shippingFee={shippingFee}
                    discountAmount={discountAmount}
                    couponCode={appliedCoupon?.code}
                    isFreeship={isFreeship}
                  />
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-2/3 space-y-6">
                  <PaymentMethod
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    shippingAddress={shippingAddress}
                  />
                  <NavigationButtons
                    activeStep={activeStep}
                    onNextStep={handleNextStep}
                    onPreviousStep={handlePreviousStep}
                    onCheckout={() => handleCheckout(appliedCoupon, discountAmount)}
                    isCheckingOut={isCheckingOut}
                  />
                </div>
                <div className="lg:w-1/3">
                  <OrderSummary
                    cartItems={cartItems}
                    totalPrice={totalPrice}
                    shippingFee={shippingFee}
                    discountAmount={discountAmount}
                    couponCode={appliedCoupon?.code}
                    isFreeship={isFreeship}
                  />
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
