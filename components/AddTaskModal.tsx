
import React, { useState, useEffect } from 'react';
import { Client, Department, Task, Database, Participant } from '../types';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTask: (taskData: Omit<Task, 'id' | 'status' | 'communication'>) => void;
    clients: Client[];
    departments: Department[];
    databases: Database[];
    participants: Participant[];
    initialDate?: Date;
}

const emptyFormState = {
    title: '',
    clientId: '',
    departmentId: '',
    participantIds: [] as string[],
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onAddTask, clients, departments, databases, participants, initialDate }) => {
    const [formData, setFormData] = useState(emptyFormState);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const now = initialDate || new Date();
            const start = now;
            const end = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins later

            setStartTime(format(start, "yyyy-MM-dd'T'HH:mm"));
            setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));

            setFormData({
              ...emptyFormState,
              clientId: clients.length > 0 ? clients[0].id : '',
              departmentId: departments.length > 0 ? departments[0].id : '',
              participantIds: participants.length > 0 ? [participants[0].id] : [],
            });
            setError('');
        }
    }, [isOpen, initialDate, clients, departments, participants]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleParticipantChange = (participantId: string) => {
      setFormData(prev => {
        const newParticipantIds = prev.participantIds.includes(participantId)
          ? prev.participantIds.filter(id => id !== participantId)
          : [...prev.participantIds, participantId];
        return { ...prev, participantIds: newParticipantIds };
      });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (!formData.title || !formData.clientId || !formData.departmentId || formData.participantIds.length === 0) {
            setError('Please fill out all required fields and select at least one participant.');
            return;
        }

        if (end <= start) {
            setError('End time must be after start time.');
            return;
        }

        onAddTask({ ...formData, start, end });
        onClose();
    };
    
    const allParticipants = databases.flatMap(db => db.participants);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Add New Task</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} id="add-task-form" className="p-6 flex-grow overflow-y-auto space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">Task Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            placeholder="e.g., Prepare quarterly report"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="start" className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                            <input
                                type="datetime-local"
                                id="start"
                                name="start"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="end" className="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                            <input
                                type="datetime-local"
                                id="end"
                                name="end"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            />
                        </div>
                    </div>

                     <div>
                        <label htmlFor="clientId" className="block text-sm font-medium text-gray-400 mb-1">Client</label>
                        <select id="clientId" name="clientId" value={formData.clientId} onChange={handleChange} required className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none">
                            <option value="" disabled>Select a client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Participants</label>
                      <div className="max-h-32 overflow-y-auto bg-gray-700 p-2 rounded-md space-y-1">
                        {allParticipants.map(p => (
                          <label key={p.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-600/50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.participantIds.includes(p.id)}
                              onChange={() => handleParticipantChange(p.id)}
                              className="form-checkbox h-4 w-4 rounded bg-gray-600 text-brand-purple focus:ring-brand-purple border-gray-500"
                            />
                            <span>{p.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                     <div>
                        <label htmlFor="departmentId" className="block text-sm font-medium text-gray-400 mb-1">Department</label>
                         <select id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleChange} required className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none">
                            <option value="" disabled>Select a department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                     {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </form>
                
                <footer className="flex items-center justify-end p-4 border-t border-gray-700 space-x-3 flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                    <button type="submit" form="add-task-form" className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md">
                        <Save size={16} />
                        <span>Add Task</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
