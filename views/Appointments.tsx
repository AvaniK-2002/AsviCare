import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { db } from '../services/db';
import { Appointment, Patient, DoctorMode } from '../types';
import { useAuth } from '../components/AuthProvider';
import { useUserProfile } from '../components/UserProfileContext';
import { validateForm, AppointmentSchema } from '../validations';
import { format } from 'date-fns';
import {
  Plus,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  X,
  CheckCircle,
  CalendarDays,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const Appointments: React.FC<{ mode: DoctorMode }> = ({ mode }) => {
  const { userId } = useAuth();
  const { profile: userProfile } = useUserProfile();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [initialView, setInitialView] = useState('timeGridWeek');

  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    status: 'scheduled',
    notes: '',
    doctortype: mode
  });

  const CustomSelect = ({ options, value, onChange, placeholder, required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
      if (isOpen && buttonRef.current && listRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const listHeight = listRef.current.offsetHeight;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        if (spaceBelow >= listHeight || spaceBelow > spaceAbove) {
          listRef.current.style.top = '100%';
          listRef.current.style.bottom = 'auto';
        } else {
          listRef.current.style.top = 'auto';
          listRef.current.style.bottom = '100%';
        }
        listRef.current.style.left = '0';
        listRef.current.style.right = '0';
      }
    }, [isOpen]);

    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full border border-gray-300 rounded-lg p-3 text-left bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors flex items-center justify-between"
          required={required}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {options.find(o => o.value === value)?.label || placeholder}
          </span>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <ul
            ref={listRef}
            className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto w-full"
          >
            {options.map(option => (
              <li
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="p-3 hover:bg-gray-100 cursor-pointer text-gray-900"
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId, mode]);

  useEffect(() => {
    const updateView = () => {
      setInitialView(window.innerWidth < 768 ? 'dayGridMonth' : 'timeGridWeek');
    };
    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  const loadData = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const [appts, pats] = await Promise.all([
        db.getAppointments(userId, mode),
        db.getPatients(userId, mode)
      ]);
      setAppointments(appts);
      setPatients(pats);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) return;

    const formToSubmit = {
      ...formData,
      start_time: formData.start_date && formData.start_time ? `${formData.start_date}T${formData.start_time}` : '',
      end_time: formData.end_date && formData.end_time ? `${formData.end_date}T${formData.end_time}` : ''
    };

    const validation = validateForm(AppointmentSchema, formToSubmit);
    if (!validation.success) {
      toast.error(Object.values(validation.errors!).join(', '));
      return;
    }

    setSubmitting(true);
    try {
      if (editingAppointment) {
        await db.updateAppointment(editingAppointment.id, formToSubmit, userId, mode);
        toast.success('Appointment updated');
      } else {
        await db.createAppointment(formToSubmit, userId, { ...userProfile, doctortype: mode }, mode);
        toast.success('Appointment created');
      }

      setShowForm(false);
      setEditingAppointment(null);
      loadData();
    } catch {
      toast.error('Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!window.confirm('Delete this appointment?')) return;

    try {
      await db.deleteAppointment(id, userId, mode);
      toast.success('Deleted');
      loadData();
    } catch {
      toast.error('Delete failed');
    }
  };

  const events = appointments.map(a => ({
    id: a.id,
    title: patients.find(p => p.id === a.patient_id)?.name || 'Patient',
    start: a.start_time,
    end: a.end_time,
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
    textColor: '#ffffff'
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50">
        <p className="text-blue-500 font-medium">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white p-4 sm:p-6">

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 sm:p-8 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CalendarDays size={32} className="text-white" />
            <h1 className="text-2xl sm:text-3xl font-bold">Appointments</h1>
          </div>
          <p className="text-sm opacity-90">
            Manage and track all clinic appointments in one place
          </p>

          <button
            onClick={() => {
              setEditingAppointment(null);
              setFormData({
                patient_id: '',
                start_date: '',
                start_time: '',
                end_date: '',
                end_time: '',
                status: 'scheduled',
                notes: '',
                doctortype: mode
              });
              setShowForm(true);
            }}
            className="mt-6 inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 sm:px-6 sm:py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-all font-semibold"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>

        

        {/* VIEW TOGGLE */}
        <div className="flex justify-center">
          <div className="bg-white shadow-lg p-2 rounded-2xl flex gap-2 border border-gray-200">
            {[
              { key: 'calendar', label: 'Calendar', icon: CalendarDays },
              { key: 'list', label: 'List', icon: Users }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key as any)}
                className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl capitalize text-sm font-medium transition-all flex items-center gap-2 ${
                  view === key
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100">

          {view === 'calendar' ? (
            <>
              <style>{`
                .fc {
                  font-family: system-ui;
                }
                .fc-button {
                  background: #3b82f6 !important;
                  border: none !important;
                  border-radius: 10px !important;
                }
                .fc-day-today {
                  background: #eff6ff !important;
                }
              `}</style>

              <div className="overflow-x-auto">
                <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={initialView}
                events={events}
                height="auto"
                selectable
                editable
                select={(selectInfo) => {
                  setFormData({
                    patient_id: '',
                    start_date: selectInfo.startStr.split('T')[0],
                    start_time: selectInfo.startStr.split('T')[1].slice(0,5),
                    end_date: selectInfo.endStr.split('T')[0],
                    end_time: selectInfo.endStr.split('T')[1].slice(0,5),
                    status: 'scheduled',
                    notes: '',
                    doctortype: mode
                  });
                  setEditingAppointment(null);
                  setShowForm(true);
                }}
                eventClick={(clickInfo) => {
                  const id = clickInfo.event.id;
                  const a = appointments.find(app => app.id === id);
                  if (a) {
                    setEditingAppointment(a);
                    setFormData({
                      patient_id: a.patient_id,
                      start_date: a.start_time.split('T')[0],
                      start_time: a.start_time.split('T')[1].slice(0,5),
                      end_date: a.end_time.split('T')[0],
                      end_time: a.end_time.split('T')[1].slice(0,5),
                      status: a.status,
                      notes: a.notes || '',
                      doctortype: mode
                    });
                    setShowForm(true);
                  }
                }}
              />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No appointments scheduled</p>
                </div>
              ) : (
                appointments.map(a => (
                  <div
                    key={a.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="text-blue-600" size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {patients.find(p => p.id === a.patient_id)?.name || 'Unknown Patient'}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              a.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              a.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              {format(new Date(a.start_time), 'PPP')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              {format(new Date(a.start_time), 'p')} - {format(new Date(a.end_time), 'p')}
                            </div>
                          </div>
                          {a.notes && (
                            <p className="text-sm text-gray-500 mt-2">{a.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingAppointment(a);
                            setFormData({
                              patient_id: a.patient_id,
                              start_date: a.start_time.split('T')[0],
                              start_time: a.start_time.split('T')[1].slice(0,5),
                              end_date: a.end_time.split('T')[0],
                              end_time: a.end_time.split('T')[1].slice(0,5),
                              status: a.status,
                              notes: a.notes || '',
                              doctortype: mode
                            });
                            setShowForm(true);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(a.id)}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-x-hidden">
            <div className="p-6 border-b flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-blue-600" size={24} />
                  <h3 className="text-xl font-semibold text-gray-800">
                    {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="text-gray-500" size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient
                </label>
                <CustomSelect
                  options={patients.map(p => ({ value: p.id, label: p.name }))}
                  value={formData.patient_id}
                  onChange={(val) => setFormData({ ...formData, patient_id: val })}
                  placeholder="Select a patient"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <CustomSelect
                  options={[
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                  placeholder="Select status"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Add any additional notes..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  rows={3}
                  value={formData.notes}
                  onChange={e =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>
            </form>

            <div className="p-6 border-t flex-shrink-0">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-lg shadow-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (editingAppointment ? 'Update' : 'Create') + ' Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
