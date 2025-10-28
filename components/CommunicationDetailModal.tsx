import React, { useState, useEffect } from 'react';
import { Task, Client, Participant } from '../types';
import { mockDepartments } from '../constants';
import { X, Send, Save, ArrowRight, Sparkles } from 'lucide-react';

interface CommunicationDetailModalProps {
    task: Task;
    client: Client | undefined;
    participants: Participant[];
    onClose: () => void;
    onUpdateTask: (task: Task) => void;
    onNavigateToTask: (taskId: string) => void;
}

export const CommunicationDetailModal: React.FC<CommunicationDetailModalProps> = ({
    task,
    client,
    participants,
    onClose,
    onUpdateTask,
    onNavigateToTask
}) => {
    const [aiCommunicationText, setAiCommunicationText] = useState(task.aiCommunication || '');

    useEffect(() => {
        setAiCommunicationText(task.aiCommunication || '');
    }, [task]);

    const handleSave = () => {
        onUpdateTask({ ...task, aiCommunication: aiCommunicationText });
    };

    const handleSend = () => {
        const finalTask = { ...task, aiCommunication: aiCommunicationText };
        onUpdateTask(finalTask); // Save final changes before sending
        alert(`Emailing to ${client?.email}:\n\n${aiCommunicationText}`);
        onClose();
    };

    const department = mockDepartments.find(d => d.id === task.departmentId);
    const participantNames = task.participantIds
        .map(pId => participants.find(p => p.id === pId)?.name)
        .filter(Boolean)
        .join(', ');

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Communication Preview</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 flex-grow overflow-y-auto">
                    <div className="mb-4">
                        <button 
                            onClick={() => onNavigateToTask(task.id)}
                            className="text-xl font-bold text-left hover:text-brand-purple transition-colors flex items-center group"
                        >
                            <span>{task.title}</span>
                            <ArrowRight size={20} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <p className="text-sm text-gray-400">Click title to view full task details in calendar</p>
                    </div>

                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-700/50 p-3 rounded-md">
                            <p className="text-gray-400 text-xs uppercase tracking-wider">Client</p>
                            <p className="font-medium">{client?.name}</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded-md">
                            <p className="text-gray-400 text-xs uppercase tracking-wider">Details</p>
                            <p className="font-medium truncate">{department?.name} / {participantNames}</p>
                        </div>
                    </div>
                    
                    <div className="mb-4 bg-gray-900 p-3 rounded-md border border-gray-700/50">
                        <p className="text-xs font-semibold text-gray-400 mb-1">Original Team Draft</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.communication}</p>
                    </div>

                    <div>
                        <label htmlFor="aiCommunicationText" className="block text-sm font-medium text-gray-400 mb-2 flex items-center">
                            <Sparkles size={16} className="mr-2 text-brand-purple" />
                            AI-Optimized Message (Editable)
                        </label>
                        <textarea
                            id="aiCommunicationText"
                            value={aiCommunicationText}
                            onChange={(e) => setAiCommunicationText(e.target.value)}
                            rows={10}
                            className="w-full bg-gray-700 rounded-md p-3 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                        />
                    </div>
                </div>

                <footer className="flex items-center justify-end p-4 border-t border-gray-700 space-x-3 flex-shrink-0">
                    <button 
                        onClick={handleSave} 
                        className="flex items-center space-x-2 px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md"
                    >
                        <Save size={16} />
                        <span>Save Draft</span>
                    </button>
                    <button
                        onClick={handleSend}
                        className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md"
                    >
                        <Send size={16} />
                        <span>Save & Send</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
