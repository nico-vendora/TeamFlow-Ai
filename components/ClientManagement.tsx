
import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Plus, X, Save, Trash2, Pencil, Menu } from 'lucide-react';

interface ClientManagementProps {
  clients: Client[];
  onAddClient: (newClientData: Omit<Client, 'id'>) => void;
  onUpdateClient: (updatedClient: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onMenuClick: () => void;
}

const emptyFormState = {
    name: '',
    email: '',
    communicationPreferences: '',
};

export const ClientManagement: React.FC<ClientManagementProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient, onMenuClick }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState<Omit<Client, 'id'>>(emptyFormState);

    useEffect(() => {
        if (editingClient) {
            setFormData({
                name: editingClient.name,
                email: editingClient.email,
                communicationPreferences: editingClient.communicationPreferences || '',
            });
            setIsFormOpen(true);
        } else {
            setFormData(emptyFormState);
        }
    }, [editingClient]);

    const handleOpenAddForm = () => {
        setEditingClient(null);
        setFormData(emptyFormState);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingClient(null);
        setFormData(emptyFormState);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClient) {
            onUpdateClient({ ...editingClient, ...formData });
        } else {
            onAddClient(formData);
        }
        handleCloseForm();
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
                <div className="flex items-center space-x-4">
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-xl font-semibold">Client Management</h1>
                </div>
                <button
                    onClick={handleOpenAddForm}
                    className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md"
                >
                    <Plus size={16} />
                    <span>Add New Client</span>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {isFormOpen && (
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
                            <button onClick={handleCloseForm} className="p-1 rounded-full hover:bg-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">Client Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="communicationPreferences" className="block text-sm font-medium text-gray-400 mb-1">Communication Preferences</label>
                                <textarea
                                    id="communicationPreferences"
                                    name="communicationPreferences"
                                    value={formData.communicationPreferences}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="e.g., Prefers formal tone, weekly summaries on Fridays..."
                                    className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={handleCloseForm} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                                <button type="submit" className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md">
                                    <Save size={16} />
                                    <span>{editingClient ? 'Save Changes' : 'Add Client'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
                    {/* Desktop Table */}
                    <table className="hidden md:table w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700 bg-opacity-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Preferences</th>
                                <th scope="col" className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {clients.map(client => (
                                <tr key={client.id} className="hover:bg-gray-700/50">
                                    <td className="px-6 py-4 font-medium text-white">{client.name}</td>
                                    <td className="px-6 py-4 text-gray-400">{client.email}</td>
                                    <td className="px-6 py-4 text-gray-400 max-w-sm truncate">{client.communicationPreferences || 'N/A'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setEditingClient(client)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md mr-2">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => onDeleteClient(client.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-md">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                     {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-700">
                        {clients.map(client => (
                            <div key={client.id} className="p-4 space-y-2">
                                <div className="font-medium text-white">{client.name}</div>
                                <div className="text-gray-400 text-xs">{client.email}</div>
                                <div className="text-gray-400 text-xs pt-1 border-t border-gray-700/50">
                                    <p className="font-semibold text-gray-500 mb-1">Preferences:</p>
                                    <p className="whitespace-pre-wrap">{client.communicationPreferences || 'N/A'}</p>
                                </div>
                                <div className="flex justify-end space-x-2 pt-2 border-t border-gray-700/50">
                                     <button onClick={() => setEditingClient(client)} className="flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md">
                                        <Pencil size={14} />
                                        <span>Edit</span>
                                    </button>
                                    <button onClick={() => onDeleteClient(client.id)} className="flex items-center space-x-2 px-3 py-1.5 text-xs text-red-400 bg-red-900/40 hover:bg-red-900/60 rounded-md">
                                        <Trash2 size={14} />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                     {clients.length === 0 && (
                        <div className="text-center text-gray-500 py-12">
                            <p>No clients found.</p>
                            <p className="text-sm">Click "Add New Client" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
