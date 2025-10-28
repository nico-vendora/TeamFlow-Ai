
import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, Link2, AlertTriangle } from 'lucide-react';
import { NotionProperty, NotionPropertyMap, NotionPropertyType } from '../types';

interface NotionMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    properties: NotionProperty[];
    onSave: (mapping: NotionPropertyMap) => void;
}

const defaultMap: NotionPropertyMap = {
    title: '',
    status: '',
    date: '',
    assign: ''
};

const getCompatibleProperties = (properties: NotionProperty[], types: NotionPropertyType[]): NotionProperty[] => {
    return properties.filter(p => types.includes(p.type));
};

export const NotionMappingModal: React.FC<NotionMappingModalProps> = ({ isOpen, onClose, properties, onSave }) => {
    const [mapping, setMapping] = useState<NotionPropertyMap>(defaultMap);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState<string | null>(null);


    const compatibleProps = useMemo(() => ({
        title: getCompatibleProperties(properties, ['title']),
        status: getCompatibleProperties(properties, ['status', 'select']),
        date: getCompatibleProperties(properties, ['date']),
        assign: getCompatibleProperties(properties, ['people']),
    }), [properties]);

    useEffect(() => {
        if (isOpen) {
            // Auto-select the first compatible property if available
            const initialMap: NotionPropertyMap = {
                title: compatibleProps.title[0]?.name || '',
                status: compatibleProps.status[0]?.name || '',
                date: compatibleProps.date[0]?.name || '',
                assign: compatibleProps.assign[0]?.name || '',
            };
            setMapping(initialMap);
            setError('');
            setWarning(null);

            // Check for potential mapping mismatches
            const savedConnectionString = localStorage.getItem('notionConnection');
            if (!savedConnectionString) return;
            
            try {
                const savedConnection = JSON.parse(savedConnectionString);
                const savedMap: NotionPropertyMap | undefined = savedConnection?.map;
                if (!savedMap) return;

                const commonEnglishNames = {
                    date: ['date', 'due', 'due date', 'timeline'],
                    status: ['status'],
                };

                const hasEnglishDate = properties.some(p => p.type === 'date' && commonEnglishNames.date.includes(p.name.toLowerCase()));
                const hasEnglishStatus = properties.some(p => (p.type === 'status' || p.type === 'select') && commonEnglishNames.status.includes(p.name.toLowerCase()));

                const savedDateIsNonEnglish = savedMap.date && !commonEnglishNames.date.includes(savedMap.date.toLowerCase());
                const savedStatusIsNonEnglish = savedMap.status && !commonEnglishNames.status.includes(savedMap.status.toLowerCase());

                if ((savedDateIsNonEnglish && hasEnglishDate) || (savedStatusIsNonEnglish && hasEnglishStatus)) {
                    setWarning('You may have selected the wrong database. Your saved mapping (e.g., "Scadenza") doesn\'t match the English property names in this database (e.g., "Due Date"). Please verify your selections.');
                }
            } catch (e) {
                console.error("Could not parse saved mapping for warning check", e);
            }

        }
    }, [isOpen, properties, compatibleProps]);
    
    if (!isOpen) return null;

    const handleSaveClick = () => {
        if (!mapping.title || !mapping.date || !mapping.assign) {
            setError('Title, Date, and Assignee fields are required. Status is optional but recommended.');
            return;
        }
        onSave(mapping);
    };

    const renderSelect = (field: keyof NotionPropertyMap, label: string, props: NotionProperty[]) => (
        <div>
            <label htmlFor={field} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
            <select
                id={field}
                name={field}
                value={mapping[field]}
                onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
            >
                <option value="" disabled>{props.length > 0 ? 'Select a property' : 'No compatible property found'}</option>
                {props.map(p => <option key={p.id} value={p.name}>{p.name} ({p.type})</option>)}
            </select>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                         <Link2 size={18} className="text-brand-purple" />
                         <h2 className="text-lg font-semibold">Map Notion Properties</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </header>
                <div className="p-6 overflow-y-auto space-y-4">
                    <p className="text-sm text-gray-400">
                        Please tell TeamFlow which properties in your Notion database correspond to the required fields.
                    </p>
                    
                    {warning && (
                         <div className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 p-3 rounded-md flex items-start space-x-2">
                            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="font-bold">Potential Mismatch Detected</strong>
                                <p>{warning}</p>
                            </div>
                        </div>
                    )}

                    {renderSelect('title', 'Task Title', compatibleProps.title)}
                    {renderSelect('status', 'Task Status (Optional)', compatibleProps.status)}
                    {renderSelect('date', 'Start/End Date', compatibleProps.date)}
                    
                    <div>
                        <label htmlFor="assign" className="block text-sm font-medium text-gray-400 mb-1">Assigned To (Participants)</label>
                        <select
                            id="assign"
                            name="assign"
                            value={mapping.assign}
                            onChange={(e) => setMapping(prev => ({ ...prev, assign: e.target.value }))}
                            className="w-full bg-gray-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                        >
                            <option value="" disabled>{compatibleProps.assign.length > 0 ? 'Select a property' : 'No compatible property found'}</option>
                            {compatibleProps.assign.map(p => <option key={p.id} value={p.name}>{p.name} ({p.type})</option>)}
                        </select>
                        {compatibleProps.assign.length === 0 && (
                            <div className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 p-3 rounded-md flex items-start space-x-2">
                                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                <div>
                                    <strong>Action Required:</strong> To sync participants, your Notion database must have a property of type 'Person'. Please add one in Notion, then close this window and reconnect.
                                </div>
                            </div>
                        )}
                    </div>


                    {error && <p className="text-red-500 text-sm p-3 bg-red-500/10 rounded-md mt-4">{error}</p>}
                </div>
                <footer className="flex items-center justify-end p-4 border-t border-gray-700 space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md">
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveClick}
                        className="flex items-center space-x-2 px-4 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md"
                    >
                        <Check size={16} />
                        <span>Save & Sync</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
