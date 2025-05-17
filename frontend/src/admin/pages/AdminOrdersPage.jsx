import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState('all');

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

  const statusColors = {
    Processing: 'bg-yellow-200 text-yellow-800 border border-yellow-300',
    Shipped: 'bg-blue-200 text-blue-800 border border-blue-300',
    Delivered: 'bg-green-200 text-green-800 border border-green-300',
    Cancelled: 'bg-red-200 text-red-800 border border-red-300',
  };

  const sortData = (data, config) => {
    if (!config.key) return data;
    
    return [...data].sort((a, b) => {
      if (a[config.key] < b[config.key]) {
        return config.direction === 'asc' ? -1 : 1;
      }
      if (a[config.key] > b[config.key]) {
        return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = (
        order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, filterStatus]);

  const sortedOrders = useMemo(() => {
    return sortData(filteredOrders, sortConfig);
  }, [filteredOrders, sortConfig]);

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };


  if (loading && orders.length === 0) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading orders...</p></div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Manage Orders</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search orders..."
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {orders && orders.length === 0 && !loading && (
        <p className="text-center text-gray-500">No orders found.</p>
      )}

      {sortedOrders.length > 0 && (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    onClick={() => requestSort('_id')}
                  >
                    Order ID {getSortIndicator('_id')}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    onClick={() => requestSort('user.name')}
                  >
                    User {getSortIndicator('user.name')}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    onClick={() => requestSort('createdAt')}
                  >
                    Date {getSortIndicator('createdAt')}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    onClick={() => requestSort('totalPrice')}
                  >
                    Total {getSortIndicator('totalPrice')}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Payment
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Delivery
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200"
                    onClick={() => requestSort('status')}
                  >
                    Status {getSortIndicator('status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
            </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link 
                        to={`/admin/orders/${order._id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        #{order._id.slice(-6).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.user?.name || 'N/A'}</span>
                        <span className="text-xs text-gray-500">ID: {order.user?._id.slice(-6).toUpperCase() || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${order.totalPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.isPaid ? (
                        <div className="flex flex-col">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
                            Paid
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(order.paidAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.isDelivered ? (
                        <div className="flex flex-col">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
                            Delivered
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {new Date(order.deliveredAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/admin/orders/${order._id}`}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {sortedOrders.length} of {orders.length} orders
            </p>
          </div>
        </div>
      )}
      
      {sortedOrders.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg">
            {searchTerm || filterStatus !== 'all' 
              ? 'No orders match your search criteria.' 
              : 'No orders found.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
