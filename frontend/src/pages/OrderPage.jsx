import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { getOrderById, createVNPayUrl, checkVNPayPayment } from '../services/api';

function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const { userInfo } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await getOrderById(id);
        setOrder(data.order);
      } catch (error) {
        toast.error('Error fetching order');
      }
    };
    fetchOrder();
  }, [id]);

  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check VNPay payment result from URL params
    if (location.search) {
      const checkPayment = async () => {
        try {
          const { data } = await checkVNPayPayment(location.search);
          if (data.success) {
            toast.success('Payment successful!');
            // Remove query params from URL
            navigate(location.pathname, { replace: true });
          } else {
            toast.error(data.message || 'Payment failed');
          }
        } catch (error) {
          toast.error('Error checking payment status');
        }
      };
      checkPayment();
    }
  }, [location, navigate]);

  const handleVNPayPayment = async () => {
    try {
      const { data } = await createVNPayUrl(id);
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      toast.error('Error creating payment URL');
    }
  };

  if (!userInfo || !order) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Order #{order._id}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold">Items</h2>
          {order.orderItems.map((item) => (
            <div key={item._id} className="flex items-center border-b py-4">
              <img
                src={item.image || 'https://via.placeholder.com/100'}
                alt={item.name}
                className="w-24 h-24 object-cover"
              />
              <div className="ml-4">
                <h3 className="font-semibold">{item.name}</h3>
                <p>Quantity: {item.quantity}</p>
                <p>Price: ${item.price}</p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-xl font-semibold">Order Details</h2>
          <p>Status: {order.status}</p>
          <p>Paid: {order.isPaid ? `Yes, on ${new Date(order.paidAt).toLocaleDateString()}` : 'No'}</p>
          <p>Delivered: {order.isDelivered ? `Yes, on ${new Date(order.deliveredAt).toLocaleDateString()}` : 'No'}</p>
          <p>Total: ${order.totalPrice}</p>
          
          {/* VNPay Payment Button */}
          {!order.isPaid && order.paymentMethod === 'VNPay' && (
            <button
              onClick={handleVNPayPayment}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Pay with VNPay
            </button>
          )}
          <h3 className="mt-4 font-semibold">Shipping Address</h3>
          <p>{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
        </div>
      </div>
    </div>
  );
}

export default OrderPage;
