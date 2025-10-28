
import React, { useState, useEffect } from 'react';
import { X, Lock, Loader2, Share2, KeyRound, DatabaseZap, AlertTriangle } from 'lucide-react';

interface NotionAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSync: (apiKey: string) => Promise<void>;
}

export const NotionAuthModal: React.FC<NotionAuthModalProps> = ({ isOpen, onClose, onSync }) => {
    const [notionApiKey, setNotionApiKey] = useState('');
    const [error, setError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNotionApiKey('');
            setError('');
            setIsSyncing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSyncClick = async () => {
        setError('');
        setIsSyncing(true);
        try {
            await onSync(notionApiKey);
            // On success, the parent will close this modal.
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsSyncing(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                         <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" alt="Notion Logo" className="w-6 h-6"/>
                         <h2 className="text-lg font-semibold">Connect to Notion</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto space-y-6">
                    <p className="text-sm text-center text-gray-400">Follow these steps to connect your Notion account.</p>
                    
                    {/* Step 1 */}
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center mt-1">
                            <KeyRound size={16} className="text-brand-purple" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-semibold">1. Create a Notion Integration & Get Token</h4>
                            <p className="text-xs text-gray-400 mt-1 mb-2">
                                Go to your <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-brand-purple underline hover:text-brand-purple/80">Notion Integrations page</a>, create a new integration, and copy the 'Internal Integration Token'.
                            </p>
                            <input
                                type="password"
                                value={notionApiKey}
                                onChange={(e) => setNotionApiKey(e.target.value)}
                                placeholder="Paste your Integration Token (API Key) here"
                                className="w-full bg-gray-900 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center mt-1">
                            <Share2 size={16} className="text-brand-purple" />
                        </div>
                        <div>
                            <h4 className="font-semibold">2. Share Databases with the Integration</h4>
                            <p className="text-xs text-gray-400 mt-1">
                                In Notion, open the databases you want to sync, click the <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">...</code> menu, select <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">+ Add connections</code>, and choose the integration you just created.
                            </p>
                        </div>
                    </div>
                    
                    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-300 p-4 text-xs rounded-r-lg flex items-start space-x-3">
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Security Notice</p>
                            <p>Your API key and property mappings will be stored in your browser's local storage for automatic reconnection. Do not use this feature on a shared or public computer.</p>
                        </div>
                    </div>


                    {error && <p className="text-red-500 text-sm p-3 bg-red-500/10 rounded-md">{error}</p>}
                </div>

                <footer className="flex items-center justify-end p-4 border-t border-gray-700 space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={handleSyncClick}
                        disabled={isSyncing || !notionApiKey.trim()}
                        className="flex items-center justify-center w-48 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : 'Find Databases'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
