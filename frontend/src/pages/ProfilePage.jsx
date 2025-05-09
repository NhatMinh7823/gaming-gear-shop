import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getProfile, updateProfile, addToWishlist, removeFromWishlist } from '../services/api';
import { setCredentials } from '../redux/slices/userSlice';

function ProfilePage() {
  const { userInfo } = useSelector((state) => state.user);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo) {
      navigate('/login');
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data } = await getProfile();
        setName(data.user.name);
        setEmail(data.user.email);
      } catch (error) {
        toast.error('Error fetching profile');
      }
    };
    fetchProfile();
  }, [userInfo, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await updateProfile({ name, email });
      dispatch(setCredentials({ ...data.user, token: userInfo.token }));
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  const handleWishlistAction = async (productId, action) => {
    try {
      if (action === 'add') {
        await addToWishlist(productId);
        toast.success('Added to wishlist');
      } else {
        await removeFromWishlist(productId);
        toast.success('Removed from wishlist');
      }
      const { data } = await getProfile();
      dispatch(setCredentials({ ...data.user, token: userInfo.token }));
    } catch (error) {
      toast.error(`Error ${action === 'add' ? 'adding to' : 'removing from'} wishlist`);
    }
  };

  if (!userInfo) return null;

  return (
    <div className="container mx-auto py-8 max-w-lg">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Update Profile
        </button>
      </form>
      <div className="mt-8">
        <h2 className="text-2xl font-bold">Wishlist</h2>
        {userInfo.wishlist.length === 0 ? (
          <p>No items in wishlist.</p>
        ) : (
          <ul className="space-y-2">
            {userInfo.wishlist.map((productId) => (
              <li key={productId} className="flex justify-between">
                <span>Product ID: {productId}</span>
                <button
                  onClick={() => handleWishlistAction(productId, 'remove')}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;