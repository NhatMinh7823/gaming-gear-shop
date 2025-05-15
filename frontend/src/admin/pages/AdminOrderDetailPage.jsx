import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const AdminOrderDetailPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true); // For fetching order
  const [updateLoading, setUpdateLoading] = useState(false); // For updates
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const orderStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setFetchLoading(true);
        const response = await api.get(`/orders/${orderId}`);
        const fetchedOrder = response.data.order;
        setOrder(fetchedOrder);
        setNewStatus(fetchedOrder.status);
        setTrackingNumber(fetchedOrder.trackingNumber || '');
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch order details');
        console.error("Error fetching order details:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
      } finally {
        setFetchLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const handleUpdateOrder = async (e, overrideStatus = null) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const statusToUpdate = overrideStatus || newStatus;
      const payload = { status: statusToUpdate };
      if (statusToUpdate === "Shipped" && trackingNumber) {
        payload.trackingNumber = trackingNumber;
      }

      const response = await api.put(`/orders/${orderId}/status`, payload);
      const updatedOrder = response.data.order;
      setOrder(updatedOrder);
      setNewStatus(updatedOrder.status);
      setTrackingNumber(updatedOrder.trackingNumber || '');
      setSuccessMessage(`Order status updated to ${updatedOrder.status}!`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update order');
      console.error("Error updating order:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (window.confirm("Are you sure you want to mark this order as paid?")) {
      setUpdateLoading(true);
      setError(null);
      setSuccessMessage('');

      try {
        const paymentDetails = {
          id: `admin_paid_${Date.now()}`,
          status: 'COMPLETED',
          update_time: new Date().toISOString(),
          email_address: order.user.email
        };
        const response = await api.put(`/orders/${orderId}/pay`, paymentDetails);
        const updatedOrder = response.data.order;
        setOrder(updatedOrder);
        setSuccessMessage('Order marked as paid!');
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to mark as paid');
        console.error("Error marking as paid:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
      } finally {
        setUpdateLoading(false);
      }
    }
  };

  if (fetchLoading && !order) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading order details...</p></div>;
  }

  if (error && !order) {
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }

  if (!order) {
    return <div className="text-center p-4">Order not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 text-blue-600 hover:underline">
        ← Back to Orders
      </button>
      <h1 className="text-3xl font-semibold text-gray-800 mb-2">Order Details</h1>
      <p className="text-sm text-gray-500 mb-6">Order ID: {order._id}</p>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Info & Items */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-xl">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Order Information</h2>
          <div className="space-y-3 text-sm">
            <p><strong>User:</strong> {order.user?.name} ({order.user?.email})</p>
            <p><strong>Date Placed:</strong> {new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
            <p><strong>Total Amount:</strong> <span className="font-semibold text-lg">${order.totalPrice.toFixed(2)}</span></p>
            <p><strong>Shipping Price:</strong> ${order.shippingPrice.toFixed(2)}</p>
            <p><strong>Tax Price:</strong> ${order.taxPrice.toFixed(2)}</p>

            <div className="mt-4">
              <h3 className="text-md font-semibold text-gray-700 mb-1">Shipping Address:</h3>
              <p>{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
            </div>

            <div className="mt-4">
              <h3 className="text-md font-semibold text-gray-700 mb-1">Payment Status:</h3>
              {order.isPaid ? (
                <span className="text-green-600 font-medium">Paid on {new Date(order.paidAt).toLocaleString()}</span>
              ) : (
                <span className="text-red-600 font-medium">Not Paid</span>
              )}
            </div>
            <div className="mt-1">
              <h3 className="text-md font-semibold text-gray-700 mb-1">Delivery Status:</h3>
              {order.isDelivered ? (
                <span className="text-green-600 font-medium">Delivered on {new Date(order.deliveredAt).toLocaleString()}</span>
              ) : (
                <span className="text-yellow-600 font-medium">Not Delivered</span>
              )}
              {order.trackingNumber && <p className="text-xs text-gray-500">Tracking: {order.trackingNumber}</p>}
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-3">Order Items:</h3>
          <ul className="divide-y divide-gray-200">
            {order.orderItems.map(item => (
              <li key={item.product} className="py-3 flex items-center">
                <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded mr-4"/>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">Qty: {item.quantity} x ${item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm font-semibold text-gray-700">${(item.quantity * item.price).toFixed(2)}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Update Status Section */}
        <div className="bg-white p-6 rounded-lg shadow-xl h-fit">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Update Order</h2>
          <form onSubmit={handleUpdateOrder} className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
              <select
                id="status"
                name="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={updateLoading}
              >
                {orderStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {newStatus === 'Shipped' && (
              <div>
                <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                <input
                  type="text"
                  id="trackingNumber"
                  name="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter tracking number"
                  disabled={updateLoading}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={updateLoading}
              className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {updateLoading ? 'Updating...' : 'Update Status'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {!order.isPaid && (
              <button
                onClick={handleMarkAsPaid}
                disabled={updateLoading}
                className="w-full px-4 py-2 border border-green-500 text-green-600 hover:bg-green-50 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-50"
              >
                {updateLoading ? 'Processing...' : 'Mark as Paid'}
              </button>
            )}
            {!order.isDelivered && newStatus !== "Delivered" && (
              <button
                onClick={(e) => handleUpdateOrder(e, "Delivered")}
                disabled={updateLoading}
                className="w-full px-4 py-2 border border-teal-500 text-teal-600 hover:bg-teal-50 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 disabled:opacity-50"
              >
                {updateLoading ? 'Processing...' : 'Mark as Delivered'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;