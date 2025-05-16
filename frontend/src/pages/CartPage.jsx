import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCart, updateCartItem, removeCartItem, clearCart, createOrder } from '../services/api';
import { setCart, clearCart as clearCartAction } from '../redux/slices/cartSlice';

function CartPage() {
  const { cartItems, totalPrice } = useSelector((state) => state.cart);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Add state for shipping form and payment method
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Vietnam'
  });
  const [paymentMethod, setPaymentMethod] = useState('VNPay');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
      toast.success('Item removed');
    } catch (error) {
      toast.error('Error removing item');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const required = ['street', 'city', 'state', 'postalCode'];
    return required.every(field => shippingAddress[field].trim());
  };

  const handleCheckout = async () => {
    if (!userInfo) {
      navigate('/login');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fill in all shipping details');
      return;
    }

    setIsCheckingOut(true);
    try {
      const orderData = {
        orderItems: cartItems.map((item) => ({
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
        totalPrice: totalPrice + 15,
      };
      const { data } = await createOrder(orderData);
      await clearCart();
      dispatch(clearCartAction());
      navigate(`/order/${data.order._id}`);
      toast.success('Order placed');
    } catch (error) {
      toast.error('Error placing order');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!userInfo) return <div>Please log in to view your cart.</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Cart</h1>
      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cart Items */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Items</h2>
            {cartItems.map((item) => (
              <div key={item._id} className="flex items-center border-b py-4">
                <img
                  src={item.image || 'https://via.placeholder.com/100'}
                  alt={item.name}
                  className="w-24 h-24 object-cover"
                />
                <div className="flex-1 ml-4">
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <p>${item.price}</p>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateQuantity(item._id, Number(e.target.value))}
                    className="border p-1 w-16"
                  />
                </div>
                <button
                  onClick={() => handleRemoveItem(item._id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Checkout Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Checkout</h2>
            
            {/* Shipping Address Form */}
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold">Shipping Address</h3>
              <input
                type="text"
                name="street"
                placeholder="Street Address"
                value={shippingAddress.street}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={shippingAddress.city}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                name="state"
                placeholder="State/Province"
                value={shippingAddress.state}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                name="postalCode"
                placeholder="Postal Code"
                value={shippingAddress.postalCode}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Payment Method</h3>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="VNPay">VNPay</option>
                <option value="CashOnDelivery">Cash on Delivery</option>
              </select>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal:</span>
                <span>${totalPrice}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Shipping:</span>
                <span>$5</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Tax:</span>
                <span>$10</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${totalPrice + 15}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isCheckingOut ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;
