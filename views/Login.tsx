import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { ShieldCheck } from 'lucide-react';

interface LoginProps {
  onSwitchToSignup: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<{email?: string, password?: string}>({});

  const validateForm = () => {
    const errors: {email?: string, password?: string} = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    try {
      const { error } = await login(email, password);
      if (error) {
        setError(error.message || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-block p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-200 mb-4">
            <ShieldCheck size={48} />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">ClinicTrack</h1>
          <p className="text-slate-500 font-medium">Smart Clinic Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 space-y-6 border border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Email ID</label>
              <input
                type="email"
                placeholder="demo@clinic.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In to Clinic'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Sign Up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;