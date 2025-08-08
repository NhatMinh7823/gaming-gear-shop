import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Import api instance
import { Line } from 'react-chartjs-2';
import { formatChartLabels, getChartOptions } from '../../utils/chartUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


const StatCard = ({ title, value, change, trend, icon, iconBgColor, valueColor, loading }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out group">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-3 rounded-full ${iconBgColor || 'bg-gray-200'} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      {change && (
        <div className="flex items-center">
          {change.startsWith('+') ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          )}
          <p className={`text-sm font-medium ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </p>
        </div>
      )}
    </div>
    <div>
      <h2 className="text-lg font-medium text-gray-600 mb-1 group-hover:text-gray-800 transition-colors duration-300">
        {title}
      </h2>
      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-10 bg-gray-100 rounded w-full animate-pulse"></div>
        </div>
      ) : (
        <>
          <p className={`text-3xl font-bold ${valueColor || 'text-gray-800'} mb-2`}>{value}</p>
          {trend && (
            <div className="h-10">
              <Line
                data={{
                  labels: [...Array(trend.data.length)].map((_, i) => i),
                  datasets: [{
                    data: trend.data,
                    borderColor: trend.color,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: `${trend.color}15`
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { display: false },
                    y: { display: false }
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  </div>
);

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    current: {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      paidOrders: 0,
      paidRevenue: 0,
      deliveredOrders: 0,
      statusStats: {},
    },
    history: {
      totalUsers: [],
      totalOrders: [],
      totalRevenue: [],
      paidOrders: [],
      paidRevenue: [],
      deliveredOrders: [],
    },
    changes: {},
    metadata: {
      hasRealData: false,
      period: '30 days'
    }
  });

  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);

  const [salesData, setSalesData] = useState([]);
  const [loadingSalesData, setLoadingSalesData] = useState(true);
  const [errorSalesData, setErrorSalesData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingRecentActivities, setLoadingRecentActivities] = useState(true);
  const [errorRecentActivities, setErrorRecentActivities] = useState(null);

  // Define fetchSalesData outside useEffect so it can be reused
  const fetchSalesData = async (period = 'monthly') => {
    setLoadingSalesData(true);
    setErrorSalesData(null);
    try {
      const response = await api.get(`/orders/salesdata?period=${period}`);
      const salesDataFromApi = response.data.salesData || [];

      console.log(`Sales Data from API (${period}):`, salesDataFromApi);

      setSalesData(salesDataFromApi);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch sales data';
      setErrorSalesData(msg);
      console.error("Error fetching sales data:", err);

      // Set empty array if there's an error
      setSalesData([]);
    } finally {
      setLoadingSalesData(false);
    }
  };

  // Handle period change for sales chart
  const handlePeriodChange = async (newPeriod) => {
    setSelectedPeriod(newPeriod);
    await fetchSalesData(newPeriod);
  };


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoadingStats(true);
        setErrorStats(null);

        // Use the new comprehensive dashboard endpoint
        const response = await api.get('/orders/dashboard-stats?days=7'); // Last 7 days for trends
        const data = response.data.data;

        console.log('Dashboard API Response:', data);

        setDashboardData(data);

      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to fetch dashboard stats';
        setErrorStats(msg);
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchRecentActivities = async () => {
      setLoadingRecentActivities(true);
      setErrorRecentActivities(null);
      try {
        const [recentOrdersResponse, recentUsersResponse] = await Promise.all([
          api.get('/orders?limit=10'),
          api.get('/users/recent')
        ]);

        const recentOrders = recentOrdersResponse.data.orders.map(order => ({
          type: 'order',
          text: `Đơn hàng mới #${order._id.slice(-6)} được đặt bởi ${order.user.name}.`,
          time: order.createdAt,
          color: 'green-500',
          date: new Date(order.createdAt),
        }));

        const recentUsers = recentUsersResponse.data.users.map(user => ({
          type: 'user',
          text: `Người dùng '${user.name}' đã đăng ký.`,
          time: user.createdAt,
          color: 'blue-500',
          date: new Date(user.createdAt),
        }));

        const combinedActivities = [...recentOrders, ...recentUsers].sort((a, b) => b.date - a.date);

        setRecentActivities(combinedActivities.slice(0, 10));

      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to fetch recent activities';
        setErrorRecentActivities(msg);
        console.error("Error fetching recent activities:", err);
      } finally {
        setLoadingRecentActivities(false);
      }
    };

    fetchDashboardData();
    fetchSalesData(selectedPeriod);
    fetchRecentActivities();
  }, []);

  // Helper function to format percentage change from backend
  const formatChange = (changeValue) => {
    if (changeValue === 0) return "0%";
    return `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(1)}%`;
  };

  const statCardsData = [
    {
title: "Tổng người dùng",
      value: dashboardData.current.totalUsers.toLocaleString(),
      change: formatChange(dashboardData.changes.totalUsers || 0),
      trend: {
        data: dashboardData.history.totalUsers || [],
        color: '#3B82F6'  // blue-500
      },
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
title: "Tổng đơn hàng",
      value: dashboardData.current.totalOrders.toLocaleString(),
      change: formatChange(dashboardData.changes.totalOrders || 0),
      trend: {
        data: dashboardData.history.totalOrders || [],
        color: '#22C55E'  // green-500
      },
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
title: "Tổng doanh thu",
      value: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(dashboardData.current.totalRevenue || 0),
      change: formatChange(dashboardData.changes.totalRevenue || 0),
      trend: {
        data: dashboardData.history.totalRevenue || [],
        color: '#A855F7'  // purple-500
      },
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
title: "Doanh thu đã thanh toán",
      value: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(dashboardData.current.paidRevenue || 0),
      change: formatChange(dashboardData.changes.paidRevenue || 0),
      trend: {
        data: dashboardData.history.paidRevenue || [],
        color: '#14B8A6'  // teal-500
      },
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
title: "Đơn hàng đã thanh toán",
      value: (dashboardData.current.paidOrders || 0).toLocaleString(),
      change: formatChange(dashboardData.changes.paidOrders || 0),
      trend: {
        data: dashboardData.history.paidOrders || [],
        color: '#06B6D4'  // cyan-500
      },
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
title: "Đơn hàng đã giao",
      value: (dashboardData.current.deliveredOrders || 0).toLocaleString(),
      change: formatChange(dashboardData.changes.deliveredOrders || 0),
      trend: {
        data: dashboardData.history.deliveredOrders || [],
        color: '#84CC16'  // lime-500
      },
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

  // Create chart data using utility functions
  const salesChartData = {
    labels: formatChartLabels(salesData, selectedPeriod),
    datasets: [
      {
label: 'Doanh thu',
        data: salesData.map(data => data.totalSales),
        fill: true,
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(75, 192, 192)',
        pointHoverBackgroundColor: 'rgb(75, 192, 192)',
        pointBorderColor: '#fff',
        pointHoverBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y'
      },
      {
label: 'Đơn hàng',
        data: salesData.map(data => data.orderCount || 0),
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointHoverBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointHoverBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y1'
      }
    ],
  };

  // Use utility function for chart options
  const salesChartOptions = getChartOptions(selectedPeriod, salesData);

  const formatActivityTime = (timestamp) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diffInMilliseconds = now - activityDate;
    const diffInMinutes = Math.round(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.round(diffInMilliseconds / (1000 * 60 * 60));
    const diffInDays = Math.round(diffInMilliseconds / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}p trước`;
    } else if (diffInHours < 24) {
      return `${diffInHours}g trước`;
    } else {
      return `${diffInDays}ngày trước`;
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
<h1 className="text-3xl font-semibold text-gray-800">Bảng điều khiển quản trị</h1>

        {/* Data source indicator */}
        <div className="flex items-center space-x-2">
          {dashboardData.metadata.hasRealData ? (
            <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Dữ liệu thực tế
            </div>
          ) : (
            <div className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Dữ liệu demo
            </div>
          )}
          <div className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            Giai đoạn: {dashboardData.metadata.period}
          </div>
        </div>
      </div>

      {(errorStats || errorSalesData || errorRecentActivities) && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Lỗi!</span> {errorStats || errorSalesData || errorRecentActivities}
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
            trend={stat.trend}
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
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-700">Tổng quan bán hàng</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {selectedPeriod === 'monthly' ? 'Theo tháng' : selectedPeriod === 'weekly' ? 'Theo tuần' : 'Theo năm'}
              </span>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                disabled={loadingSalesData}
              >
<option value="monthly">Theo tháng</option>
<option value="weekly">Theo tuần</option>
<option value="yearly">Theo năm</option>
              </select>

            </div>
          </div>
          {loadingSalesData ? (
            <div className="h-64 bg-gray-200 rounded-md flex items-center justify-center animate-pulse">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
<p className="text-gray-500">Đang tải dữ liệu doanh số {selectedPeriod === 'monthly' ? 'theo tháng' : selectedPeriod === 'weekly' ? 'theo tuần' : 'theo năm'}...</p>
              </div>
            </div>
          ) : salesData.length > 0 ? (
            <div className="h-64">
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          ) : (
            <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
<p className="text-gray-500">Không có dữ liệu doanh số {selectedPeriod === 'monthly' ? 'theo tháng' : selectedPeriod === 'weekly' ? 'theo tuần' : 'theo năm'}.</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
<h2 className="text-xl font-semibold text-gray-700 mb-4">Hoạt động gần đây</h2>
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
<p className="text-gray-500">Không có hoạt động gần đây.</p>
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
