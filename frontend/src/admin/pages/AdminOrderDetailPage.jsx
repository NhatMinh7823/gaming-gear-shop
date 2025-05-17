import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import api from '../../services/api';

const AdminOrderDetailPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true); // For fetching order
  const [updateLoading, setUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !order) {
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }

  if (!order) {
    return <div className="text-center p-4">Order not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Orders
      </button>
      <h1 className="text-3xl font-semibold text-gray-800 mb-2">Order Details</h1>
      <p className="text-sm text-gray-500 mb-6">Order ID: {order._id}</p>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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

            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Payment Status</h3>
                {order.isPaid ? (
                  <div className="flex items-center">
                    <span className="flex items-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Paid
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {new Date(order.paidAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Not Paid
                  </span>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Delivery Status</h3>
                {order.isDelivered ? (
                  <div className="flex items-center">
                    <span className="flex items-center px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Delivered
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {new Date(order.deliveredAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Pending Delivery
                  </span>
                )}
                {order.trackingNumber && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tracking: {order.trackingNumber}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Order Items</h3>
            <ul className="divide-y divide-gray-200 bg-gray-50 rounded-lg overflow-hidden">
              {order.orderItems.map(item => (
                <li key={item.product} className="p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <img src={item.image} alt={item.name} className="h-20 w-20 object-cover rounded-lg border border-gray-200"/>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="bg-gray-200 px-2 py-0.5 rounded">
                          {item.quantity} × ${item.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${(item.quantity * item.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Update Status Section */}
        <div className="bg-white p-6 rounded-lg shadow-xl h-fit">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Update Order</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            setPendingAction({ type: 'updateStatus' });
            setIsConfirmOpen(true);
          }} className="space-y-4">
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

          <div className="mt-6 grid gap-3">
            {!order.isPaid && (
              <button
                type="button"
                onClick={() => {
                  setPendingAction({ type: 'markPaid' });
                  setIsConfirmOpen(true);
                }}
                disabled={updateLoading}
                className="w-full px-4 py-2 border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-50 transition-colors"
              >
                {updateLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Mark as Paid'
                )}
              </button>
            )}
            {!order.isDelivered && newStatus !== "Delivered" && (
              <button
                type="button"
                onClick={() => {
                  setPendingAction({ type: 'markDelivered' });
                  setIsConfirmOpen(true);
                }}
                disabled={updateLoading}
                className="w-full px-4 py-2 border-2 border-teal-500 text-teal-600 hover:bg-teal-50 rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 disabled:opacity-50 transition-colors"
              >
                {updateLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Mark as Delivered'
                )}
              </button>
            )}
          </div>

          {/* Confirmation Modal */}
          <Transition appear show={isConfirmOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={() => setIsConfirmOpen(false)}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black bg-opacity-25" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                      <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                        Confirm Action
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {pendingAction?.type === 'markPaid' 
                            ? 'Are you sure you want to mark this order as paid?' 
                            : pendingAction?.type === 'markDelivered'
                            ? 'Are you sure you want to mark this order as delivered?'
                            : 'Are you sure you want to update the order status?'}
                        </p>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          onClick={() => {
                            setIsConfirmOpen(false);
                            if (pendingAction?.type === 'markPaid') {
                              handleMarkAsPaid();
                            } else if (pendingAction?.type === 'markDelivered') {
                              handleUpdateOrder(new Event('submit'), 'Delivered');
                            } else {
                              handleUpdateOrder(new Event('submit'));
                            }
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                          onClick={() => setIsConfirmOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;
