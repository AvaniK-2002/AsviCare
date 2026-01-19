
import React, { useState, Suspense, lazy, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';

// Lazy load components for code splitting
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const PatientList = lazy(() => import('./views/PatientList'));
const PatientProfile = lazy(() => import('./views/PatientProfile'));
const Appointments = lazy(() => import('./views/Appointments'));
const Expenses = lazy(() => import('./views/Expenses'));
const Reports = lazy(() => import('./views/Reports'));
const Login = lazy(() => import('./views/Login'));
const Signup = lazy(() => import('./views/Signup'));
import { Patient, DoctorMode, Expense, Visit } from './types';
import { db } from './services/db';
import { UserCircle, ShieldCheck, LogOut, ChevronDown, ChevronUp, UserPlus, X } from 'lucide-react';
import { PatientSchema, PatientFormData } from './validations';
import toast, { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
  const { user, userId, profile, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctorMode, setDoctorMode] = useState<DoctorMode>('GP');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

   // Set doctorMode based on user profile specialization
   useEffect(() => {
     if (profile?.specialization) {
       const mode: DoctorMode = profile.specialization === 'Gynecologist' ? 'GYNO' : 'GP';
       setDoctorMode(mode);
     }
   }, [profile]);


  // Form states
  const [patientForm, setPatientForm] = useState<Partial<Patient>>({
    name: '',
    phone: '',
    age: 30,
    gender: 'Female',
    address: '',
    allergies: '',
    bloodgroup: '',
    notes: '',
    photo_url: '',
    lmpDate: '',
    gravida: undefined,
    para: undefined,
  });
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      setActiveTab('dashboard');
      setSelectedPatient(null);
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setPatients([]);
      setExpenses([]);
      setVisits([]);
    }
  };

  // Fetch all data on login
  useEffect(() => {
    if (!user || !userId) return;
    const fetchData = async () => {
      try {
        const [pats, exps, vists] = await Promise.all([
          db.getPatients(userId, doctorMode),
          db.getExpenses(userId, doctorMode),
          db.getVisits(userId, doctorMode)
        ]);
        setPatients(pats);
        setExpenses(exps);
        setVisits(vists);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, [user, userId, doctorMode]);

  // Compute dashboard stats
  const dashboardStats = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const todayIncome = visits.filter(v => v.created_at >= startOfToday).reduce((sum, v) => sum + (v.fee || 0), 0);
    const visitsToday = visits.filter(v => v.created_at >= startOfToday).length;
    const monthlyIncome = visits.filter(v => v.created_at >= startOfMonth).reduce((sum, v) => sum + (v.fee || 0), 0);
    const monthlyExpenses = expenses.filter(e => e.date >= startOfMonth).reduce((sum, e) => sum + e.amount, 0);
    const profit = monthlyIncome - monthlyExpenses;
    const patientCount = patients.length;

    return {
      todayIncome,
      visitsToday,
      monthlyIncome,
      monthlyExpenses,
      profit,
      patientCount
    };
  }, [visits, expenses, patients]);

  const refreshExpenses = async () => {
    if (!userId) return;
    try {
      const exps = await db.getExpenses(userId, doctorMode);
      setExpenses(exps);
    } catch (error) {
      console.error('Failed to refresh expenses:', error);
    }
  };

  const recentPatients = useMemo(() => patients.slice(-3), [patients]);
  const recentActivity = useMemo(() => visits.slice(-3), [visits]);

  const handleReset = async () => {
    const modeName = doctorMode === 'GP' ? 'General Physician' : 'Gynecologist';
    if (confirm(`Are you sure you want to reset ALL data for ${modeName} mode? This action cannot be undone and will delete all patients, visits, and expenses for this mode.`)) {
      await db.resetAllData(userId!, doctorMode);
      setActiveTab('dashboard');
      setSelectedPatient(null);
      setIsAddingPatient(false);
      setEditingPatient(null);
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      alert(`${modeName} data has been reset.`);
    }
  };

  const [patientFormErrors, setPatientFormErrors] = useState<Record<string, string>>({});

  const validatePatientForm = () => {
    // Prepare data for validation, including doctortype and cleaning optionals
    const dataToValidate = {
      ...patientForm,
      doctortype: doctorMode,
      photo_url: patientForm.photo_url || undefined,
      address: patientForm.address || undefined,
      allergies: patientForm.allergies || undefined,
      bloodgroup: patientForm.bloodgroup || undefined,
      notes: patientForm.notes || undefined,
      lmpDate: patientForm.lmpDate || undefined,
      gravida: patientForm.gravida,
      para: patientForm.para,
    };
    const result = PatientSchema.safeParse(dataToValidate);
    if (!result.success) {
      console.log('Validation failed, errors:', JSON.stringify(result.error.issues, null, 2));
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        errors[issue.path[0] as string] = issue.message;
      });
      setPatientFormErrors(errors);
      setGlobalError('Please fix the validation errors highlighted below.');
      return false;
    }
    setPatientFormErrors({});
    setGlobalError(null);
    return true;
  };

  const handleSavePatient = async () => {
    console.log('handleSavePatient called, userId:', userId, 'patientForm:', patientForm);
    if (!validatePatientForm()) {
      console.log('Validation failed, errors:', patientFormErrors);
      return;
    }
    console.log('Validation passed');

    let photo_url: string | undefined = editingPatient?.photo_url;
    if (photoFile) {
      try {
        console.log('Uploading photo...');
        photo_url = await db.uploadPatientImage(photoFile, editingPatient?.id || crypto.randomUUID(), userId!);
        console.log('Photo uploaded:', photo_url);
      } catch (error: any) {
        console.error('Failed to upload photo', error);
        toast.error('Failed to upload photo: ' + error.message);
        // Continue without photo
      }
    }

    const patientData: Omit<Patient, 'id' | 'clinic_id' | 'created_by' | 'user_id' | 'created_at'> = {
      name: patientForm.name,
      phone: patientForm.phone,
      age: patientForm.age,
      gender: patientForm.gender as any,
      doctortype: doctorMode,
      photo_url,
      address: patientForm.address || undefined,
      allergies: patientForm.allergies || undefined,
      bloodgroup: patientForm.bloodgroup || undefined,
      notes: patientForm.notes || undefined,
      lmpDate: patientForm.lmpDate || undefined,
      gravida: patientForm.gravida,
      para: patientForm.para,
    };

    try {
      console.log('Saving patient data to database...');
      if (editingPatient) {
        const updatedData = {
          ...patientData,
          id: editingPatient.id,
          clinic_id: editingPatient.clinic_id,
          created_by: editingPatient.created_by,
          user_id: editingPatient.user_id,
          created_at: editingPatient.created_at
        };
        await db.updatePatient(editingPatient.id, updatedData, userId!);
        setSelectedPatient(updatedData);
        toast.success('Patient updated successfully!');
      } else {
        const newPatient = await db.createPatient(patientData);
        setSelectedPatient(newPatient);
        toast.success('Patient added successfully!');
      }
      setIsAddingPatient(false);
      setEditingPatient(null);
      setPatientForm({
        name: '',
        phone: '',
        age: 30,
        gender: 'Female',
        address: '',
        allergies: '',
        bloodgroup: '',
        notes: '',
        photo_url: '',
        lmpDate: '',
        gravida: undefined,
        para: undefined,
      });
      setPhotoFile(null);
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
        setPhotoPreviewUrl(null);
      }
      setShowOptionalFields(false);
      console.log('Patient saved successfully');
    } catch (error: any) {
      console.error('Failed to save patient:', error);
      toast.error('Failed to save patient: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form onSubmit triggered');
    await handleSavePatient();
  };

  const updatePatient = async (updated: Patient) => {
    try {
      await db.updatePatient(updated.id, updated, userId!);
      setSelectedPatient(updated);
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success('Patient updated successfully!');
    } catch (error: any) {
      toast.error('Failed to update patient: ' + error.message);
    }
  };

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setPatientForm({
      name: patient.name,
      phone: patient.phone,
      age: patient.age,
      gender: patient.gender,
      address: patient.address || '',
      allergies: patient.allergies || '',
      bloodgroup: patient.bloodgroup || '',
      notes: patient.notes || '',
      photo_url: patient.photo_url || '',
      lmpDate: patient.lmpDate || '',
      gravida: patient.gravida,
      para: patient.para,
    });
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setShowOptionalFields(false);
  };

  const handleDeletePatient = async (patient: Patient) => {
    if (confirm(`Delete patient ${patient.name}? This will also delete all their visit records.`)) {
      await db.deletePatient(patient.id, userId!);
      if (selectedPatient?.id === patient.id) {
        setSelectedPatient(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ShieldCheck size={48} className="text-indigo-600 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <ShieldCheck size={48} className="text-indigo-600 animate-pulse" />
        </div>
      }>
        {isSignUp ? <Signup onSwitchToLogin={() => setIsSignUp(false)} /> : <Login onSwitchToSignup={() => setIsSignUp(true)} />}
      </Suspense>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <ShieldCheck size={48} className="text-indigo-600 animate-pulse" />
      </div>
    }>
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mode={doctorMode}
        toggleMode={() => setDoctorMode(prev => prev === 'GP' ? 'GYNO' : 'GP')}
        onLogout={handleLogout}
        onReset={handleReset}
        specialization={profile?.specialization}
      >
      {/* Tab Management Logic */}
      {selectedPatient ? (
        <PatientProfile
          patient={selectedPatient}
          mode={doctorMode}
          visits={visits.filter(v => v.patient_id === selectedPatient.id)}
          onBack={() => setSelectedPatient(null)}
          onUpdatePatient={updatePatient}
        />
      ) : isAddingPatient || editingPatient ? (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300 pb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">{editingPatient ? 'Edit Patient' : 'Add Patient'}</h2>
            <button onClick={() => { setIsAddingPatient(false); setEditingPatient(null); setPhotoFile(null); setPhotoPreviewUrl(null); if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); }} className="text-sm font-semibold text-slate-400 p-1">Cancel</button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Full Name</label>
              <input
                type="text"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                placeholder="Patient's legal name"
                value={patientForm.name}
                onChange={(e) => setPatientForm({...patientForm, name: e.target.value})}
              />
              {patientFormErrors.name && <p className="text-red-500 text-xs mt-1">{patientFormErrors.name}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Age</label>
                <input
                  type="number"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({...patientForm, age: parseInt(e.target.value) || 0})}
                />
                {patientFormErrors.age && <p className="text-red-500 text-xs mt-1">{patientFormErrors.age}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Gender</label>
                <select
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({...patientForm, gender: e.target.value as any})}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {patientFormErrors.gender && <p className="text-red-500 text-xs mt-1">{patientFormErrors.gender}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Phone Number</label>
              <input
                type="tel"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                placeholder="10-digit mobile"
                value={patientForm.phone}
                onChange={(e) => setPatientForm({...patientForm, phone: e.target.value})}
                required
              />
              {patientFormErrors.phone && <p className="text-red-500 text-xs mt-1">{patientFormErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreviewUrl(URL.createObjectURL(file));
                  }
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none"
              />
              {photoPreviewUrl && (
                <div className="relative inline-block mt-2">
                  <img src={photoPreviewUrl} alt="Preview" className="w-20 h-20 rounded-xl border border-slate-200 object-cover" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreviewUrl(null); }}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowOptionalFields(!showOptionalFields)}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Optional Details</span>
              {showOptionalFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showOptionalFields && (
              <div className="space-y-4 animate-in slide-in-from-top duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Address</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none"
                    placeholder="Patient's address"
                    value={patientForm.address}
                    onChange={(e) => setPatientForm({...patientForm, address: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Allergies</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none"
                    placeholder="Known allergies"
                    value={patientForm.allergies}
                    onChange={(e) => setPatientForm({...patientForm, allergies: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Blood Group</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none"
                    placeholder="e.g., O+, A-, B+"
                    value={patientForm.bloodgroup}
                    onChange={(e) => setPatientForm({...patientForm, bloodgroup: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide">Notes</label>
                  <textarea
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none min-h-[80px]"
                    placeholder="Additional notes"
                    value={patientForm.notes}
                    onChange={(e) => setPatientForm({...patientForm, notes: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-5 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 ${
                doctorMode === 'GP' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-500 shadow-rose-100'
              }`}
            >
              {editingPatient ? 'Update Patient' : 'Register & Continue'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <Dashboard
              mode={doctorMode}
              stats={dashboardStats}
              recentPatients={recentPatients}
              recentActivity={recentActivity}
              onAddPatient={() => setIsAddingPatient(true)}
              onAddExpense={() => setActiveTab('expenses')}
            />
          )}
          {activeTab === 'patients' && (
            <PatientList
              mode={doctorMode}
              patients={patients}
              onSelectPatient={setSelectedPatient}
              onAddPatient={() => setIsAddingPatient(true)}
              onEditPatient={handleEditPatient}
              onDeletePatient={handleDeletePatient}
            />
          )}
          {activeTab === 'appointments' && <Appointments mode={doctorMode} />}
          {activeTab === 'expenses' && <Expenses mode={doctorMode} expenses={expenses} onRefreshExpenses={refreshExpenses} />}
          {activeTab === 'reports' && <Reports mode={doctorMode} patients={patients} visits={visits} expenses={expenses} />}
        </>
      )}
      </Layout>
    </Suspense>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          theme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          theme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </AuthProvider>
);

export default App;
