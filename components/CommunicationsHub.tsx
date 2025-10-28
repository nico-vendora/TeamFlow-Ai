import React, { useState } from 'react';
import { Task, TaskStatus, Client, Participant } from '../types';
import { mockDepartments } from '../constants';
import { Search, Mail, Menu, MessageSquare, Sparkles, Edit3 } from 'lucide-react';
import { CommunicationDetailModal } from './CommunicationDetailModal';

interface CommunicationBubbleProps {
  task: Task;
  onSelect: () => void;
  client: Client | undefined;
  participants: Participant[];
}

const CommunicationBubble: React.FC<CommunicationBubbleProps> = ({ task, onSelect, client, participants }) => {
    const department = mockDepartments.find(d => d.id === task.departmentId);
    
    const participantNames = task.participantIds
        .map(pId => participants.find(p => p.id === pId)?.name)
        .filter(Boolean)
        .join(', ');

    return (
        <div 
            onClick={onSelect}
            className="bg-gray-800 p-4 rounded-lg border border-gray-700 cursor-pointer hover:border-brand-purple transition-colors flex flex-col h-full"
        >
            <h3 className="font-bold mb-3">{task.title}</h3>
            
            <div className="mb-3">
                <p className="text-xs font-semibold text-brand-purple mb-1.5 flex items-center">
                    <Sparkles size={14} className="mr-1.5" />
                    AI Optimized Version
                </p>
                <p className="text-sm text-gray-300 whitespace-pre-wrap flex-grow line-clamp-3">{task.aiCommunication || 'AI analysis pending...'}</p>
            </div>

            <div className="opacity-70 border-t border-gray-700/50 pt-2">
                <p className="text-xs font-semibold text-gray-400 mb-1">Original Draft</p>
                <p className="text-sm text-gray-400 whitespace-pre-wrap line-clamp-2">{task.communication}</p>
            </div>


            <div className="flex items-center justify-between text-xs mt-auto pt-4 border-t border-gray-700/50">
                <div className="flex items-center space-x-2 overflow-hidden">
                   {department && (
                        <span className={`px-2 py-0.5 rounded-full text-white text-xs ${department.color} flex-shrink-0`}>
                            {department.name}
                        </span>
                    )}
                    <span className="text-gray-500 truncate">{participantNames}</span>
                </div>
                 <button className="p-2 rounded-full hover:bg-gray-700 flex-shrink-0" onClick={(e) => {
                     e.stopPropagation();
                     alert(`Sending email to ${client?.email}...`);
                 }}>
                    <Mail size={16} />
                </button>
            </div>
        </div>
    );
}

interface AwaitingCommunicationBubbleProps {
  task: Task;
  onPrepare: () => void;
  client: Client | undefined;
  participants: Participant[];
}

const AwaitingCommunicationBubble: React.FC<AwaitingCommunicationBubbleProps> = ({ task, onPrepare, client, participants }) => {
    const department = mockDepartments.find(d => d.id === task.departmentId);
    const participantNames = task.participantIds
        .map(pId => participants.find(p => p.id === pId)?.name)
        .filter(Boolean)
        .join(', ');

    const description = task.status === TaskStatus.Done
        ? "This task is complete. A communication draft is needed."
        : `This task is '${task.status}'. You can prepare the client communication in advance.`;

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-dashed border-gray-600 flex flex-col h-full">
            <h3 className="font-bold mb-2 text-gray-300">{task.title}</h3>
            <div className="flex-grow">
                 <p className="text-sm text-gray-400 mb-4">{description}</p>
            </div>
            <button 
                onClick={onPrepare}
                className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors mb-4"
            >
                <Edit3 size={14} className="mr-2" />
                <span>Prepare Communication</span>
            </button>
             <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-700/50">
                <div className="flex items-center space-x-2 overflow-hidden">
                   {department && (
                        <span className={`px-2 py-0.5 rounded-full text-white text-xs ${department.color} flex-shrink-0`}>
                            {department.name}
                        </span>
                    )}
                    <span className="text-gray-500 truncate">{participantNames}</span>
                </div>
                <span className="text-gray-500">{client?.name}</span>
            </div>
        </div>
    );
}

interface CommunicationsHubProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  clients: Client[];
  participants: Participant[];
  onMenuClick: () => void;
  onUpdateTask: (task: Task) => void;
}

export const CommunicationsHub: React.FC<CommunicationsHubProps> = ({ tasks, onSelectTask, clients, participants, onMenuClick, onUpdateTask }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    const readyTasks = tasks.filter(task => 
        task.communication && 
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const needsCommunicationTasks = tasks
        .filter(task => 
            !task.communication && 
            task.title.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            // Prioritize by status: Done > In Progress > Not Started
            const statusOrder = { [TaskStatus.Done]: 0, [TaskStatus.InProgress]: 1, [TaskStatus.NotStarted]: 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            // Then sort by start date
            return a.start.getTime() - b.start.getTime();
        });


    const handleSelectBubble = (task: Task) => {
        setSelectedTask(task);
    };
    
    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-xl font-semibold">Communications Hub</h1>
                </div>
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-700 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none w-64"
                    />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-8">
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <MessageSquare size={20} className="mr-3 text-brand-purple" />
                        Ready to Send ({readyTasks.length})
                    </h2>
                    {readyTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {readyTasks.map(task => (
                                <CommunicationBubble
                                    key={task.id}
                                    task={task}
                                    onSelect={() => handleSelectBubble(task)}
                                    client={clients.find(c => c.id === task.clientId)}
                                    participants={participants}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8 bg-gray-800/50 rounded-lg">
                            <p>No communications are ready to be sent.</p>
                            <p className="text-sm">Complete a task and add a communication draft to see it here.</p>
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-lg font-semibold mb-4 text-gray-400">Needs Communication ({needsCommunicationTasks.length})</h2>
                    {needsCommunicationTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {needsCommunicationTasks.map(task => (
                                <AwaitingCommunicationBubble
                                    key={task.id}
                                    task={task}
                                    onPrepare={() => onSelectTask(task.id)}
                                    client={clients.find(c => c.id === task.clientId)}
                                    participants={participants}
                                />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center text-gray-500 py-8 bg-gray-800/50 rounded-lg">
                            <p>All tasks have communication drafts prepared.</p>
                        </div>
                    )}
                </div>
            </main>
            
             {selectedTask && (
                <CommunicationDetailModal
                    task={selectedTask}
                    client={clients.find(c => c.id === selectedTask.clientId)}
                    participants={participants}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={onUpdateTask}
                    onNavigateToTask={onSelectTask}
                />
            )}
        </div>
    );
};