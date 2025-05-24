import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { checkVNPayPayment, getProfile } from '../services/api';
import { setCredentials } from '../redux/slices/userSlice';

function VNPayResult() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);

  useEffect(() => {
    const checkPayment = async () => {
      try {
        const { data } = await checkVNPayPayment(location.search);
        setResult(data);
        if (data.success) {
          toast.success('Payment successful!');          // Cập nhật thông tin người dùng để lấy trạng thái coupon mới nhất
          if (userInfo) {
            try {
              const profileResponse = await getProfile();
              if (profileResponse.data && profileResponse.data.user) {
                // Đảm bảo cập nhật toàn bộ thông tin người dùng từ API
                dispatch(setCredentials({
                  ...userInfo,
                  ...profileResponse.data.user,
                  coupon: profileResponse.data.user.coupon
                }));
                console.log('Updated user profile after payment:', profileResponse.data.user.coupon);
              }
            } catch (profileError) {
              console.error('Failed to update user profile after payment:', profileError);
              // Thử lại một lần nữa sau 1 giây
              setTimeout(async () => {
                try {
                  const retryResponse = await getProfile();
                  if (retryResponse.data && retryResponse.data.user) {
                    dispatch(setCredentials({
                      ...userInfo,
                      ...retryResponse.data.user,
                      coupon: retryResponse.data.user.coupon
                    }));
                  }
                } catch (retryError) {
                  console.error('Failed to retry profile update:', retryError);
                }
              }, 1000);
            }
          }

          // Redirect to order page after 3 seconds
          setTimeout(() => {
            navigate(`/order/${data.orderId}`);
          }, 3000);
        } else {
          toast.error(data.message || 'Payment failed');
        }
      } catch (error) {
        toast.error('Error checking payment status');
        setResult({ success: false, message: 'Error checking payment status' });
      } finally {
        setLoading(false);
      }
    };

    if (location.search) {
      checkPayment();
    } else {
      setLoading(false);
      setResult({ success: false, message: 'Invalid payment response' });
    }
  }, [location, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-xl">Checking payment status...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className={`max-w-md mx-auto p-6 rounded-lg shadow-lg ${result?.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
        <div className="text-center">
          {result?.success ? (
            <>
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <h2 className="text-2xl font-bold text-green-700 mb-4">Payment Successful</h2>
              <p className="text-green-600 mb-4">
                Your payment has been processed successfully. You will be redirected to your order page shortly.
              </p>
            </>
          ) : (
            <>
              <div className="text-red-500 text-5xl mb-4">×</div>
              <h2 className="text-2xl font-bold text-red-700 mb-4">Payment Failed</h2>
              <p className="text-red-600 mb-4">
                {result?.message || 'There was an error processing your payment.'}
              </p>
            </>
          )}

          <button
            onClick={() => navigate('/orders')}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>
    </div>
  );
}

export default VNPayResult;
