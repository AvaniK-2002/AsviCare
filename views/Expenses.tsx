
import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Calendar, Tag, FileText, Trash2, Edit2 } from 'lucide-react';
import { db } from '../services/db';
import { Expense, DoctorMode } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { ExpenseSchema, ExpenseFormData } from '../validations';
import { format } from 'date-fns';
import { useAuth } from '../components/AuthProvider';

interface ExpensesProps {
  mode?: DoctorMode;
  expenses: Expense[];
  onRefreshExpenses: () => Promise<void>;
}

const Expenses: React.FC<ExpensesProps> = ({ mode, expenses, onRefreshExpenses }) => {
  const { userId, loading: authLoading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0,
    category: 'Other',
    note: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    setError(null);
    setFormErrors({});

    // Zod validation
    const expenseData = {
      amount: newExpense.amount || 0,
      category: newExpense.category || '',
      note: newExpense.note || '',
      date: newExpense.date || '',
      doctortype: mode || 'GP',
    };

    const result = ExpenseSchema.safeParse(expenseData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    // Additional validation for date not in future
    const expenseDate = new Date(newExpense.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (expenseDate > today) {
      setError('Expense date cannot be in the future.');
      return;
    }

    if (!userId) return;
    setLoading(true);
    try {
      if (editingExpense) {
        await db.updateExpense(editingExpense.id, {
          amount: newExpense.amount,
          category: newExpense.category,
          note: newExpense.note || '',
          date: newExpense.date
        }, userId);
      } else {
        await db.createExpense({
          amount: newExpense.amount,
          category: newExpense.category,
          note: newExpense.note || '',
          date: newExpense.date,
          doctortype: mode || 'GP'
        }, userId);
      }
      await onRefreshExpenses();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewExpense({ amount: 0, category: 'Other', note: '', date: new Date().toISOString().split('T')[0] });
    setEditingExpense(null);
    setError(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      amount: expense.amount,
      category: expense.category,
      note: expense.note,
      date: expense.date
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?') || !userId) return;
    setError(null);
    try {
      await db.deleteExpense(id, userId);
      await onRefreshExpenses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense');
    }
  };

  const filteredExpenses = selectedCategory === 'All' ? expenses : expenses.filter(exp => exp.category === selectedCategory);

  const handleCancel = () => {
    setShowForm(false);
    resetForm();
  };

  if (authLoading || !userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Expenses</h2>
        <button
          onClick={() => setShowForm(true)}
          className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-200 active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-bold text-slate-500">Filter by Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-slate-400/10 focus:outline-none"
        >
          <option value="All">All</option>
          {EXPENSE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{editingExpense ? 'Edit Expense' : 'Add Clinic Expense'}</h3>
            <button onClick={handleCancel} className="text-xs text-slate-400 font-bold p-1">Cancel</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount (₹)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-slate-400/10 focus:outline-none"
                placeholder="0.00"
                value={newExpense.amount || ''}
                onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
              <select 
                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-slate-400/10 focus:outline-none appearance-none"
                value={newExpense.category}
                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Date</label>
            <input 
              type="date"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold"
              value={newExpense.date}
              onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Note (Optional)</label>
            <input 
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium"
              placeholder="Supplier name, bill no..."
              value={newExpense.note}
              onChange={(e) => setNewExpense({...newExpense, note: e.target.value})}
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-4 bg-slate-900 rounded-2xl font-bold text-white transition-all active:scale-95 shadow-xl shadow-slate-100 disabled:opacity-50"
          >
{loading ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Log Expense')}
          </button>
          {error && <p className="text-rose-500 text-sm font-bold">{error}</p>}
        </div>
      )}

      <div className="space-y-3">
        {filteredExpenses.length > 0 ? (
          filteredExpenses.map(exp => (
            <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group transition-colors hover:bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-600 transition-colors">
                  <Receipt size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 leading-none mb-1">{exp.category}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {format(new Date(exp.date), 'dd MMM yyyy')}</span>
                    {exp.note && <span>• {exp.note}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-rose-500 text-lg">-₹{exp.amount}</p>
                </div>
                <button
                  onClick={() => handleDelete(exp.id)}
                  className="p-1.5 text-slate-200 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => handleEdit(exp)}
                  className="p-1.5 text-slate-200 hover:text-blue-400 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4">
            <div className="inline-block p-6 bg-slate-100 rounded-[2rem] text-slate-300">
              <Tag size={48} />
            </div>
            <div>
              <p className="text-slate-500 font-bold">No expenses logged</p>
              <p className="text-slate-400 text-xs mt-1">Keep track of your clinic overheads here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Expenses;
