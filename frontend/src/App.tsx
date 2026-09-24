import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  UploadCloud, 
  Map as MapIcon, 
  FileCheck, 
  FileText, 
  User, 
  Layers,
  Search
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Parcels from './pages/Parcels';
import NewAudit from './pages/NewAudit';
import Reports from './pages/Reports';
import CaseTracking from './pages/CaseTracking';
import GovernmentVerification from './pages/GovernmentVerification';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [initialAuditStep, setInitialAuditStep] = useState<string>('select');
  const [mode, setMode] = useState<'citizen' | 'government'>('citizen');

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
    if (tabName === 'Drone Upload') {
      setInitialAuditStep('select');
    } else if (tabName === 'Audit Map') {
      setInitialAuditStep('draw');
    } else if (tabName === 'My Audits' || tabName === 'New Audit') {
      setInitialAuditStep('analyze');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <Dashboard setActiveTab={handleTabChange} />;
      case 'Parcels':
        return <Parcels setActiveTab={handleTabChange} />;
      case 'Drone Upload':
      case 'Audit Map':
      case 'My Audits':
      case 'New Audit':
        return <NewAudit key={activeTab} setActiveTab={handleTabChange} initialStep={initialAuditStep} />;
      case 'Reports':
        return <Reports />;
      case 'Track Case':
        return <CaseTracking />;
      default:
        return <Dashboard setActiveTab={handleTabChange} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Mode Selector Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('citizen')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'citizen'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Citizen
              </button>
              <button
                onClick={() => setMode('government')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  mode === 'government'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Government
              </button>
            </div>
          </div>

          {/* Logo */}
          <div className="p-6 flex items-center gap-2">
            <Layers className="w-6 h-6 text-green-600" />
            <span className="text-xl font-bold">AeroBhumi<span className="text-green-600">AI</span></span>
          </div>

          {/* Navigation - Citizen Mode */}
          {mode === 'citizen' && (
            <nav className="mt-2 flex flex-col gap-1 px-3">
              {[
                { name: 'Dashboard', icon: LayoutDashboard },
                { name: 'Parcels', icon: MapPin },
                { name: 'Drone Upload', icon: UploadCloud },
                { name: 'Audit Map', icon: MapIcon },
                { name: 'My Audits', icon: FileCheck },
                { name: 'Reports', icon: FileText },
                { name: 'Track Case', icon: Search }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleTabChange(item.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.name 
                      ? 'bg-green-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </button>
              ))}
            </nav>
          )}

          {/* Navigation - Government Mode */}
          {mode === 'government' && (
            <nav className="mt-2 flex flex-col gap-1 px-3">
              <button
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-green-600 text-white shadow-sm"
              >
                <MapPin className="w-5 h-5" />
                Verification
              </button>
            </nav>
          )}
        </div>

        {/* User Profile - Citizen Mode Only */}
        {mode === 'citizen' && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Demo User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">
        {mode === 'government' ? (
          <GovernmentVerification />
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}
