import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { db } from '../services/db';
import { Appointment, Patient, DoctorMode } from '../types';
import { useAuth } from '../components/AuthProvider';
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

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    start_time: '',
    end_time: '',
    status: 'scheduled' as const,
    notes: '',
    doctortype: mode
  });

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId, mode]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      if (editingAppointment) {
        await db.updateAppointment(editingAppointment.id, formData, userId, mode);
        toast.success('Appointment updated');
      } else {
        await db.createAppointment(formData, userId, mode);
        toast.success('Appointment created');
      }

      setShowForm(false);
      setEditingAppointment(null);
      loadData();
    } catch {
      toast.error('Operation failed');
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
    borderColor: '#2563eb'
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-blue-50">
        <p className="text-blue-500 font-medium">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white p-6">

      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track all clinic appointments in one place
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-blue-200 transition-all"
          >
            <Plus size={18} />
            New Appointment
          </button>
        </div>

        

        {/* VIEW TOGGLE */}
        <div className="flex justify-center">
          <div className="bg-white shadow-sm p-1 rounded-full flex gap-1">
            {['calendar', 'list'].map(v => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`px-6 py-2 rounded-full capitalize text-sm transition-all ${
                  view === v
                    ? 'bg-blue-500 text-white shadow'
                    : 'text-gray-600 hover:bg-blue-50'
                }`}
              >
                {v} view
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="bg-white rounded-2xl shadow-sm p-6">

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

              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                events={events}
                height="auto"
                selectable
                editable
              />
            </>
          ) : (
            <div className="space-y-4">
              {appointments.map(a => (
                <div
                  key={a.id}
                  className="bg-blue-50 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <User className="text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-800">
                        {patients.find(p => p.id === a.patient_id)?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(a.start_time), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingAppointment(a);
                        setShowForm(true);
                      }}
                      className="p-2 rounded-lg hover:bg-white"
                    >
                      <Edit size={16} className="text-gray-600" />
                    </button>

                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-2 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
              </h3>

              <button onClick={() => setShowForm(false)}>
                <X className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <select
                className="w-full border rounded-xl p-3 text-sm"
                value={formData.patient_id}
                onChange={e =>
                  setFormData({ ...formData, patient_id: e.target.value })
                }
                required
              >
                <option value="">Select patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                className="w-full border rounded-xl p-3 text-sm"
                value={formData.start_time}
                onChange={e =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                required
              />

              <input
                type="datetime-local"
                className="w-full border rounded-xl p-3 text-sm"
                value={formData.end_time}
                onChange={e =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                required
              />

              <textarea
                placeholder="Notes..."
                className="w-full border rounded-xl p-3 text-sm"
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />

              <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-xl shadow">
                Save Appointment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
