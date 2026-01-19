
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, History, Calendar, FileText, Camera, Baby, Trash2, X, Edit2, Check, X as XIcon } from 'lucide-react';
import { db } from '../services/db';
import { Patient, Visit, DoctorMode } from '../types';
import { format, addDays, differenceInWeeks } from 'date-fns';
import { FEE_PRESETS } from '../constants';
import { VisitSchema, VisitFormData } from '../validations';
import { useAuth } from '../components/AuthProvider';

interface PatientProfileProps {
  patient: Patient;
  mode: DoctorMode;
  visits: Visit[];
  onBack: () => void;
  onUpdatePatient: (patient: Patient) => void;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ patient, mode, visits, onBack, onUpdatePatient }) => {
  const { userId, loading: authLoading } = useAuth();
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitMode, setVisitMode] = useState<'quick' | 'photo'>('quick');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    fee: 200,
    note: '',
    doctortype: mode
  });
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [editForm, setEditForm] = useState({
    name: patient.name,
    phone: patient.phone,
    age: patient.age,
    gender: patient.gender
  });
  const [historyForm, setHistoryForm] = useState({
    address: patient.address || '',
    allergies: patient.allergies || '',
    bloodgroup: patient.bloodgroup || '',
    notes: patient.notes || ''
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [visitFormErrors, setVisitFormErrors] = useState<Record<string, string>>({});
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [previewImageError, setPreviewImageError] = useState(false);

  const calculateEDD = (lmp: string) => {
    if (!lmp) return null;
    return format(addDays(new Date(lmp), 280), 'yyyy-MM-dd');
  };

  const calculateGestation = (lmp: string) => {
    if (!lmp) return null;
    const weeks = differenceInWeeks(new Date(), new Date(lmp));
    return weeks >= 0 ? weeks : 0;
  };

  const edd = patient.lmpDate ? calculateEDD(patient.lmpDate) : null;
  const gestation = patient.lmpDate ? calculateGestation(patient.lmpDate) : null;

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreviewUrl(e.target?.result as string);
        console.log('Photo preview URL set');
      };
      reader.onerror = () => {
        alert('Failed to read the image file. Please try again.');
        console.error('FileReader error');
      };
      reader.readAsDataURL(file);
      console.log('Photo file set:', file.name);
    }
  };

  const handleSaveVisit = async () => {
    console.log('Save button clicked');
    console.log('userId:', userId);
    console.log('visitMode:', visitMode, 'photoFile exists:', !!photoFile);
    setErrorMessage(null);
    setVisitFormErrors({});

    // Manual validation for mode-specific
    if (visitMode === 'quick' && !newVisit.note?.trim()) {
      console.log('Validation failed: Clinical notes required for quick visit');
      setErrorMessage('Clinical notes are required for quick visits');
      return;
    }
    if (visitMode === 'photo' && !photoFile) {
      console.log('Validation failed: No photo file selected');
      setErrorMessage('Please select a prescription image');
      return;
    }

    if (!userId) {
      console.log('userId is null, cannot proceed');
      return;
    }

    setIsSaving(true);
    try {
      let photo_url: string | undefined = undefined;
      console.log('Checking if upload needed...');
      if (visitMode === 'photo' && photoFile) {
        console.log('Starting upload process for photo file:', photoFile.name);
        const uploadStartTime = Date.now();
        photo_url = await db.uploadPrescriptionImage(photoFile, patient.id, userId);
        console.log('Upload completed in', Date.now() - uploadStartTime, 'ms, received URL:', photo_url);
      } else {
        console.log('No upload needed (quick visit or no file)');
      }

      // Zod validation after upload
      const visitData = {
        visitMode,
        patient_id: patient.id,
        doctortype: mode,
        note: newVisit.note?.trim() || undefined,
        fee: newVisit.fee || undefined,
        nextVisit: newVisit.nextVisit || undefined,
        photo_url: photo_url,
      };
      console.log('Visit data photo_url:', photo_url);

      const result = VisitSchema.safeParse(visitData);
      if (!result.success) {
        console.log('Zod validation failed:', result.error.issues);
        const errors: Record<string, string> = {};
        result.error.issues.forEach(issue => {
          errors[issue.path[0] as string] = issue.message;
        });
        setVisitFormErrors(errors);
        return;
      }

      console.log('Validation passed, preparing visit data for database save');
      const visit = {
        patient_id: patient.id,
        doctortype: mode,
        note: (newVisit.note || '').trim(),
        fee: newVisit.fee || 0,
        nextVisit: newVisit.nextVisit,
        photo_url: photo_url
      };
      console.log('Saving visit to database...');
      await db.addVisit(visit, userId);
      console.log('Visit saved successfully');
      setShowAddVisit(false);
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      setNewVisit({ fee: 200, note: '', doctortype: mode });
      setVisitMode('quick');
    } catch (error: any) {
      console.error('Error occurred during save process:', error);
      const errorMsg = error.message || 'Failed to save visit';
      setErrorMessage(errorMsg);
      alert('Error: ' + errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVisit = async (id: string) => {
    if (confirm('Delete this visit record?') && userId) {
      await db.deleteVisit(id, userId);
      // Visits will update via subscription in App.tsx
    }
  };

  const updateGynaeData = (field: keyof Patient, value: any) => {
    onUpdatePatient({ ...patient, [field]: value });
  };

  const handleSavePatientEdit = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) return;
    await onUpdatePatient({ ...patient, ...editForm });
    setIsEditingPatient(false);
  };

  const handleCancelPatientEdit = () => {
    setEditForm({
      name: patient.name,
      phone: patient.phone,
      age: patient.age,
      gender: patient.gender
    });
    setIsEditingPatient(false);
  };

  const handleSaveHistoryEdit = async () => {
    await onUpdatePatient({ ...patient, ...historyForm });
    setIsEditingHistory(false);
  };

  const handleCancelHistoryEdit = () => {
    setHistoryForm({
      address: patient.address || '',
      allergies: patient.allergies || '',
      bloodgroup: patient.bloodgroup || '',
      notes: patient.notes || ''
    });
    setIsEditingHistory(false);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft size={24} />
        </button>
        {patient.photo_url ? (
          <img src={patient.photo_url} alt="Patient" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" onError={(e) => console.error('Patient image failed to load:', patient.photo_url)} />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-slate-200 ${
            patient.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {patient.name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          {isEditingPatient ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-lg font-bold"
                placeholder="Patient name"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                  placeholder="Phone"
                />
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({...editForm, age: parseInt(e.target.value) || 0})}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                  placeholder="Age"
                />
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({...editForm, gender: e.target.value as any})}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSavePatientEdit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check size={16} />
                </button>
                <button onClick={handleCancelPatientEdit} className="p-1 text-red-600 hover:bg-red-50 rounded">
                  <XIcon size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
                <button onClick={() => setIsEditingPatient(true)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <Edit2 size={16} />
                </button>
              </div>
              <p className="text-xs text-slate-500">{patient.phone} • {patient.age}y • {patient.gender}</p>
            </div>
          )}
        </div>
      </div>

      {/* Gynae Quick Info */}
      {mode === 'GYNO' && patient.gender === 'Female' && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm uppercase tracking-wider">
            <Baby size={18} />
            <span>Obstetric History</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-rose-600 font-bold uppercase mb-1">LMP Date</label>
              <input 
                type="date" 
                value={patient.lmpDate || ''}
                onChange={(e) => updateGynaeData('lmpDate', e.target.value)}
                className="w-full bg-white border border-rose-200 rounded-lg px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] text-rose-600 font-bold uppercase mb-1">EDD & Gestation</label>
              <div className="px-2 py-1.5 bg-white border border-rose-200 rounded-lg text-sm text-slate-800 min-h-[34px] flex flex-col">
                <span className="font-bold">{edd ? format(new Date(edd), 'dd MMM yyyy') : '--'}</span>
                {gestation !== null && <span className="text-[10px] text-rose-500 font-bold">{gestation} Weeks Gestation</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600">G</span>
                <input 
                  type="number" 
                  value={patient.gravida || 0}
                  onChange={(e) => updateGynaeData('gravida', parseInt(e.target.value))}
                  className="w-12 bg-white border border-rose-200 rounded-lg px-2 py-1 text-sm text-center"
                />
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600">P</span>
                <input 
                  type="number" 
                  value={patient.para || 0}
                  onChange={(e) => updateGynaeData('para', parseInt(e.target.value))}
                  className="w-12 bg-white border border-rose-200 rounded-lg px-2 py-1 text-sm text-center"
                />
             </div>
          </div>
        </div>
      )}

      {/* Patient Medical History */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase tracking-wider">
            <History size={18} />
            <span>Medical History</span>
          </div>
          {!isEditingHistory && (
            <button onClick={() => setIsEditingHistory(true)} className="p-1 text-blue-400 hover:text-blue-600 rounded">
              <Edit2 size={16} />
            </button>
          )}
        </div>
        {isEditingHistory ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Address</label>
              <input
                type="text"
                value={historyForm.address}
                onChange={(e) => setHistoryForm({...historyForm, address: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm"
                placeholder="Patient address"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Allergies</label>
              <input
                type="text"
                value={historyForm.allergies}
                onChange={(e) => setHistoryForm({...historyForm, allergies: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm"
                placeholder="Known allergies"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Blood Group</label>
              <select
                value={historyForm.bloodgroup}
                onChange={(e) => setHistoryForm({...historyForm, bloodgroup: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm"
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Notes</label>
              <textarea
                value={historyForm.notes}
                onChange={(e) => setHistoryForm({...historyForm, notes: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm min-h-[80px]"
                placeholder="Additional medical notes"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveHistoryEdit} className="p-2 text-green-600 hover:bg-green-50 rounded">
                <Check size={16} />
              </button>
              <button onClick={handleCancelHistoryEdit} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <XIcon size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Address</span>
                <p className="text-sm text-slate-700 mt-1">{patient.address || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Blood Group</span>
                <p className="text-sm text-slate-700 mt-1">{patient.bloodgroup || 'Not specified'}</p>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase">Allergies</span>
              <p className="text-sm text-slate-700 mt-1">{patient.allergies || 'None specified'}</p>
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase">Notes</span>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{patient.notes || 'No additional notes'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Visit Section */}
      {!showAddVisit ? (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-800 px-1">New Visit</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setVisitMode('quick'); setShowAddVisit(true); }}
              className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${
                mode === 'GP' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-rose-500 text-white shadow-rose-200'
              }`}
            >
              <FileText size={20} />
              <span>Quick Visit</span>
            </button>
            <button
              onClick={() => { setVisitMode('photo'); setShowAddVisit(true); }}
              className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 border-2 ${
                mode === 'GP' ? 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <Camera size={20} />
              <span>Photo Visit</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-4 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-slate-800">{visitMode === 'quick' ? 'Quick Visit' : 'Photo Visit'}</h3>
              <p className="text-xs text-slate-500">{visitMode === 'quick' ? 'Record consultation notes' : 'Upload prescription image'}</p>
            </div>
            <button onClick={() => setShowAddVisit(false)} className="text-xs text-slate-400 font-semibold p-1">Cancel</button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Consultation Fee{visitMode === 'quick' ? ' *' : ''}</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {FEE_PRESETS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setNewVisit({...newVisit, fee: f})}
                  className={`px-4 py-2 rounded-xl border font-bold text-sm whitespace-nowrap transition-all ${
                    newVisit.fee === f
                    ? (mode === 'GP' ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-rose-500 border-rose-500 text-white')
                    : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  ₹{f}
                </button>
              ))}
              <input
                type="number"
                placeholder="Custom"
                className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
                value={newVisit.fee || ''}
                onChange={(e) => setNewVisit({...newVisit, fee: parseInt(e.target.value) || 0})}
                required={visitMode === 'quick'}
              />
            </div>
          </div>

          {visitMode === 'quick' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clinical Notes *</label>
              <textarea
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:outline-none min-h-[100px]"
                placeholder="Diagnosis, prescription, observations..."
                value={newVisit.note}
                onChange={(e) => setNewVisit({...newVisit, note: e.target.value})}
                required
              />
            </div>
          )}

          {visitMode === 'photo' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prescription Image *</label>
                {!photoPreviewUrl ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoCapture}
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Camera size={32} />
                      <span className="text-sm font-medium">Tap to capture prescription</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative inline-block">
                    <img src={photoPreviewUrl} alt="Prescription" className="w-full h-48 rounded-xl border border-slate-200 object-cover" />
                    <button
                      onClick={() => { setPhotoFile(null); setPhotoPreviewUrl(null); }}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Clinical Notes (Optional)</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:outline-none min-h-[80px]"
                  placeholder="Diagnosis, prescription, observations..."
                  value={newVisit.note}
                  onChange={(e) => setNewVisit({...newVisit, note: e.target.value})}
                />
              </div>
            </>
          )}

          <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Follow up Date (Optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="date"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm"
                    value={newVisit.nextVisit || ''}
                    onChange={(e) => setNewVisit({...newVisit, nextVisit: e.target.value})}
                  />
                </div>
             </div>
             <div className="flex flex-col">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 opacity-0">Camera</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 h-10 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors"
                >
                  <Camera size={20} />
                </button>
             </div>
          </div>

          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          {visitFormErrors.fee && <p className="text-red-500 text-sm">{visitFormErrors.fee}</p>}
          {visitFormErrors.note && <p className="text-red-500 text-sm">{visitFormErrors.note}</p>}
          <button
            onClick={handleSaveVisit}
            disabled={isSaving}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'GP' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-500 shadow-rose-100'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Visit Record'}
          </button>
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <History size={18} className="text-slate-400" />
          <h3 className="font-bold text-slate-800">Visit History</h3>
        </div>

        <div className="space-y-4">
          {visits.length > 0 ? (
            visits.map(visit => {
              console.log('Full visit object:', visit);
              console.log('visit.photo_url:', visit.photo_url);
              const formattedDate = visit.created_at ? format(new Date(visit.created_at), 'dd MMM yyyy, hh:mm a') : 'Invalid date';
              return (
                <div key={visit.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-3 relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${visit.doctortype === 'GP' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                        {visit.doctortype}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{formattedDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-900 text-lg">₹{visit.fee}</div>
                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {visit.note && (
                    <div className="bg-slate-50 p-3 rounded-xl flex gap-3 items-start">
                      <FileText size={14} className="text-slate-400 mt-0.5" />
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{visit.note}</p>
                    </div>
                  )}

                  {visit.photo_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setPreviewImage(visit.photo_url); setPreviewImageError(false); }}>
                      {imageLoadErrors.has(visit.photo_url) ? (
                        <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                          <Camera size={24} />
                          <span className="ml-2 text-sm">Image failed to load</span>
                        </div>
                      ) : (
                        <img src={visit.photo_url} alt="Prescription" className="w-full h-auto max-h-60 object-contain bg-slate-100" onError={() => { console.error('Image load error for URL:', visit.photo_url); setImageLoadErrors(prev => new Set(prev).add(visit.photo_url!)); }} />
                      )}
                    </div>
                  )}

                  {visit.nextVisit && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                      <Calendar size={12} />
                      <span>Follow up: {format(new Date(visit.nextVisit), 'dd MMM yyyy')}</span>
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
          {previewImageError ? (
            <div className="bg-white p-8 rounded-lg text-center">
              <Camera size={48} className="text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Image failed to load</p>
            </div>
          ) : (
            <img src={previewImage} alt="Prescription Preview" className="max-w-full max-h-full object-contain" onError={() => setPreviewImageError(true)} />
          )}
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

export default PatientProfile;


