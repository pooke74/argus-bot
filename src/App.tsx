
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MonitorPage from './pages/MonitorPage';
import StockDetailPage from './pages/StockDetailPage';
import TradingPage from './pages/TradingPage';
import AITradersPage from './pages/AITradersPage';
import CryptoAIPage from './pages/CryptoAIPage';
import AuthPage from './pages/AuthPage';
import AuthService from './services/AuthService';
import AutoScannerService from './services/AutoScannerService';
import MultiAIBrokerService from './services/MultiAIBrokerService';
import CryptoAIService from './services/CryptoAIService';
import FundamentalAnalysisPage from './pages/FundamentalAnalysisPage';
import TechnicalAnalysisPage from './pages/TechnicalAnalysisPage';
import NotificationPage from './pages/NotificationPage'; // RE-ENABLED

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = AuthService.isLoggedIn();

  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [, setForceUpdate] = useState(0);

  useEffect(() => {
    if (AuthService.isLoggedIn()) {
      const settings = AuthService.getSettings();
      if (settings.autoScanEnabled) {
        AutoScannerService.start();
        AutoScannerService.requestNotificationPermission();
      }
      console.log('🤖 Starting Multi-AI Traders...');
      MultiAIBrokerService.startAutonomous(3);
      console.log('₿ Starting Crypto AI...');
      CryptoAIService.start();
    }

    const unsubscribe = AutoScannerService.onScan(() => {
      setForceUpdate(n => n + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <MonitorPage />
          </ProtectedRoute>
        } />
        <Route path="/stock/:symbol" element={
          <ProtectedRoute>
            <StockDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/trading" element={
          <ProtectedRoute>
            <TradingPage />
          </ProtectedRoute>
        } />
        <Route path="/ai-traders" element={
          <ProtectedRoute>
            <AITradersPage />
          </ProtectedRoute>
        } />
        <Route path="/crypto-ai" element={
          <ProtectedRoute>
            <CryptoAIPage />
          </ProtectedRoute>
        } />
        <Route path="/fundamental-analysis" element={
          <ProtectedRoute>
            <FundamentalAnalysisPage />
          </ProtectedRoute>
        } />
        <Route path="/technical-analysis/:symbol?" element={
          <ProtectedRoute>
            <TechnicalAnalysisPage />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <NotificationPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
