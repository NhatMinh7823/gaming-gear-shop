import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api'; // Import the configured axios instance

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/orders'); // Admin get all orders
        // response is NOT already response.data with the current api.js interceptor.
        // The actual data is in response.data.orders
        setOrders(response.data.orders || []); // Corrected to access response.data.orders
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch orders');
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Placeholder for delete order functionality if needed in the future
  // const handleDeleteOrder = async (orderId) => { ... }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Processing': return 'bg-yellow-100 text-yellow-800';
      case 'Shipped': return 'bg-blue-100 text-blue-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading && orders.length === 0) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading orders...</p></div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Manage Orders</h1>

      {orders && orders.length === 0 && !loading && (
        <p className="text-center text-gray-500">No orders found.</p>
      )}

      {orders && orders.length > 0 && (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline">
                     <Link to={`/admin/orders/${order._id}`}>{order._id}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {order.user?.name || 'N/A'} ({order.user?._id || order.user})
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    ${order.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.isPaid ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Paid ({new Date(order.paidAt).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Not Paid
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                     {order.isDelivered ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Delivered ({new Date(order.deliveredAt).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Not Delivered
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      to={`/admin/orders/${order._id}`} // Route for viewing/editing order details
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Details
                    </Link>
                    {/* Delete order functionality can be added here if needed */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
