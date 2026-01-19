
import React, { useMemo, useState, useEffect } from 'react';
import { PieChart as ChartIcon, TrendingUp, TrendingDown, DollarSign, Download, Filter, History, Camera, FileText, X, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { db } from '../services/db';
import { Visit, Expense, DoctorMode, Patient } from '../types';
import { format, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay, subMonths, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../components/AuthProvider';

interface ReportsProps {
  mode?: DoctorMode;
  patients: Patient[];
  visits: Visit[];
  expenses: Expense[];
}

const Reports: React.FC<ReportsProps> = ({ mode, patients, visits, expenses }) => {
  const { userId, loading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Filter data based on dateRange
  const filteredVisits = useMemo(() => {
    let filtered = visits.filter(v => v.created_at && v.fee != null);
    if (dateRange) {
      filtered = filtered.filter(v => v.created_at >= dateRange.start && v.created_at <= dateRange.end);
    }
    return filtered;
  }, [visits, dateRange]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses.filter(e => e.amount != null && e.date);
    if (dateRange) {
      filtered = filtered.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
    }
    return filtered;
  }, [expenses, dateRange]);

  const chartData = useMemo(() => {
    if (!filteredVisits.length) return [];
    const grouped: Record<string, { income: number; expense: number }> = {};
    filteredVisits.forEach(v => {
      if (!v.created_at) return;
      const dateObj = new Date(v.created_at);
      if (isNaN(dateObj.getTime())) return;
      const date = format(dateObj, 'dd');
      if (!grouped[date]) grouped[date] = { income: 0, expense: 0 };
      grouped[date].income += v.fee;
    });
    filteredExpenses.forEach(e => {
      if (!e.date) return;
      const dateObj = new Date(e.date);
      if (isNaN(dateObj.getTime())) return;
      const date = format(dateObj, 'dd');
      if (!grouped[date]) grouped[date] = { income: 0, expense: 0 };
      grouped[date].expense += e.amount;
    });
    return Object.entries(grouped).map(([date, { income, expense }]) => ({ date, income, expense }));
  }, [filteredVisits, filteredExpenses]);

  const stats = useMemo(() => {
    const totalIncome = filteredVisits.reduce((sum, v) => sum + v.fee, 0);
    const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const todaysIncome = filteredVisits.filter(v => v.created_at && v.created_at >= startOfToday).reduce((sum, v) => sum + v.fee, 0);
    const monthlyIncome = filteredVisits.filter(v => v.created_at && v.created_at >= startOfMonth).reduce((sum, v) => sum + v.fee, 0);
    const totalExpenses = totalExpense;
    const profit = totalIncome - totalExpense;
    const patientCountPerDay = Math.round(filteredVisits.length / 30); // approximate average visits per day over period

    return {
      todaysIncome,
      monthlyIncome,
      totalIncome,
      totalExpense,
      profit,
      patientCountPerDay
    };
  }, [filteredVisits, filteredExpenses]);

  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return Object.entries(categories).map(([category, amount]) => ({ category, amount }));
  }, [filteredExpenses]);

  const COLORS = ['#6366f1', '#f43f5e', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Income', 'Expense'],
      ...chartData.map(d => [d.date, d.income, d.expense]),
      [],
      ['Category', 'Amount'],
      ...categoryData.map(c => [c.category, c.amount])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reports.csv';
    a.click();
  };

  if (authLoading || !userId) {
    return <div className="flex justify-center items-center h-64"><div>Loading...</div></div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div>Loading reports...</div></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Financial Insights</h2>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={16} />
            <span className="text-sm font-medium">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange?.start || ''}
            onChange={(e) => setDateRange(prev => ({ ...(prev || {}), start: e.target.value }))}
            className="px-3 py-1 border rounded"
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange?.end || ''}
            onChange={(e) => setDateRange(prev => ({ ...(prev || {}), end: e.target.value }))}
            className="px-3 py-1 border rounded"
          />
          <button
            onClick={() => setDateRange(undefined)}
            className="px-3 py-1 bg-slate-200 rounded text-sm"
          >
            Clear
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Today's Income</p>
          <h3 className="text-2xl font-bold mt-1 text-green-600">₹{stats.todaysIncome.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Monthly Income</p>
          <h3 className="text-2xl font-bold mt-1 text-green-600">₹{stats.monthlyIncome.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Expenses</p>
          <h3 className="text-2xl font-bold mt-1 text-rose-500">₹{stats.totalExpense.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Profit</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900">₹{stats.profit.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Avg Patients/Day</p>
          <h3 className="text-2xl font-bold mt-1 text-blue-600">{stats.patientCountPerDay}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <DollarSign size={80} className="text-slate-900" />
           </div>
           <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Overall Profit</p>
           <h3 className="text-4xl font-black mt-1 text-slate-900">₹{stats.profit.toLocaleString()}</h3>
           <div className="flex gap-4 mt-6">
              <div className="flex-1">
                 <p className="text-xs text-slate-400 font-bold uppercase">Income</p>
                 <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                   <TrendingUp size={16} /> ₹{stats.totalIncome.toLocaleString()}
                 </p>
              </div>
              <div className="flex-1">
                 <p className="text-xs text-slate-400 font-bold uppercase">Expense</p>
                 <p className="text-lg font-bold text-rose-500 flex items-center gap-1">
                   <TrendingDown size={16} /> ₹{stats.totalExpense.toLocaleString()}
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800">Monthly Revenue Flow</h3>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                cursor={{fill: '#f8fafc'}}
              />
              <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Expense Breakdown</h3>
          <div className="flex items-center">
            <div className="h-[150px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2">
               {categoryData.map((entry, index) => (
                 <div key={entry.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}} />
                       <span className="text-[10px] font-bold text-slate-600 truncate max-w-[80px]">{entry.category}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-900">₹{entry.amount}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visit History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <History size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-800">Visit History</h3>
        </div>

        <div className="space-y-4">
          {visits.length > 0 ? (
            visits.map(visit => {
              const patient = patients.find(p => p.id === visit.patient_id);
              return (
                <div key={visit.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-3 relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          visit.doctortype === 'GP' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {visit.doctortype}
                        </span>
                        {patient && <span className="text-sm font-semibold text-slate-800">{patient.name}</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(visit.created_at), 'do MMM yyyy • hh:mm a')}</p>
                    </div>
                    <div className="font-bold text-slate-900 text-lg">₹{visit.fee}</div>
                  </div>

                  {visit.note && (
                    <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-start">
                      <FileText size={14} className="text-slate-400 mt-0.5" />
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{visit.note}</p>
                    </div>
                  )}

                  {visit.photo_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPreviewImage(visit.photo_url!)}>
                      <img src={visit.photo_url} alt="Prescription" className="w-full h-auto max-h-60 object-contain bg-slate-100" />
                    </div>
                  )}

                  {visit.nextVisit && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                      <Calendar size={12} />
                      <span>Follow up: {format(new Date(visit.nextVisit), 'do MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
              <History size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm font-medium">No medical records yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Prescription Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Prescription Preview" className="max-w-full max-h-full object-contain" />
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70 transition-opacity"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Reports;
