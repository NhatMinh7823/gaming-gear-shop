import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Import the configured axios instance

const UserEditPage = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/users/${userId}`); // Admin get user by ID
        // response is already response.data
        setUser(response.user);
        setRole(response.user.role);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch user details');
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.put(`/users/${userId}`, { role }); // Admin update user (role)
      setSuccessMessage('User role updated successfully!');
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update user role');
      console.error("Error updating user role:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) {
    return <div className="flex justify-center items-center h-64"><p className="text-xl">Loading user details...</p></div>;
  }

  if (error && !user) { // If user data couldn't be fetched initially
    return <div className="text-red-500 p-4 bg-red-100 rounded-md">Error: {error}</div>;
  }
  
  if (!user) { // Should not happen if loading and error are handled, but as a fallback
      return <div className="text-center p-4">User not found or error loading details.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">Edit User Role</h1>
      <p className="mb-2 text-lg">User: <span className="font-medium">{user.name} ({user.email})</span></p>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-xl space-y-6 max-w-md mx-auto">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            name="role"
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEditPage;
