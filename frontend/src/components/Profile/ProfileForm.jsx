// ProfileForm.jsx - Profile information form component
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { updateProfile } from '../../services/api';
import { setCredentials } from '../../redux/slices/userSlice';

function ProfileForm({ userInfo, initialName, initialEmail }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await updateProfile({ name, email });
      dispatch(setCredentials({ ...data.user, token: userInfo.token }));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Error updating profile');
      console.error('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-8 mb-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-100 border-b border-gray-700 pb-4">
        My Profile
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="shadow appearance-none border border-gray-700 rounded w-full py-3 px-4 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 transition-colors disabled:opacity-50"
              placeholder="Enter your name"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="shadow appearance-none border border-gray-700 rounded w-full py-3 px-4 text-gray-100 bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 transition-colors disabled:opacity-50"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileForm;
