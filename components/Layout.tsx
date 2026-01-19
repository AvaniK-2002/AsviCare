
import React from 'react';
import { LayoutDashboard, Users, Receipt, PieChart, UserCircle, Stethoscope, LogOut, Trash2, Calendar } from 'lucide-react';
import { DoctorMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mode: DoctorMode;
  toggleMode: () => void;
  onLogout: () => void;
  onReset: () => void;
  specialization?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, mode, toggleMode, onLogout, onReset, specialization }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'expenses', label: 'Expense', icon: Receipt },
    { id: 'reports', label: 'Reports', icon: PieChart },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20">
      {/* Top Header */}
      <header className={`sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-white to-slate-50 border-b shadow-sm`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${mode === 'GP' ? 'bg-indigo-600' : 'bg-rose-500'} text-white`}>
            <Stethoscope size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AsviCare</h1>
        </div>

        <div className="flex items-center gap-2">
          {!specialization && (
            <button
              onClick={toggleMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                mode === 'GP'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {mode === 'GP' ? 'General Physician' : 'Gynecologist'}
            </button>
          )}

          <button
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Reset All Data"
          >
            <Trash2 size={20} />
          </button>

          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 animate-in fade-in duration-300">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex justify-around items-center px-2 py-2 safe-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
              activeTab === item.id 
              ? (mode === 'GP' ? 'text-indigo-600' : 'text-rose-500') 
              : 'text-slate-400'
            }`}
          >
            <item.icon size={22} fill={activeTab === item.id ? 'currentColor' : 'none'} fillOpacity={0.1} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
