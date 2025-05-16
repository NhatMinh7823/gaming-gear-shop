import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { checkVNPayPayment } from '../services/api';

function VNPayResult() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPayment = async () => {
      try {
        const { data } = await checkVNPayPayment(location.search);
        setResult(data);
        if (data.success) {
          toast.success('Payment successful!');
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
      <div className={`max-w-md mx-auto p-6 rounded-lg shadow-lg ${
        result?.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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
