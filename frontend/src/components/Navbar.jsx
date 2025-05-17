import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/userSlice';
import { clearCart } from '../redux/slices/cartSlice';
import 'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js';

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.feather?.replace();
    }
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white rounded-b-xl py-0 px-10 shadow-[0_0_40px_rgba(0,0,0,0.1)] w-full font-['Open_Sans',sans-serif] z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center h-[90px]"
        >
          <img 
            src="/gamingGearLogo.png" 
            alt="Gaming Gear Logo" 
            className="h-[90px] w-auto"
          />
        </Link>
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-6 h-6 text-[#1f2937]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <ul className={`flex space-x-4 md:space-x-6 ${isOpen ? 'flex flex-col absolute top-16 left-0 w-full bg-white p-4 shadow-md' : 'hidden'} md:flex md:static md:bg-transparent md:p-0 md:items-center relative`}>
          <li className="navbar-item">
            <Link
              to="/products"
              className="flex flex-col items-center justify-center w-14 h-14 text-blue-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
            >
              <i data-feather="shopping-bag" className="w-6 h-6"></i>
              <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                Products
              </span>
            </Link>
          </li>
          <li className="navbar-item">
            <Link
              to="/cart"
              className="flex flex-col items-center justify-center w-14 h-14 text-green-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
            >
              <i data-feather="shopping-cart" className="w-6 h-6"></i>
              <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                Cart
              </span>
            </Link>
          </li>
          {userInfo ? (
            <>
              <li className="navbar-item">
                <Link
                  to="/profile"
                  className="flex flex-col items-center justify-center w-14 h-14 text-purple-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
                >
                  <i data-feather="user" className="w-6 h-6"></i>
                  <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                    {userInfo.user?.name || userInfo.name}
                  </span>
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/orders"
                  className="flex flex-col items-center justify-center w-14 h-14 text-red-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
                >
                  <i data-feather="package" className="w-6 h-6"></i>
                  <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                    Orders
                  </span>
                </Link>
              </li>
              {(userInfo.user?.role === 'admin' || userInfo.role === 'admin') && (
                <li className="navbar-item">
                  <Link
                    to="/admin"
                    className="flex flex-col items-center justify-center w-14 h-14 text-orange-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
                  >
                    <i data-feather="shield" className="w-6 h-6"></i>
                    <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                      Admin
                    </span>
                  </Link>
                </li>
              )}
              <li className="navbar-item">
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center justify-center w-14 h-14 text-red-900 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
                >
                  <i data-feather="log-out" className="w-6 h-6"></i>
                  <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                    Logout
                  </span>
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <Link
                  to="/login"
                  className="flex flex-col items-center justify-center w-14 h-14 text-teal-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
                >
                  <i data-feather="log-in" className="w-6 h-6"></i>
                  <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                    Login
                  </span>
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/register"
                  className="flex flex-col items-center justify-center w-14 h-14 text-gray-800 hover:bg-blue-500 hover:rounded-[1.75rem] hover:text-white transition-all duration-250 relative group"
                >
                  <i data-feather="user-plus" className="w-6 h-6"></i>
                  <span className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-1rem] bg-white text-[#1e40af] p-2 rounded-[1.75rem] shadow-md pointer-events-none transition-all duration-250">
                    Register
                  </span>
                </Link>
              </li>
            </>
          )}
          <li
            className="absolute top-4 w-14 h-14 bg-blue-500 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-all duration-250 ease-[cubic-bezier(1,0.2,0.1,1.2)] pointer-events-none z-[-1]"
            style={{ transform: 'scale(1, 1)' }}
            id="highlight"
          ></li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
