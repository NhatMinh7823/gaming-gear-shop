import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/userSlice';
import { clearCart } from '../redux/slices/cartSlice';
import { clearChat } from '../redux/slices/chatbotSlice';
import { clearChatbotService } from '../utils/chatbotStateManager';
import { 
  FiShoppingBag, 
  FiShoppingCart, 
  FiUser, 
  FiPackage, 
  FiShield, 
  FiLogOut, 
  FiLogIn, 
  FiUserPlus,
  FiX
} from 'react-icons/fi';
import ProductDropdown from './ProductDropdown/ProductDropdown';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const { userInfo } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const dropdownTimeoutRef = useRef(null);

  const handleLogout = () => {
    // Clear chatbot trước khi logout
    dispatch(clearChat());
    clearChatbotService();
    
    // Logout bình thường
    dispatch(logout());
    dispatch(clearCart());
    navigate('/login');
    setIsOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Prevent body scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleNavLinkClick = () => {
    setIsOpen(false);
  };

  // Product dropdown handlers
  const handleProductMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setShowProductDropdown(true);
  };

  const handleProductMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowProductDropdown(false);
    }, 150); // Small delay to allow moving to dropdown
  };

  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
  };

  const handleDropdownMouseLeave = () => {
    setShowProductDropdown(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 bg-gray-800 rounded-b-xl py-0 px-4 md:px-10 shadow-[0_0_40px_rgba(0,0,0,0.3)] w-full font-['Open_Sans',sans-serif] z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center h-[90px]"
          onClick={handleNavLinkClick}
        >
          <img 
            src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/images/logos/logodarkmode.png`}
            alt="Gaming Gear Logo" 
            className="h-[60px] md:h-[90px] w-auto"
          />
        </Link>
        
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-700 transition-colors duration-200"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <FiX className="w-6 h-6 text-gray-100" />
          ) : (
            <svg className="w-6 h-6 text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          )}
        </button>
        
        {/* Mobile menu overlay */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsOpen(false)}></div>
        )}
        
        {/* Navigation menu */}
        <div 
          ref={menuRef}
          className={`md:flex md:items-center md:static md:bg-transparent md:p-0 
            ${isOpen ? 
              'fixed right-0 top-0 h-full w-[250px] bg-gray-800 shadow-lg z-50 transform translate-x-0 transition-transform duration-300 ease-in-out' : 
              'fixed right-0 top-0 h-full w-[250px] bg-gray-800 shadow-lg z-50 transform translate-x-full transition-transform duration-300 ease-in-out'} 
            md:transform-none md:transition-none md:w-auto`}
        >
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-700">
            <span className="text-white font-medium">Menu</span>
            <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <ul className="flex flex-col md:flex-row md:space-x-6 p-4 md:p-0">
            <li className="mb-4 md:mb-0 relative">
              <Link
                to="/products"
                className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                onClick={handleNavLinkClick}
                onMouseEnter={handleProductMouseEnter}
                onMouseLeave={handleProductMouseLeave}
              >
                <FiShoppingBag className="w-6 h-6 mr-3 md:mr-0" />
                <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                  Products
                </span>
              </Link>
              
              {/* Product Dropdown - only show on desktop */}
              <div className="hidden md:block">
                <ProductDropdown
                  isVisible={showProductDropdown}
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                />
              </div>
            </li>
            <li className="mb-4 md:mb-0">
              <Link
                to="/cart"
                className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                onClick={handleNavLinkClick}
              >
                <FiShoppingCart className="w-6 h-6 mr-3 md:mr-0" />
                <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                  Cart
                </span>
              </Link>
            </li>
            
            {userInfo ? (
              <>
                <li className="mb-4 md:mb-0">
                  <Link
                    to="/profile"
                    className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                    onClick={handleNavLinkClick}
                  >
                    <FiUser className="w-6 h-6 mr-3 md:mr-0" />
                    <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                      {userInfo.user?.name || userInfo.name}
                    </span>
                  </Link>
                </li>
                <li className="mb-4 md:mb-0">
                  <Link
                    to="/orders"
                    className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                    onClick={handleNavLinkClick}
                  >
                    <FiPackage className="w-6 h-6 mr-3 md:mr-0" />
                    <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                      Orders
                    </span>
                  </Link>
                </li>
                {(userInfo.user?.role === 'admin' || userInfo.role === 'admin') && (
                  <li className="mb-4 md:mb-0">
                    <Link
                      to="/admin"
                      className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                      onClick={handleNavLinkClick}
                    >
                      <FiShield className="w-6 h-6 mr-3 md:mr-0" />
                      <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                        Admin
                      </span>
                    </Link>
                  </li>
                )}
                <li className="mb-4 md:mb-0">
                  <button
                    onClick={handleLogout}
                    className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2 w-full text-left"
                  >
                    <FiLogOut className="w-6 h-6 mr-3 md:mr-0" />
                    <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                      Logout
                    </span>
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="mb-4 md:mb-0">
                  <Link
                    to="/login"
                    className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                    onClick={handleNavLinkClick}
                  >
                    <FiLogIn className="w-6 h-6 mr-3 md:mr-0" />
                    <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                      Login
                    </span>
                  </Link>
                </li>
                <li className="mb-4 md:mb-0">
                  <Link
                    to="/register"
                    className="flex items-center md:flex-col md:items-center md:justify-center md:w-14 md:h-14 text-white md:text-indigo-400 hover:text-indigo-400 md:hover:bg-indigo-600 md:hover:rounded-[1.75rem] md:hover:text-white transition-all duration-250 relative group py-2"
                    onClick={handleNavLinkClick}
                  >
                    <FiUserPlus className="w-6 h-6 mr-3 md:mr-0" />
                    <span className="md:absolute md:top-full md:mt-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:translate-y-[-1rem] md:bg-gray-700 md:text-gray-100 md:p-2 md:rounded-[1.75rem] md:shadow-md md:pointer-events-none md:transition-all md:duration-250">
                      Register
                    </span>
                  </Link>
                </li>
              </>
            )}
            <li
              className="hidden md:block absolute top-4 w-14 h-14 bg-indigo-600 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-all duration-250 ease-[cubic-bezier(1,0.2,0.1,1.2)] pointer-events-none z-[-1]"
              style={{ transform: 'scale(1, 1)' }}
              id="highlight"
            ></li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
