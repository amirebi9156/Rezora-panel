
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Panels from './pages/Panels';
import Plans from './pages/Plans';
import Users from './pages/Users';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex h-screen bg-gray-900 text-gray-200">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/panels" element={<Panels />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
