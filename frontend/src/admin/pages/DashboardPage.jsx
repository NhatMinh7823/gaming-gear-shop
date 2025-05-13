import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Import api instance
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);


const StatCard = ({ title, value, change, icon, iconBgColor, valueColor, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-3 rounded-full ${iconBgColor || 'bg-gray-200'}`}>
        {icon}
      </div>
      {change && <p className={`text-sm ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</p>}
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
    paidOrders: 0,
    paidRevenue: 0,
    deliveredOrders: 0,
    statusStats: {},
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);

  const [salesData, setSalesData] = useState([]);
  const [loadingSalesData, setLoadingSalesData] = useState(true);
  const [errorSalesData, setErrorSalesData] = useState(null);

  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingRecentActivities, setLoadingRecentActivities] = useState(true);
  const [errorRecentActivities, setErrorRecentActivities] = useState(null);


  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingStats(true);
      setErrorStats(null);
      try {
        const [orderStatsResponse, usersResponse] = await Promise.all([
          api.get('/orders/stats'),
          api.get('/users')
        ]);

        const orderData = orderStatsResponse.data.stats;
        const userCount = usersResponse.data.count || 0;

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
        const msg = err.response?.data?.message || err.message || 'Failed to fetch dashboard stats';
        setErrorStats(msg);
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchSalesData = async () => {
      setLoadingSalesData(true);
      setErrorSalesData(null);
      try {
        const response = await api.get('/orders/salesdata');
        setSalesData(response.data.salesData);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to fetch sales data';
        setErrorSalesData(msg);
        console.error("Error fetching sales data:", err);
      } finally {
        setLoadingSalesData(false);
      }
    };

    const fetchRecentActivities = async () => {
      setLoadingRecentActivities(true);
      setErrorRecentActivities(null);
      try {
        const [recentOrdersResponse, recentUsersResponse] = await Promise.all([
          api.get('/orders?limit=10'), // Assuming a limit parameter is supported or fetch all and limit on frontend
          api.get('/users/recent')
        ]);

        const recentOrders = recentOrdersResponse.data.orders.map(order => ({
          type: 'order',
          text: `New order #${order._id.slice(-6)} placed by ${order.user.name}.`,
          time: order.createdAt,
          color: 'green-500',
          date: new Date(order.createdAt),
        }));

        const recentUsers = recentUsersResponse.data.users.map(user => ({
          type: 'user',
          text: `User '${user.name}' registered.`,
          time: user.createdAt,
          color: 'blue-500',
          date: new Date(user.createdAt),
        }));

        const combinedActivities = [...recentOrders, ...recentUsers].sort((a, b) => b.date - a.date);

        setRecentActivities(combinedActivities.slice(0, 10)); // Display top 10 recent activities

      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to fetch recent activities';
        setErrorRecentActivities(msg);
        console.error("Error fetching recent activities:", err);
      } finally {
        setLoadingRecentActivities(false);
      }
    };


    fetchDashboardData();
    fetchSalesData();
    fetchRecentActivities();
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

  const salesChartData = {
    labels: salesData.map(data => `${data._id.month}/${data._id.year}`),
    datasets: [
      {
        label: 'Monthly Sales',
        data: salesData.map(data => data.totalSales),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Sales Overview',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Revenue ($)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Month/Year',
        },
      },
    },
  };

  const formatActivityTime = (timestamp) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffInMilliseconds = now - activityDate;
    const diffInMinutes = Math.round(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.round(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-gray-800">Admin Dashboard</h1>

      {(errorStats || errorSalesData || errorRecentActivities) && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error!</span> {errorStats || errorSalesData || errorRecentActivities}
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
            loading={loadingStats}
          />
        ))}
      </div>

      {/* Charts and Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Sales Overview</h2>
          {loadingSalesData ? (
            <div className="h-64 bg-gray-200 rounded-md flex items-center justify-center animate-pulse">
              <p className="text-gray-500">Loading sales data...</p>
            </div>
          ) : salesData.length > 0 ? (
            <div className="h-64">
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          ) : (
            <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
              <p className="text-gray-500">No sales data available.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Recent Activity</h2>
          {loadingRecentActivities ? (
             <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
             </div>
          ) : recentActivities.length > 0 ? (
            <ul className="space-y-3">
              {recentActivities.map((activity, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <span className={`bg-${activity.color} h-2 w-2 rounded-full mr-2`}></span>
                  {activity.text} <span className="ml-auto text-xs text-gray-500">{formatActivityTime(activity.time)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-full bg-gray-100 rounded-md flex items-center justify-center">
              <p className="text-gray-500">No recent activity.</p>
            </div>
          )}
          {/* <button className="mt-4 w-full text-blue-600 hover:text-blue-800 font-medium text-sm">
            View all activity
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
