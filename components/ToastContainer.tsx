
import React, { useEffect } from 'react';
import { Notification } from '../types';
import { X, Info, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
    notification: Notification;
    onDismiss: (id: string) => void;
}

const getIcon = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return <CheckCircle size={18} className="text-green-400" />;
        case 'error':
            return <AlertCircle size={18} className="text-red-400" />;
        case 'warning':
            return <AlertTriangle size={18} className="text-yellow-400" />;
        case 'info':
        default:
            return <Info size={18} className="text-blue-400" />;
    }
};


const Toast: React.FC<ToastProps> = ({ notification, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(notification.id);
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [notification.id, onDismiss]);

    const icon = getIcon(notification.type);

    return (
        <div 
            className="bg-gray-700 border border-gray-600 rounded-lg shadow-lg flex items-start p-4 w-80 animate-fade-in"
            role="alert"
        >
            <div className="flex-shrink-0 mr-3 pt-0.5">
                {icon}
            </div>
            <div className="flex-1 text-sm text-gray-300">
                {notification.message}
            </div>
            <button 
                onClick={() => onDismiss(notification.id)}
                className="ml-4 p-1 rounded-full hover:bg-gray-600 text-gray-400 hover:text-white"
                aria-label="Dismiss notification"
            >
                <X size={16} />
            </button>
        </div>
    );
};


interface ToastContainerProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onDismiss }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-3">
            {notifications.map(notification => (
                <Toast 
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                />
            ))}
        </div>
    );
};
