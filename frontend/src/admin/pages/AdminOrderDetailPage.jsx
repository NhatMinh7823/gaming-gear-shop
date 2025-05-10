import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Import the configured axios instance

const AdminOrderDetailPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // For updating status
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const orderStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${orderId}`); // Get order by ID
        setOrder(response.order);
        setNewStatus(response.order.status); // Initialize with current status
        setTrackingNumber(response.order.trackingNumber || '');
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch order details');
        console.error("Error fetching order details:", err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const payload = { status: newStatus };
      if (newStatus === "Shipped" && trackingNumber) {
        payload.trackingNumber = trackingNumber;
      }
      // If marking as delivered, backend controller handles setting isDelivered and deliveredAt
      // If marking as paid, backend controller for updateOrderToPaid handles isPaid and paidAt

      const response = await api.put(`/orders/${orderId}/status`, payload); // Admin update order status
      setOrder(response.order); // Update local order state with the response
      setNewStatus(response.order.status);
      setTrackingNumber(response.order.trackingNumber || '');
      setSuccessMessage('Order status updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update order status');
      console.error("Error updating order status:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Placeholder for marking as paid/delivered if separate from status update
  const handleMarkAsDelivered = async () => {
    if (window.confirm("Are you sure you want to mark this order as delivered?")) {
        setLoading(true);
        try {
            // This assumes PUT /orders/:id/status with status "Delivered" handles isDelivered and deliveredAt
            // If not, a dedicated endpoint like /orders/:id/deliver might be needed
            const response = await api.put(`/orders/${orderId}/status`, { status: "Delivered" });
            setOrder(response.order);
            setNewStatus(response.order.status);
            setSuccessMessage('Order marked as delivered!');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to mark as delivered');
        } finally {
            setLoading(false);
        }
    }
  };
  
   const handleMarkAsPaid = async () => {
    if (window.confirm("Are you sure you want to mark this order as paid?")) {
        setLoading(true);
        try {
            // This uses the existing user-facing pay endpoint. 
            // Admin might need a different mechanism or this endpoint needs to allow admin override.
            // For now, assuming admin can use this if they have payment details (e.g. mock payment ID)
            const paymentDetails = { id: `admin_paid_${Date.now()}`, status: 'COMPLETED', update_time: new Date().toISOString(), email_address: order.user.email };
            const response = await api.put(`/orders/${orderId}/pay`, paymentDetails);
            setOrder(response.order);
            setSuccessMessage('Order marked as paid!');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to mark as paid');
        } finally {
            setLoading(false);
        }
    }
  };


  if (loading && !order) {
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
        &larr; Back to Orders
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
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
              <select
                id="status"
                name="status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </form>
          
          <div className="mt-6 space-y-3">
            {!order.isPaid && (
                 <button
                    onClick={handleMarkAsPaid}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-green-500 text-green-600 hover:bg-green-50 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Mark as Paid'}
                </button>
            )}
            {!order.isDelivered && order.status !== "Delivered" && (
                 <button
                    onClick={handleMarkAsDelivered}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-teal-500 text-teal-600 hover:bg-teal-50 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Mark as Delivered'}
                </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;
