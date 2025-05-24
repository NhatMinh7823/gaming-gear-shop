import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { getOrderById, createVNPayUrl, checkVNPayPayment, cancelOrder, getProfile } from '../services/api';
import {
  FaBox, FaShoppingBag, FaClock, FaCheckCircle, FaTruck, FaTimesCircle,
  FaMapMarkerAlt, FaCreditCard, FaArrowLeft, FaBan
} from 'react-icons/fa';
import { setCredentials } from '../redux/slices/userSlice';

function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [cancelingOrder, setCancelingOrder] = useState(false);

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
          console.log("Checking VNPay payment with query:", location.search);
          // Phân tích query string để tìm mã đơn hàng gốc
          const urlParams = new URLSearchParams(location.search);
          const txnRef = urlParams.get('vnp_TxnRef');

          // Log để debug
          console.log("Transaction reference:", txnRef);
          const { data } = await checkVNPayPayment(location.search);
          if (data.success) {
            toast.success('Payment successful!');

            // Refresh order data to get updated payment status
            const { data: orderData } = await getOrderById(id);
            setOrder(orderData.order);

            // Refresh user profile to get updated coupon status if the order used a coupon
            if (orderData.order && orderData.order.couponCode) {
              try {
                const { data: profileData } = await getProfile();
                if (profileData && profileData.user) {
                  // Update Redux store with the latest user information including updated coupon status
                  dispatch(setCredentials({
                    ...userInfo,
                    coupon: profileData.user.coupon
                  }));
                  console.log('Updated coupon status after successful payment:', profileData.user.coupon);
                }
              } catch (profileError) {
                console.error('Failed to update user profile after payment:', profileError);
              }
            }

            // Remove query params from URL
            navigate(location.pathname, { replace: true });
          } else {
            toast.error(`Payment failed: ${data.message || 'Unknown error'}`);
            console.error("Payment failure details:", data);

            // For specific error conditions, redirect to error page
            if (data.message === "Không thể thanh toán đơn hàng đã bị hủy") {
              navigate(`/payment-error?error=order-cancelled&orderId=${id}`);
            }
          }
        } catch (error) {
          console.error("Error checking payment:", error);
          toast.error('Error checking payment status');
        }
      };
      checkPayment();
    }
  }, [location, navigate, id]);

  const handleVNPayPayment = async () => {
    try {
      console.log("Attempting VNPay payment for order:", id);
      const { data } = await createVNPayUrl(id);
      if (data.paymentUrl) {
        console.log("Payment URL generated:", data.paymentUrl);
        window.location.href = data.paymentUrl;
      }
    } catch (error) {
      console.error("VNPay error details:", error.response?.data || error.message);
      toast.error('Error creating payment URL');
    }
  }; const handleCancelOrder = async () => {
    try {
      if (window.confirm('Are you sure you want to cancel this order?')) {
        setCancelingOrder(true);

        // Lưu couponCode trước khi gọi API hủy đơn
        const hasCoupon = order && order.couponCode;
        const couponCode = order?.couponCode;

        const { data } = await cancelOrder(id);
        toast.success('Order cancelled successfully');

        // Refresh order data
        const { data: orderData } = await getOrderById(id);
        setOrder(orderData.order);

        // Make sure to properly refresh user profile to get updated coupon status
        if (hasCoupon) {
          try {
            // Thêm một khoảng thời gian lớn hơn để đảm bảo backend đã cập nhật xong
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: profileData } = await getProfile();
            console.log('Profile data after cancel:', profileData);

            if (profileData && profileData.user) {
              // Kiểm tra xem coupon đã được hoàn trả chưa
              if (profileData.user.coupon &&
                (profileData.user.coupon.status === 'usable' || !profileData.user.coupon.used)) {
                // Update Redux store with the latest user information including coupon status
                dispatch(setCredentials({
                  ...userInfo,
                  coupon: profileData.user.coupon
                }));

                // Log coupon status for debugging
                console.log('Updated coupon status:', profileData.user.coupon);

                toast.info(`Mã giảm giá ${couponCode} đã được hoàn trả và bạn có thể sử dụng lại`);
              } else {
                console.log('Coupon status was not updated to usable:', profileData.user.coupon);
                // Thử lại một lần nữa sau 2 giây
                setTimeout(async () => {
                  try {
                    const { data: retryData } = await getProfile();
                    if (retryData.user.coupon &&
                      (retryData.user.coupon.status === 'usable' || !retryData.user.coupon.used)) {
                      dispatch(setCredentials({
                        ...userInfo,
                        coupon: retryData.user.coupon
                      }));
                      toast.info(`Mã giảm giá ${couponCode} đã được hoàn trả và bạn có thể sử dụng lại`);
                    }
                  } catch (error) {
                    console.error('Error on retry:', error);
                  }
                }, 2000);
              }
            }
          } catch (profileError) {
            console.error('Failed to update user profile after cancelling order:', profileError);
          }
        }
      }
    } catch (error) {
      toast.error('Error cancelling order');
      console.error("Error details:", error);
    } finally {
      setCancelingOrder(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
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
    switch (status?.toLowerCase()) {
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
    if (!dateString) return 'N/A';
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

  if (!userInfo || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-300 hover:text-gray-100 mb-6 transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Orders</span>
        </button>

        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(order.status)}
                <h1 className="text-2xl font-bold text-gray-100">
                  Order #{order._id.slice(-8).toUpperCase()}
                </h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-100 mb-4">
                  <FaShoppingBag className="text-blue-400" />
                  <h2>Order Items</h2>
                </div>
                <div className="space-y-4">
                  {order.orderItems.map((item) => (
                    <div key={item._id} className="bg-gray-800 rounded-lg p-4 flex gap-4 items-center">
                      <img
                        src={item.image || 'https://via.placeholder.com/100'}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-gray-100">{item.name}</h3>
                        <div className="text-sm text-gray-300 mt-1">
                          <p>Số lượng: {item.quantity}</p>
                          <p className="font-medium text-blue-400">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-100 mb-4">
                  <FaCreditCard className="text-blue-400" />
                  <h2>Payment Details</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-300">
                    <span>Payment Status:</span>
                    <span className={`font-medium ${order.isPaid ? 'text-green-400' : 'text-red-400'}`}>
                      {order.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  {order.isPaid && (
                    <div className="flex justify-between text-gray-300">
                      <span>Paid At:</span>
                      <span>{formatDate(order.paidAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300">
                    <span>Payment Method:</span>
                    <span>{order.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg mt-4 text-gray-200">
                    <span>Total:</span>
                    <span className="text-blue-400">{formatPrice(order.totalPrice)}</span>
                  </div>                  {!order.isPaid && order.status !== 'Cancelled' && order.paymentMethod === 'VNPay' && (
                    <button
                      onClick={handleVNPayPayment}
                      className="w-full mt-4 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 
                               transition-colors flex items-center justify-center gap-2"
                    >
                      <FaCreditCard />
                      <span>Pay with VNPay</span>
                    </button>
                  )}                  {/* Nút hủy đơn hàng - chỉ hiển thị khi đơn chưa thanh toán, chưa vận chuyển và chưa bị hủy */}
                  {!order.isPaid && order.status !== 'Shipped' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                    <button
                      onClick={handleCancelOrder}
                      disabled={cancelingOrder}
                      className="w-full mt-4 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 
                               transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {cancelingOrder ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                          <span className="ml-2">Processing...</span>
                        </>
                      ) : (
                        <>
                          <FaBan />
                          <span>Cancel Order</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>              {/* Cancel Order section removed to avoid duplication - only showing the cancel button in Payment Details section */}

              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-100 mb-4">
                  <FaMapMarkerAlt className="text-blue-400" />
                  <h2>Shipping Details</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-300">
                    <span>Delivery Status:</span>
                    <span className={`font-medium ${order.isDelivered ? 'text-green-400' : 'text-yellow-400'}`}>
                      {order.isDelivered ? 'Delivered' : 'Pending'}
                    </span>
                  </div>
                  {order.isDelivered && (
                    <div className="flex justify-between text-gray-300">
                      <span>Delivered At:</span>
                      <span>{formatDate(order.deliveredAt)}</span>
                    </div>
                  )}
                  <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600">
                    <p className="text-gray-300 whitespace-pre-line">
                      {order.shippingAddress.street},
                      <br />
                      {order.shippingAddress.city}, {order.shippingAddress.state}
                      <br />
                      {order.shippingAddress.postalCode}, {order.shippingAddress.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderPage;
