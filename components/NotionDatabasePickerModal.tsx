
import React, { useState, useEffect } from 'react';
import { X, Check, Database } from 'lucide-react';
import { NotionDatabase } from '../types';

interface NotionDatabasePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    databases: NotionDatabase[];
    onSelect: (database: NotionDatabase) => void;
}

export const NotionDatabasePickerModal: React.FC<NotionDatabasePickerModalProps> = ({ isOpen, onClose, databases, onSelect }) => {
    const [selectedDbId, setSelectedDbId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && databases.length > 0 && !selectedDbId) {
            setSelectedDbId(databases[0].id);
        } else if (!isOpen) {
            setSelectedDbId(null);
        }
    }, [isOpen, databases, selectedDbId]);


    if (!isOpen) return null;

    const handleSelectClick = () => {
        if (selectedDbId) {
            const selectedDb = databases.find(db => db.id === selectedDbId);
            if (selectedDb) {
                onSelect(selectedDb);
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                         <Database size={18} className="text-brand-purple" />
                         <h2 className="text-lg font-semibold">Select a Notion Database</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </header>
                <div className="p-6 overflow-y-auto space-y-2">
                    <p className="text-sm text-gray-400 mb-4">
                        Choose the database you want to sync with TeamFlow.
                    </p>
                    
                    <div className="space-y-3">
                        {databases.map(db => (
                            <div
                                key={db.id}
                                onClick={() => setSelectedDbId(db.id)}
                                className={`flex items-start p-4 rounded-md cursor-pointer border-2 transition-colors ${
                                    selectedDbId === db.id 
                                        ? 'bg-brand-purple/20 border-brand-purple' 
                                        : 'bg-gray-700/50 border-transparent hover:border-gray-600'
                                }`}
                            >
                                <div className="flex-grow">
                                    <p className="font-medium">{db.title}</p>
                                    <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1 font-mono">
                                        <span>ID: ...{db.id.replace(/-/g, '').slice(-6)}</span>
                                        {db.parentTitle && <><span>•</span><span>In: {db.parentTitle}</span></>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600/50">
                                        <div className="flex flex-wrap gap-1">
                                            {db.propertiesPreview.map(p => (
                                                <span key={p.name} className="bg-gray-600 px-1.5 py-0.5 rounded text-gray-300 whitespace-nowrap">{p.name} <span className="text-gray-500">({p.type})</span></span>
                                            ))}
                                            {db.properties.length > 5 && <span className="bg-gray-600 px-1.5 py-0.5 rounded text-gray-300">...</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-4 mt-1
                                    bg-gray-800
                                    ${selectedDbId === db.id ? 'border-brand-purple' : 'border-gray-500'}">
                                     {selectedDbId === db.id && <div className="w-2.5 h-2.5 bg-brand-purple rounded-full"></div>}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
                <footer className="flex items-center justify-end p-4 border-t border-gray-700 space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={handleSelectClick}
                        disabled={!selectedDbId}
                        className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <Check size={16} />
                        <span>Select & Continue</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
