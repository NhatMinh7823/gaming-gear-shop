import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyOrders } from '../services/api';

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const { userInfo } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    const fetchOrders = async () => {
      try {
        const { data } = await getMyOrders();
        setOrders(data.orders);
      } catch (error) {
        toast.error('Error fetching orders');
      }
    };
    fetchOrders();
  }, [userInfo, navigate]);

  if (!userInfo) return null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order._id} className="border p-4 rounded">
              <h2 className="text-lg font-semibold">Order #{order._id}</h2>
              <p>Status: {order.status}</p>
              <p>Total: ${order.totalPrice}</p>
              <button
                onClick={() => navigate(`/order/${order._id}`)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;