import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Import api instance

const StatCard = ({ title, value, change, icon, iconBgColor, valueColor, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-3 rounded-full ${iconBgColor || 'bg-gray-200'}`}>
        {icon}
      </div>
      <p className={`text-sm ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</p>
    </div>
    <div>
      <h2 className="text-lg font-medium text-gray-600 mb-1">{title}</h2>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
      ) : (
        <p className={`text-3xl font-bold ${valueColor || 'text-gray-800'}`}>{value}</p>
      )}
    </div>
  </div>
);

const DashboardPage = () => {
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    // Add more stats as needed, e.g., paidRevenue, paidOrders, deliveredOrders
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  
  // Placeholder for recent activities - can be fetched similarly
  const [recentActivities, setRecentActivities] = useState([
    { type: 'order', text: 'New order #1234 placed.', time: '10m ago', color: 'green-500' },
    { type: 'user', text: "User 'john.doe' registered.", time: '1h ago', color: 'blue-500' },
  ]);


  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setErrorStats(null);
      try {
        // Fetch order stats and user count in parallel
        const [orderStatsResponse, usersResponse] = await Promise.all([
          api.get('/orders/stats'),
          api.get('/users') // Fetches all users, we need the count
        ]);
        
        // Process order stats
        const orderData = orderStatsResponse.data.stats; // Access .data.stats
        
        // Process user count
        const userCount = usersResponse.data.count || 0; // Access .data.count

        setDashboardStats({
          totalUsers: userCount,
          totalOrders: orderData.totalOrders || 0,
          totalRevenue: orderData.totalRevenue || 0,
          paidOrders: orderData.paidOrders || 0,
          paidRevenue: orderData.paidRevenue || 0,
          deliveredOrders: orderData.deliveredOrders || 0,
          statusStats: orderData.statusStats || {},
        });

      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to fetch dashboard data';
        setErrorStats(msg);
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, []);
  
  const statCardsData = [
    {
      title: "Total Users",
      value: dashboardStats.totalUsers.toLocaleString(),
      change: "", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      iconBgColor: "bg-blue-100",
      valueColor: "text-blue-600",
      loading: loadingStats,
    },
    {
      title: "Total Orders",
      value: dashboardStats.totalOrders.toLocaleString(),
      change: "", // Placeholder for change
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      iconBgColor: "bg-green-100",
      valueColor: "text-green-600",
      loading: loadingStats,
    },
    {
      title: "Total Revenue",
      value: `$${(dashboardStats.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "", // Placeholder for change
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBgColor: "bg-purple-100",
      valueColor: "text-purple-600",
      loading: loadingStats,
    },
    {
      title: "Paid Revenue",
      value: `$${(dashboardStats.paidRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: "", // Placeholder for change
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      iconBgColor: "bg-teal-100",
      valueColor: "text-teal-600",
      loading: loadingStats,
    },
    {
      title: "Paid Orders",
      value: (dashboardStats.paidOrders || 0).toLocaleString(),
      change: "", // Placeholder for change
      icon: (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBgColor: "bg-cyan-100",
      valueColor: "text-cyan-600",
      loading: loadingStats,
    },
    {
      title: "Delivered Orders",
      value: (dashboardStats.deliveredOrders || 0).toLocaleString(),
      change: "", // Placeholder for change
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-lime-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M9 17a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2H9z" />
          <path d="M9 17a2 2 0 00-2 2h10a2 2 0 00-2-2H9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 13L12 9" />
        </svg>
      ),
      iconBgColor: "bg-lime-100",
      valueColor: "text-lime-600",
      loading: loadingStats,
    },
  ];


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-gray-800">Admin Dashboard</h1>

      {errorStats && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error!</span> {errorStats}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCardsData.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            iconBgColor={stat.iconBgColor}
            valueColor={stat.valueColor}
            loading={stat.loading}
          />
        ))}
      </div>

      {/* Charts and Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Sales Overview</h2>
          <div className="h-64 bg-gray-200 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Chart will be displayed here</p>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Activity</h2>
          <ul className="space-y-3">
            <li className="flex items-center text-sm text-gray-600">
              <span className="bg-green-500 h-2 w-2 rounded-full mr-2"></span>
              New order #1234 placed.
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <span className="bg-blue-500 h-2 w-2 rounded-full mr-2"></span>
              User 'john.doe' registered.
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <span className="bg-yellow-500 h-2 w-2 rounded-full mr-2"></span>
              Product 'Gaming Mouse Pro' updated.
            </li>
            <li className="flex items-center text-sm text-gray-600">
              <span className="bg-red-500 h-2 w-2 rounded-full mr-2"></span>
              Order #1230 cancelled.
            </li>
             <li className="flex items-center text-sm text-gray-600">
              <span className="bg-green-500 h-2 w-2 rounded-full mr-2"></span>
              New order #1235 placed.
            </li>
          </ul>
          <button className="mt-4 w-full text-blue-600 hover:text-blue-800 font-medium text-sm">
            View all activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
