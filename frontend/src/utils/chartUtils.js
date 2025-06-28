// Utility functions for chart data processing and formatting

/**
 * Format chart labels based on period type
 * @param {Array} salesData - Raw sales data from API
 * @param {string} period - Period type (weekly, monthly, yearly)
 * @returns {Array} Formatted labels for chart
 */
export const formatChartLabels = (salesData, period) => {
  if (!salesData || salesData.length === 0) return [];

  return salesData.map((data) => {
    const { _id } = data;

    switch (period) {
      case "weekly":
        // Format: "Week 23, 2024"
        return `Tuần ${_id.week}, ${_id.year}`;

      case "yearly":
        // Format: "2024"
        return `${_id.year}`;

      case "monthly":
      default:
        // Format: "Jan 2024" or "12/2024"
        const monthNames = [
          "Th1",
          "Th2",
          "Th3",
          "Th4",
          "Th5",
          "Th6",
          "Th7",
          "Th8",
          "Th9",
          "Th10",
          "Th11",
          "Th12",
        ];
        return `${monthNames[_id.month - 1]} ${_id.year}`;
    }
  });
};

/**
 * Generate chart title based on period
 * @param {string} period - Period type
 * @returns {string} Chart title
 */
export const getChartTitle = (period) => {
  switch (period) {
    case "weekly":
      return "Tổng quan bán hàng hàng tuần";
    case "yearly":
      return "Tổng quan bán hàng hàng năm";
    case "monthly":
    default:
      return "Tổng quan bán hàng hàng tháng";
  }
};

/**
 * Get appropriate step size for y-axis based on data range
 * @param {Array} data - Array of numeric values
 * @returns {number} Step size for y-axis
 */
export const getYAxisStepSize = (data) => {
  if (!data || data.length === 0) return 1;

  const maxValue = Math.max(...data);
  const minSteps = 5;
  const maxSteps = 10;

  const stepSize = Math.ceil(maxValue / minSteps);
  return stepSize;
};

/**
 * Get chart configuration options based on period
 * @param {string} period - Period type
 * @param {Array} salesData - Sales data for calculating step sizes
 * @returns {Object} Chart configuration options
 */
export const getChartOptions = (period, salesData) => {
  const orderCounts = salesData.map((data) => data.orderCount || 0);

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: "easeInOutQuart",
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: "600",
          },
        },
      },
      title: {
        display: true,
        text: getChartTitle(period),
        font: {
          size: 16,
          weight: "bold",
        },
        padding: {
          bottom: 30,
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#000",
        titleFont: {
          size: 13,
          weight: "bold",
        },
        bodyColor: "#666",
        bodyFont: {
          size: 12,
        },
        borderColor: "#ddd",
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
if (context.dataset.label === "Doanh thu") {
              label += new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(context.parsed.y);
            } else {
              label += context.parsed.y;
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        type: "linear",
        display: true,
        position: "left",
        beginAtZero: true,
        grid: {
          drawBorder: false,
          color: "rgba(0, 0, 0, 0.05)",
        },
        title: {
          display: true,
          text: "Doanh thu (VNĐ)",
          color: "rgb(75, 192, 192)",
          font: {
            size: 12,
            weight: "600",
          },
          padding: {
            bottom: 10,
          },
        },
        ticks: {
          color: "rgb(75, 192, 192)",
          callback: function (value) {
            return new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(value);
          },
          maxTicksLimit: 8,
        },
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        beginAtZero: true,
        grid: {
          display: false,
        },
        title: {
          display: true,
text: "Đơn hàng",
          color: "rgb(54, 162, 235)",
          font: {
            size: 12,
            weight: "600",
          },
        },
        ticks: {
          color: "rgb(54, 162, 235)",
          stepSize: getYAxisStepSize(orderCounts),
          maxTicksLimit: 8,
        },
      },
      x: {
        grid: {
          display: false,
        },
        title: {
          display: true,
          text:
            period === "weekly"
              ? "Tuần/Năm"
              : period === "yearly"
              ? "Năm"
              : "Tháng/Năm",
          font: {
            size: 12,
            weight: "600",
          },
          padding: {
            top: 10,
          },
        },
        ticks: {
          maxTicksLimit: period === "yearly" ? 15 : 12,
          maxRotation: period === "weekly" ? 45 : 30,
          minRotation: period === "weekly" ? 30 : 0,
        },
      },
    },
  };
};
