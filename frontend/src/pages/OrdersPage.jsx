import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyOrders } from '../services/api';
import { FaBox, FaShoppingBag, FaClock, FaCheckCircle, FaTruck, FaTimesCircle } from 'react-icons/fa';

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

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <FaClock className="text-yellow-500" />;
      case 'processing':
        return <FaBox className="text-blue-500" />;
      case 'shipped':
        return <FaTruck className="text-purple-500" />;
      case 'delivered':
        return <FaCheckCircle className="text-green-500" />;
      case 'cancelled':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaShoppingBag className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <FaShoppingBag className="text-3xl text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FaBox className="mx-auto text-5xl text-gray-400 mb-4" />
          <p className="text-xl text-gray-600">No orders found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <div 
              key={order._id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div className="flex items-center gap-3 mb-3 md:mb-0">
                    {getStatusIcon(order.status)}
                    <h2 className="text-lg font-semibold text-gray-800">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </h2>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <FaClock className="text-gray-400" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Total:</span>
                    <span className="text-blue-600 font-semibold">{formatPrice(order.totalPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/order/${order._id}`)}
                  className="w-full md:w-auto mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 
                           transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <span>View Details</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
