const dashboardRepository = require('./dashboard.repository');

class DashboardService {
  async getDashboardSummary() {
    const [metrics, lowStockProducts, topProducts, chartRaw, activeShifts, recentTransactions] = await Promise.all([
      dashboardRepository.getTodayMetrics(),
      dashboardRepository.getLowStockProducts(6),
      dashboardRepository.getTopSellingProducts(7, 5),
      dashboardRepository.getSalesChartData(7),
      dashboardRepository.getActiveShifts(),
      dashboardRepository.getRecentTransactions(5),
    ]);

    // Format chart data for 7 days (including zero-sales days)
    const chartLabels = [];
    const chartRevenue = [];
    const chartTransactions = [];

    const map = {};
    chartRaw.forEach(row => {
      const dateStr = new Date(row.sale_date).toISOString().split('T')[0];
      map[dateStr] = {
        revenue: parseFloat(row.daily_revenue),
        transactions: parseInt(row.daily_transactions),
      };
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

      chartLabels.push(dayName);
      chartRevenue.push(map[key] ? map[key].revenue : 0);
      chartTransactions.push(map[key] ? map[key].transactions : 0);
    }

    const weeklyTotalRevenue = chartRevenue.reduce((acc, v) => acc + v, 0);
    const weeklyTotalTransactions = chartTransactions.reduce((acc, v) => acc + v, 0);

    return {
      metrics,
      lowStockProducts,
      topProducts,
      activeShifts,
      recentTransactions,
      chart: {
        labels: chartLabels,
        revenue: chartRevenue,
        transactions: chartTransactions,
        weeklyTotalRevenue,
        weeklyTotalTransactions,
      },
    };
  }
}

module.exports = new DashboardService();
