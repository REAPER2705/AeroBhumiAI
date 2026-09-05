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
  Sun,
  Moon
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Parcels from './pages/Parcels';
import NewAudit from './pages/NewAudit';
import Reports from './pages/Reports';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [initialAuditStep, setInitialAuditStep] = useState<string>('select');
  const [darkMode, setDarkMode] = useState<boolean>(false);

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
      default:
        return <Dashboard setActiveTab={handleTabChange} />;
    }
  };

  return (
    <div className={`flex h-screen font-sans transition-colors duration-200 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`w-64 border-r flex flex-col justify-between flex-shrink-0 transition-colors duration-200 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-green-600" />
              <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>AeroBhumi<span className="text-green-600">AI</span></span>
            </div>
          </div>

          <nav className="mt-2 flex flex-col gap-1 px-3">
            {[
              { name: 'Dashboard', icon: LayoutDashboard },
              { name: 'Parcels', icon: MapPin },
              { name: 'Drone Upload', icon: UploadCloud },
              { name: 'Audit Map', icon: MapIcon },
              { name: 'My Audits', icon: FileCheck },
              { name: 'Reports', icon: FileText }
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => handleTabChange(item.name)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.name 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : darkMode
                    ? 'text-gray-300 hover:bg-gray-800 hover:text-green-400'
                    : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className={`p-4 border-t transition-colors duration-200 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Demo User</p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Administrator</p>
              </div>
            </div>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors border ${
                darkMode 
                  ? 'bg-gray-800 text-amber-400 border-gray-700 hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className={`flex-1 overflow-auto transition-colors duration-200 ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        {renderContent()}
      </div>
    </div>
  );
}
