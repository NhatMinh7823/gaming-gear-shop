import { useEffect } from 'react';
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

  const handleCheckout = async () => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    try {
      const orderData = {
        orderItems: cartItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          image: item.image,
          price: item.price,
          product: item.product,
        })),
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
        paymentMethod: 'PayPal', // Placeholder
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
    }
  };

  if (!userInfo) return <div>Please log in to view your cart.</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Cart</h1>
      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-4">
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
          <div className="mt-6">
            <p className="text-xl font-semibold">Total: ${totalPrice}</p>
            <button
              onClick={handleCheckout}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CartPage;