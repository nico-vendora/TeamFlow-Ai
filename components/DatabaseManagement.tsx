import React, { useState, Fragment } from 'react';
import { Database, Participant } from '../types';
import { Menu, UserPlus, FolderPlus, BookKey, ChevronDown } from 'lucide-react';
import { PARTICIPANT_COLORS } from '../constants';

interface DatabaseManagementProps {
    databases: Database[];
    onAddDatabase: (name: string) => void;
    onAddParticipant: (databaseId: string, name: string) => void;
    onUpdateParticipantColor: (participantId: string, color: string) => void;
    onMenuClick: () => void;
    onConnectNotion: () => void;
}

const AddParticipantForm: React.FC<{ databaseId: string; onAddParticipant: (databaseId: string, name: string) => void }> = ({ databaseId, onAddParticipant }) => {
    const [name, setName] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAddParticipant(databaseId, name.trim());
            setName('');
            setIsOpen(false);
        }
    };

    if (!isOpen) {
        return (
             <button
                onClick={() => setIsOpen(true)}
                className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
                <UserPlus size={16} />
                <span>Add Participant</span>
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="animate-fade-in">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New participant name..."
                autoFocus
                className="w-full bg-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
            />
            <div className="flex justify-end space-x-2 mt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                <button type="submit" className="px-3 py-1 text-xs bg-brand-purple hover:bg-opacity-80 rounded-md">Add</button>
            </div>
        </form>
    );
};


export const DatabaseManagement: React.FC<DatabaseManagementProps> = ({ databases, onAddDatabase, onAddParticipant, onUpdateParticipantColor, onMenuClick, onConnectNotion }) => {
    const [newDbName, setNewDbName] = useState('');
    const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);

    const handleAddDatabase = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDbName.trim()) {
            onAddDatabase(newDbName.trim());
            setNewDbName('');
        }
    };
    
    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center space-x-4">
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-xl font-semibold">Database Management</h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
                 <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-lg font-semibold mb-4">Add New Database</h2>
                    <form onSubmit={handleAddDatabase} className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-3">
                         <input
                            type="text"
                            value={newDbName}
                            onChange={(e) => setNewDbName(e.target.value)}
                            placeholder="e.g., Project Phoenix"
                            className="flex-grow w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                        />
                         <button
                            type="submit"
                            className="w-full md:w-auto flex-shrink-0 flex items-center justify-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md"
                        >
                            <FolderPlus size={16} />
                            <span>Create Database</span>
                        </button>
                    </form>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h2 className="text-lg font-semibold mb-2 flex items-center">
                        <BookKey size={20} className="mr-3 text-brand-purple" />
                        Connect Notion Database
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">Sync your tasks from a Notion database to keep everything in one place.</p>
                    <div className="flex justify-start">
                        <button
                            onClick={onConnectNotion}
                            className="flex items-center space-x-2 px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
                        >
                            <span>Connect with Notion</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {databases.map(db => (
                        <div key={db.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                             <h3 className="text-md font-semibold bg-gray-700/50 px-6 py-3 flex items-center">
                                {db.type === 'notion' && <BookKey size={16} className="mr-3 text-gray-400" />}
                                {db.name}
                            </h3>
                             <div className="overflow-x-auto">
                                 <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Participant Name</th>
                                            <th scope="col" className="px-6 py-3 w-20 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {db.participants.map(p => (
                                            <Fragment key={p.id}>
                                                <tr
                                                    className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                                                    onClick={() => setEditingParticipantId(prev => prev === p.id ? null : p.id)}
                                                    aria-expanded={editingParticipantId === p.id}
                                                    aria-controls={`color-picker-${p.id}`}
                                                >
                                                    <td className="px-6 py-3 font-medium text-white flex items-center space-x-3">
                                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${p.color}`} />
                                                        <span>{p.name}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                       <ChevronDown size={18} className={`text-gray-400 transform transition-transform ${editingParticipantId === p.id ? 'rotate-180' : ''}`} />
                                                    </td>
                                                </tr>
                                                {editingParticipantId === p.id && (
                                                     <tr className="bg-gray-900/50" id={`color-picker-${p.id}`}>
                                                        <td colSpan={2} className="p-4">
                                                            <div className="animate-fade-in">
                                                                <p className="text-xs font-semibold text-gray-400 mb-2">Change Color</p>
                                                                <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                                                                    {PARTICIPANT_COLORS.map(color => (
                                                                        <button
                                                                            key={color}
                                                                            type="button"
                                                                            title={color}
                                                                            className={`w-full aspect-square rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-purple
                                                                                ${p.color === color ? 'border-white' : 'border-transparent'}`}
                                                                            onClick={() => {
                                                                                onUpdateParticipantColor(p.id, color);
                                                                                setEditingParticipantId(null);
                                                                            }}
                                                                            aria-label={`Set color to ${color.split('-')[1]}`}
                                                                        >
                                                                            <div className={`w-full h-full rounded-full ${color}`} />
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                         {db.participants.length === 0 && (
                                            <tr className="border-t border-gray-700">
                                                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">No participants in this database yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                 </table>
                            </div>
                             {db.type !== 'notion' && (
                                <div className="border-t border-gray-700 p-4 flex justify-center md:justify-start">
                                    <AddParticipantForm databaseId={db.id} onAddParticipant={onAddParticipant} />
                                </div>
                             )}
                        </div>
                    ))}
                </div>
                 {databases.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                        <p>No databases found.</p>
                        <p className="text-sm">Create a new database to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};