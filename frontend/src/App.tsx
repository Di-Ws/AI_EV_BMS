import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import LiveMonitoringPage from '@/pages/LiveMonitoringPage';
import AlertsPage from '@/pages/AlertsPage';
import HistoryPage from '@/pages/HistoryPage';
import AboutPage from '@/pages/AboutPage';
import { getBatteryIds } from '@/services/batteryApi';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedBattery, setSelectedBattery] = useState('BAT-001');
  const [batteryIds, setBatteryIds] = useState<string[]>(['BAT-001', 'BAT-002', 'BAT-003']);

  useEffect(() => {
    getBatteryIds().then(setBatteryIds);
  }, []);

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={() => setIsAuthenticated(true)} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <Navigate to="/dashboard" replace />
            </DashboardLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <DashboardPage batteryId={selectedBattery} />
            </DashboardLayout>
          }
        />
        <Route
          path="/analytics"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <AnalyticsPage batteryId={selectedBattery} />
            </DashboardLayout>
          }
        />
        <Route
          path="/live"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <LiveMonitoringPage batteryId={selectedBattery} />
            </DashboardLayout>
          }
        />
        <Route
          path="/alerts"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <AlertsPage />
            </DashboardLayout>
          }
        />
        <Route
          path="/history"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <HistoryPage batteryId={selectedBattery} batteryIds={batteryIds} />
            </DashboardLayout>
          }
        />
        <Route
          path="/about"
          element={
            <DashboardLayout
              onLogout={() => setIsAuthenticated(false)}
              selectedBattery={selectedBattery}
              onBatteryChange={setSelectedBattery}
              batteryIds={batteryIds}
            >
              <AboutPage />
            </DashboardLayout>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
