
import React from 'react';
import { Task, Participant, Client, Department } from '../types';
import { Menu, Inbox, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InboxViewProps {
    tasks: Task[];
    participants: Participant[];
    clients: Client[];
    departments: Department[];
    onUpdateTask: (task: Task) => void;
    onMenuClick: () => void;
}

const InboxTask: React.FC<{ task: Task, participants: Participant[], client?: Client, department?: Department }> = ({ task, participants, client, department }) => {
    const participantNames = task.participantIds.map(pId => participants.find(p => p.id === pId)?.name).filter(Boolean).join(', ');

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="flex items-center bg-gray-800 p-3 rounded-lg border border-gray-700 group"
        >
            <GripVertical size={20} className="text-gray-500 cursor-grab group-hover:text-gray-400 mr-3 flex-shrink-0" />
            <div className="flex-grow">
                <p className="font-semibold text-gray-200">{task.title}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                    <span>{client?.name || 'No Client'}</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                    <span>{department?.name || 'No Department'}</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                    <span className="truncate">{participantNames || 'Unassigned'}</span>
                </div>
            </div>
            {task.notionLastEdited && (
                 <div className="text-xs text-gray-500 flex-shrink-0 ml-4">
                    Edited {formatDistanceToNow(new Date(task.notionLastEdited), { addSuffix: true })}
                </div>
            )}
        </div>
    );
};

export const InboxView: React.FC<InboxViewProps> = ({ tasks, participants, clients, departments, onUpdateTask, onMenuClick }) => {
    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 sticky top-0 z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center space-x-3">
                        <Inbox size={22} className="text-brand-purple" />
                        <h1 className="text-xl font-semibold">Inbox</h1>
                    </div>
                </div>
                <span className="text-sm text-gray-400">{tasks.length} unscheduled tasks</span>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                     <div className="bg-gray-800/50 p-4 rounded-lg border border-dashed border-gray-700 mb-6 text-center">
                        <p className="text-sm text-gray-400">
                            This is your inbox for all unscheduled tasks.
                        </p>
                         <p className="text-xs text-gray-500 mt-1">
                           Drag and drop a task onto the calendar to schedule it.
                        </p>
                    </div>

                    {tasks.length > 0 ? (
                        <div className="space-y-3">
                            {tasks
                                .sort((a, b) => new Date(b.notionLastEdited || 0).getTime() - new Date(a.notionLastEdited || 0).getTime())
                                .map(task => (
                                <InboxTask
                                    key={task.id}
                                    task={task}
                                    participants={participants}
                                    client={clients.find(c => c.id === task.clientId)}
                                    department={departments.find(d => d.id === task.departmentId)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-20">
                            <Inbox size={48} className="mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">All caught up!</h3>
                            <p className="text-sm">There are no unscheduled tasks in your inbox.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
