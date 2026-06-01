import React from 'react';

import {
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import ScenarioSelectorPage from './pages/ScenarioSelectorPage';

import DesktopEnvironment from './components/DesktopEnvironment';

import ScoreScreen from './components/ScoreScreen';
import { CursorGlow } from './components/CursorGlow';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const location = useLocation();
  const isIncidentSpace = location.pathname === '/command';

  return (

    <div className="min-h-screen bg-[#0b0f14] text-slate-100">
      {!isIncidentSpace && <CursorGlow />}

      <ErrorBoundary>
        <Routes>

          <Route
            path="/"
            element={<LandingPage />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/roles"
            element={<RoleSelectionPage />}
          />

          <Route
            path="/scenarios"
            element={<ScenarioSelectorPage />}
          />

          <Route
            path="/command"
            element={<DesktopEnvironment />}
          />

          <Route
            path="/debrief"
            element={<ScoreScreen />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </ErrorBoundary>

    </div>
  );
}