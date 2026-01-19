
import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Added Users to the lucide-react imports
import { Search, Plus, Phone, ArrowRight, Baby, Users, Edit2, Trash2 } from 'lucide-react';
import { db } from '../services/db';
import { Patient, DoctorMode } from '../types';
import { useAuth } from '../components/AuthProvider';

interface PatientListProps {
  mode: DoctorMode;
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onAddPatient: () => void;
  onEditPatient: (patient: Patient) => void;
  onDeletePatient: (patient: Patient) => void;
}

const PatientList: React.FC<PatientListProps> = ({ mode, patients, onSelectPatient, onAddPatient, onEditPatient, onDeletePatient }) => {
  const { userId, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const patientsPerPage = 20;

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredPatients = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase();
    return patients.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.phone.includes(term)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [patients, debouncedSearchTerm]);

  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * patientsPerPage;
    return filteredPatients.slice(startIndex, startIndex + patientsPerPage);
  }, [filteredPatients, currentPage]);

  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Patients</h2>
        <button 
          onClick={onAddPatient}
          className={`p-2 rounded-full text-white shadow-lg active:scale-90 transition-transform ${mode === 'GP' ? 'bg-indigo-600' : 'bg-rose-500'}`}
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Search name or phone..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-shadow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {authLoading || !userId ? (
          <div className="py-20 text-center">
            <div className="inline-block p-4 bg-slate-100 rounded-full text-slate-400 animate-pulse">
              <Users size={32} />
            </div>
            <p className="text-slate-500 font-medium mt-2">Loading...</p>
          </div>
        ) : paginatedPatients.length > 0 ? (
          paginatedPatients.map(patient => (
            <div
              key={patient.id}
              className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-colors"
            >
              <button
                onClick={() => onSelectPatient(patient)}
                className="flex items-center gap-4 flex-1 text-left"
              >
                {patient.photo_url ? (
                  <img src={patient.photo_url} alt={patient.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-200" />
                ) : (
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                    patient.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {patient.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    {patient.name}
                    {patient.gender === 'Female' && patient.gravida !== undefined && (
                      <Baby size={14} className="text-rose-400" />
                    )}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Phone size={12} /> {patient.phone}</span>
                    <span>• {patient.age} yrs</span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEditPatient(patient)}
                  className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeletePatient(patient)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block p-4 bg-slate-100 rounded-full text-slate-400">
              <Users size={32} />
            </div>
            <p className="text-slate-500 font-medium">No patients found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-indigo-600 text-sm font-semibold"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientList;
