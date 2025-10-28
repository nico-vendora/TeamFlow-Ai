
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, Client, Department, Participant, Database } from '../types';
import { format } from 'date-fns';
import { X, CheckCircle, Clock, Users, User, Tag, FileText, Trash2, Copy, Send, Sparkles, BookKey } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface TaskDetailsPanelProps {
  task: Task | null;
  onUpdateTask: (task: Task) => void;
  onClose: () => void;
  clients: Client[];
  departments: Department[];
  participants: Participant[];
  databases: Database[];
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
}

const PropertyRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start py-3">
        <div className="flex items-center w-32 text-sm text-gray-400 pt-1">
            {icon}
            <span className="ml-2">{label}</span>
        </div>
        <div className="flex-1">{children}</div>
    </div>
);

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({ task, onUpdateTask, onClose, clients, departments, participants, databases, onDeleteTask, onDuplicateTask }) => {
  const [draftCommunication, setDraftCommunication] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [localTitle, setLocalTitle] = useState('');

  useEffect(() => {
    if (task) {
        setDraftCommunication(task.communication || '');
        setLocalTitle(task.title);
    }
  }, [task]);

  if (!task) {
    return null;
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (task && task.title !== localTitle.trim() && localTitle.trim()) {
        onUpdateTask({ ...task, title: localTitle.trim() });
    } else {
        setLocalTitle(task.title); // revert if empty or unchanged
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask({ ...task, status: e.target.value as TaskStatus });
  };
  
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask({ ...task, clientId: e.target.value });
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateTask({ ...task, departmentId: e.target.value });
  };

  const handleParticipantChange = (participantId: string) => {
    const newParticipantIds = task.participantIds.includes(participantId)
      ? task.participantIds.filter(id => id !== participantId)
      : [...task.participantIds, participantId];
    
    // a task must have at least one participant
    if (newParticipantIds.length > 0) {
      onUpdateTask({ ...task, participantIds: newParticipantIds });
    }
  };
  
  const handleSendToHub = async () => {
    if (!task || !draftCommunication.trim()) return;

    setIsSending(true);
    try {
        const client = clients.find(c => c.id === task.clientId);
        const clientPreferences = client?.communicationPreferences || 'Standard professional communication. Be clear and concise.';

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const prompt = `You are an expert communications assistant. Your task is to refine a draft message to a client based on their specific communication preferences.

**Client Communication Preferences:**
${clientPreferences}

**Original Draft Message from the team:**
"${draftCommunication}"

Please rewrite the draft message to perfectly align with the client's preferences. The rewritten message should be professional, clear, and ready to be sent to the client. Only return the rewritten message, without any additional comments or explanations.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const aiOptimizedText = response.text;

        onUpdateTask({ ...task, communication: draftCommunication, aiCommunication: aiOptimizedText });
    } catch (error) {
        console.error("Error optimizing communication with AI:", error);
        // Fallback: send without AI optimization if it fails, but add a note.
        onUpdateTask({ ...task, communication: draftCommunication, aiCommunication: "AI optimization failed. This is the original draft." });
    } finally {
        setIsSending(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
        onDeleteTask(task.id);
        onClose();
    }
  };

  const handleDuplicate = () => {
    onDuplicateTask(task.id);
  };
  
  const allParticipants = databases.flatMap(db => db.participants);

  return (
    <aside className={`w-96 bg-gray-800 border-l border-gray-700 p-6 flex flex-col transition-transform transform ${task ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h2 className="text-xl font-semibold">Task Details</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                <X size={20} />
            </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            <div className="relative mb-4">
                <input
                    type="text"
                    value={localTitle}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="text-lg font-bold bg-transparent w-full focus:outline-none focus:bg-gray-700/50 rounded-md py-1 px-2 -mx-2"
                />
                 {task.source === 'notion' && (
                    <div className="absolute -top-1 -right-1 text-gray-500" title="This task is synced from Notion">
                        <BookKey size={14} />
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-700">
                <PropertyRow icon={<Clock size={16} />} label="Scadenza">
                    <div className="text-sm font-medium">
                         {task.start && task.end ? 
                            `${format(task.start, 'MMM d, HH:mm')} → ${format(task.end, 'HH:mm')}` :
                            <span className="text-gray-400">Not scheduled</span>
                        }
                    </div>
                </PropertyRow>
                 <PropertyRow icon={<CheckCircle size={16} />} label="Stato">
                    <select value={task.status} onChange={handleStatusChange} className="bg-gray-700 border-none rounded px-2 py-1 text-sm w-full">
                        {Object.values(TaskStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </PropertyRow>
                <PropertyRow icon={<Tag size={16} />} label="Client">
                     <select value={task.clientId} onChange={handleClientChange} className="bg-gray-700 border-none rounded px-2 py-1 text-sm w-full">
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </PropertyRow>
                <PropertyRow icon={<Users size={16} />} label="Dipartimento">
                     <select value={task.departmentId} onChange={handleDepartmentChange} className="bg-gray-700 border-none rounded px-2 py-1 text-sm w-full">
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </PropertyRow>
                <PropertyRow icon={<User size={16} />} label="Participants">
                     <div className="space-y-2 max-h-32 overflow-y-auto bg-gray-700/50 p-2 rounded-md">
                        {allParticipants.map(p => (
                            <label key={p.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-600/50 p-1 rounded">
                                <input
                                    type="checkbox"
                                    checked={task.participantIds.includes(p.id)}
                                    onChange={() => handleParticipantChange(p.id)}
                                    className="form-checkbox h-4 w-4 rounded bg-gray-600 text-brand-purple focus:ring-brand-purple border-gray-500"
                                />
                                <span>{p.name}</span>
                            </label>
                        ))}
                    </div>
                </PropertyRow>
            </div>
            
            <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-400 flex items-center">
                        <FileText size={16} className="mr-2"/> Client Communication Entry
                    </h4>
                    <button
                        onClick={handleSendToHub}
                        disabled={isSending || !draftCommunication.trim()}
                        className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-brand-purple hover:bg-opacity-80 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors w-32 justify-center"
                    >
                        {isSending ? (
                            <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Sparkles size={14} />
                                <span>Optimize & Send</span>
                            </>
                        )}
                    </button>
                </div>
                <textarea 
                    value={draftCommunication} 
                    onChange={(e) => setDraftCommunication(e.target.value)}
                    placeholder="Enter rough notes or a draft for client communication..."
                    className="w-full h-40 bg-gray-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                />
            </div>
        </div>

        <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-700 flex items-center justify-between">
             <button
                onClick={handleDuplicate}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md"
            >
                <Copy size={16} />
                <span>Duplicate Task</span>
            </button>
            <button
                onClick={handleDelete}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-red-800/20 hover:bg-red-800/50 rounded-md"
            >
                <Trash2 size={16} />
                <span>Delete Task</span>
            </button>
        </div>
    </aside>
  );
};
