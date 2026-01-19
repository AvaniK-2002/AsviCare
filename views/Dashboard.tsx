
import React, { useMemo, useState, useEffect, useCallback } from 'react';
// Added Receipt to the lucide-react imports
import { Plus, TrendingUp, Users, Wallet, Calendar, Receipt, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import { format, isToday, startOfMonth } from 'date-fns';
import { DoctorMode } from '../types';
import { useAuth } from '../components/AuthProvider';

interface DashboardProps {
  mode: DoctorMode;
  stats: any;
  recentPatients: any[];
  recentActivity: any[];
  onAddPatient: () => void;
  onAddExpense: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ mode, stats, recentPatients, recentActivity, onAddPatient, onAddExpense }) => {
  const { userId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteVisit = async (id: string) => {
    if (confirm('Delete this visit record?') && userId) {
      await db.deleteVisit(id, userId);
      // Stats will update via subscription in App.tsx
    }
  };

  if (authLoading || !userId) {
    return <div className="flex justify-center items-center h-64"><div>Loading...</div></div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div>Loading...</div></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  const StatCard = ({ title, value, icon: Icon, colorClass, isCurrency = true }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-xl font-bold mt-1 text-slate-800">{isCurrency ? `₹${value.toLocaleString()}` : value.toLocaleString()}</h3>
      </div>
      <div className={`p-2 rounded-xl ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Hello, Doctor</h2>
        <p className="text-slate-500 text-sm">{format(new Date(), 'EEEE, do MMMM')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Today Income"
          value={stats.todayIncome}
          icon={TrendingUp}
          colorClass="bg-green-50 text-green-600"
        />
        <StatCard
          title="Patients Today"
          value={stats.visitsToday}
          icon={Users}
          colorClass="bg-blue-50 text-blue-600"
          isCurrency={false}
        />
        <StatCard
          title="Monthly Income"
          value={stats.monthlyIncome}
          icon={Calendar}
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Monthly Expenses"
          value={stats.monthlyExpenses}
          icon={Receipt}
          colorClass="bg-red-50 text-red-600"
        />
        <StatCard
          title="Profit (Mtd)"
          value={stats.profit}
          icon={Wallet}
          colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          title="Total Patients"
          value={stats.patientCount}
          icon={Users}
          colorClass="bg-teal-50 text-teal-600"
          isCurrency={false}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onAddPatient}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all active:scale-95 ${
              mode === 'GP' ? 'border-indigo-100 bg-indigo-50/30 text-indigo-600 hover:bg-indigo-50' : 'border-rose-100 bg-rose-50/30 text-rose-600 hover:bg-rose-50'
            }`}
          >
            <div className={`p-3 rounded-full ${mode === 'GP' ? 'bg-indigo-600' : 'bg-rose-500'} text-white`}>
              <Plus size={24} />
            </div>
            <span className="font-semibold text-sm">New Patient</span>
          </button>
          
          <button 
            onClick={onAddExpense}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
          >
            <div className="p-3 rounded-full bg-slate-600 text-white">
              <Receipt size={24} />
            </div>
            <span className="font-semibold text-sm">Add Expense</span>
          </button>
        </div>
      </div>

      {recentActivity.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 px-1">Recent Visits</h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y overflow-hidden">
            {recentActivity.slice(0, 3).map(visit => (
              <div key={visit.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{visit.patients?.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{format(new Date(visit.created_at), 'hh:mm a')} • {visit.doctortype}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="font-bold text-slate-900">₹{visit.fee}</p>
                  <button
                    onClick={() => handleDeleteVisit(visit.id)}
                    className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentPatients.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 px-1">Recent Patients</h3>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y overflow-hidden">
            {recentPatients.map(patient => (
              <div key={patient.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    patient.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{patient.name}</p>
                    <p className="text-xs text-slate-500">{patient.phone} • {patient.age} yrs</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
