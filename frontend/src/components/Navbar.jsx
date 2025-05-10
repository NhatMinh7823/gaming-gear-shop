import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/userSlice';
import { clearCart } from '../redux/slices/cartSlice';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    navigate('/login');
  };

  // For debugging:
  // console.log("Navbar userInfo from Redux:", userInfo);

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">Gaming Gear</Link>
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <div className={`md:flex items-center space-x-4 ${isOpen ? 'block' : 'hidden'} md:block`}>
          <Link to="/products" className="hover:text-gray-200">Products</Link>
          <Link to="/cart" className="hover:text-gray-200">Cart</Link>
          {userInfo ? (
            <>
              {/* Assuming userInfo from Redux state is the object containing token and user object */}
              {/* e.g., userInfo = { token: '...', user: { name: 'Test User', role: 'admin' } } */}
              {/* Or if userInfo itself is the user object: userInfo = { name: 'Test User', role: 'admin' } */}
              {/* Based on userController, login returns { token, user: {id, name, email, role} } */}
              {/* And userSlice sets action.payload to userInfo. So userInfo has token and user. */}
              {/* However, localStorage might store a flatter structure if not handled carefully. */}
              {/* The provided localStorage data is flat: { email, id, name, role, token } */}
              <Link to="/profile" className="hover:text-gray-200">{userInfo.user?.name || userInfo.name}</Link>
              <Link to="/orders" className="hover:text-gray-200">Orders</Link>
              {(userInfo.user?.role === 'admin' || userInfo.role === 'admin') && (
                <Link to="/admin" className="hover:text-gray-200">Admin</Link>
              )}
              <button onClick={handleLogout} className="hover:text-gray-200">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-gray-200">Login</Link>
              <Link to="/register" className="hover:text-gray-200">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
