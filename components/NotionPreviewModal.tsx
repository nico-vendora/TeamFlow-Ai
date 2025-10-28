
import React, { useState, useEffect } from 'react';
import { X, Check, ArrowLeft, Loader2, AlertTriangle, Table } from 'lucide-react';
import { NotionDatabase, NotionTaskPreview } from '../types';
import { previewDatabaseEntries, NotionClient } from '../services/notionSync';

interface NotionPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
    onConfirm: () => void;
    database: NotionDatabase;
    notionClient: NotionClient;
}

export const NotionPreviewModal: React.FC<NotionPreviewModalProps> = ({ isOpen, onClose, onBack, onConfirm, database, notionClient }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<NotionTaskPreview[]>([]);

    useEffect(() => {
        if (isOpen) {
            const fetchPreview = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const data = await previewDatabaseEntries(notionClient, database.id, database.properties);
                    setPreviewData(data);
                } catch (e) {
                    const message = e instanceof Error ? e.message : 'An unknown error occurred.';
                    setError(`Failed to fetch preview: ${message}`);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPreview();
        }
    }, [isOpen, database, notionClient]);

    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p>Fetching data preview...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-48 text-red-400 bg-red-500/10 rounded-md p-4">
                     <AlertTriangle size={32} className="mb-4" />
                     <p className="font-semibold">Error Loading Preview</p>
                    <p className="text-sm text-center">{error}</p>
                </div>
            );
        }
        
        if (previewData.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Table size={32} className="mb-4" />
                    <p>Database is empty.</p>
                    <p className="text-sm">No entries were found to preview.</p>
                </div>
            )
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-4 py-2">Title (from '{database.properties.find(p => p.type==='title')?.name}')</th>
                            <th scope="col" className="px-4 py-2">Date (from '{database.properties.find(p => p.type==='date')?.name}')</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {previewData.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-2 font-medium truncate max-w-xs">{item.title}</td>
                                <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{item.date || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold">Database Preview: {database.title}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 flex-grow overflow-y-auto">
                    <p className="text-sm text-gray-400 mb-4">
                        Here are the first 10 items from the selected database. Does this look correct?
                    </p>
                    {renderContent()}
                </div>

                <footer className="flex items-center justify-between p-4 border-t border-gray-700">
                    <button
                        onClick={onBack}
                        className="flex items-center space-x-2 px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md"
                    >
                        <ArrowLeft size={16} />
                        <span>Back to List</span>
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading || !!error}
                        className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <Check size={16} />
                        <span>Use this Database</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
