
import React, { useState, useEffect, useRef } from 'react';
import { View, Database, Participant, ConnectionStatus as ConnectionStatusEnum } from '../types';
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, isToday, isEqual, startOfDay, formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, MessageSquare, Plus, Users, X, Database as DatabaseIcon, Eye, EyeOff, Folder, AppWindow, BookKey, RefreshCw, Loader2, Unlink, Inbox } from 'lucide-react';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddTaskClick: () => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  databases: Database[];
  visibleParticipants: string[];
  onToggleParticipantVisibility: (participantId: string) => void;
  onToggleDatabaseVisibility: (databaseId: string) => void;
  participants: Participant[];
  connectionStatus: ConnectionStatusEnum;
  onRefreshNotion: () => Promise<void>;
  onDisconnectNotion: () => void;
  lastSynced: Date | null;
  syncLogs: string[];
  unscheduledTaskCount: number;
}

interface MiniCalendarProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    setView: (view: View) => void;
    setIsOpen: (isOpen: boolean) => void;
}

const NotionStatus: React.FC<{ status: ConnectionStatusEnum, onRefresh: () => Promise<void>, lastSynced: Date | null, syncLogs: string[] }> = ({ status, onRefresh, lastSynced, syncLogs }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const consoleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (status === ConnectionStatusEnum.Connecting) {
            setIsConsoleOpen(true);
        } else {
            setIsConsoleOpen(false);
        }
    }, [status]);

    useEffect(() => {
        if (isConsoleOpen && consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [syncLogs, isConsoleOpen]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
        }
    };
    
    const isSyncing = status === ConnectionStatusEnum.Connecting;
    const isConnected = status === ConnectionStatusEnum.Connected;

    if (!isConnected && !isSyncing) return null;

    return (
        <div className="relative">
            <div className="flex items-center justify-between text-xs px-3 py-2 border-t border-gray-700 text-gray-400">
                <button
                    onClick={() => setIsConsoleOpen(prev => !prev)}
                    disabled={!isSyncing}
                    className="flex items-center space-x-2 disabled:cursor-default"
                    aria-label="Toggle sync console"
                >
                    <BookKey size={14} className={isConnected ? "text-green-400" : "text-yellow-400"} />
                    {isSyncing && <span className="animate-pulse">Syncing...</span>}
                    {isConnected && lastSynced && <span>Last synced: {formatDistanceToNow(lastSynced, { addSuffix: true })}</span>}
                    {isConnected && !lastSynced && <span>Notion Connected</span>}
                </button>
                {isConnected && (
                    <button onClick={handleRefresh} disabled={isRefreshing || isSyncing} className="p-1 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait" aria-label="Refresh Notion data">
                        {(isRefreshing || isSyncing) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    </button>
                )}
            </div>
            {isSyncing && isConsoleOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 px-2 animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-2 max-w-full">
                        <p className="text-xs font-semibold pb-1.5 border-b border-gray-700 mb-1.5 px-1">Sync Console</p>
                        <div ref={consoleRef} className="max-h-36 overflow-y-auto space-y-1 text-xs font-mono text-gray-400 pr-2">
                           {syncLogs.length > 0 ? syncLogs.map((log, index) => (
                                <p key={index} className="whitespace-pre-wrap break-words">{log}</p>
                            )) : <p className="px-1">Waiting for sync to start...</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentDate, setCurrentDate, setView, setIsOpen }) => {
    const [displayMonth, setDisplayMonth] = useState(currentDate);

    useEffect(() => {
        setDisplayMonth(currentDate);
    }, [currentDate]);

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-2 px-1">
            <span className="font-semibold text-sm">{format(displayMonth, 'MMMM yyyy')}</span>
            <div className="flex items-center space-x-1">
                <button onClick={() => setDisplayMonth(subMonths(displayMonth, 1))} className="p-1 rounded hover:bg-gray-600"><ChevronLeft size={16} /></button>
                <button onClick={() => setDisplayMonth(addMonths(displayMonth, 1))} className="p-1 rounded hover:bg-gray-600"><ChevronRight size={16} /></button>
            </div>
        </div>
    );

    const renderDays = () => {
        const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
        return (
            <div className="grid grid-cols-7 text-xs text-center text-gray-400">
                {days.map(day => <div key={day}>{day}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(displayMonth);
        const daysInMonth = getDaysInMonth(displayMonth);
        const startDate = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1; // Monday is 0
        const today = startOfDay(new Date());

        const cells = [];
        for (let i = 0; i < startDate; i++) {
            cells.push(<div key={`empty-${i}`} className="w-6 h-6"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
            const isCurrentDay = isEqual(startOfDay(cellDate), today);
            const isSelectedDay = isEqual(startOfDay(cellDate), startOfDay(currentDate));
            
            const handleDayClick = () => {
                setCurrentDate(cellDate);
                setView(View.Calendar);
                setIsOpen(false);
            };

            cells.push(
                <div key={day} className="flex justify-center items-center">
                    <span 
                        onClick={handleDayClick}
                        className={`w-6 h-6 flex items-center justify-center text-xs rounded-full cursor-pointer ${isSelectedDay ? 'bg-brand-purple text-white' : isCurrentDay ? 'bg-red-500 text-white' : 'hover:bg-gray-600'}`}>
                        {day}
                    </span>
                </div>
            );
        }

        return <div className="grid grid-cols-7 gap-y-1 mt-2">{cells}</div>;
    };

    return (
        <div className="mt-4">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
};


const DatabaseList: React.FC<{
    databases: Database[];
    visibleParticipants: string[];
    onToggleParticipantVisibility: (participantId: string) => void;
    onToggleDatabaseVisibility: (databaseId: string) => void;
    participants: Participant[];
    onDisconnectNotion: () => void;
}> = ({ databases, visibleParticipants, onToggleParticipantVisibility, onToggleDatabaseVisibility, participants, onDisconnectNotion }) => {
    const [openDatabases, setOpenDatabases] = useState<string[]>(() => databases.map(db => db.id));

    const toggleDatabase = (id: string) => {
        setOpenDatabases(prev => prev.includes(id) ? prev.filter(dbId => dbId !== id) : [...prev, id]);
    };

    const getParticipantColor = (participantId: string) => {
        return participants.find(p => p.id === participantId)?.color || 'bg-gray-500';
    }

    return (
        <div className="mt-4">
            {databases.map(db => {
                const isOpen = openDatabases.includes(db.id);
                const allParticipantsVisible = db.participants.every(p => visibleParticipants.includes(p.id));
                return (
                    <div key={db.id} className="mb-2">
                         <div className="group flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider rounded-md hover:bg-gray-700/50">
                            <button onClick={() => toggleDatabase(db.id)} className="flex items-center flex-1">
                                <ChevronRight size={14} className={`mr-2 transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                {db.type === 'notion' 
                                    ? <BookKey size={14} className="mr-2 text-brand-purple/70" /> 
                                    : <Folder size={14} className="mr-2 text-brand-purple/70" />
                                }
                                <span>{db.name}</span>
                            </button>
                            <div className="flex items-center space-x-1 opacity-50 group-hover:opacity-100">
                                {db.type === 'notion' && (
                                    <>
                                         <button onClick={() => onDisconnectNotion()} className="p-1 text-gray-400 hover:text-red-500" aria-label="Disconnect Notion database">
                                            <Unlink size={14} />
                                        </button>
                                    </>
                                )}
                                <button onClick={() => onToggleDatabaseVisibility(db.id)} className="p-1">
                                    {allParticipantsVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                            </div>
                        </div>
                        {isOpen && (
                             <ul className="space-y-1 text-sm mt-1 pl-6">
                                {db.participants.map(participant => (
                                    <li key={participant.id} className="group flex items-center justify-between px-3 py-1 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-md cursor-pointer">
                                        <div className="flex items-center">
                                            <span className={`w-2 h-2 rounded-full ${getParticipantColor(participant.id)} mr-3`}></span>
                                            {participant.name}
                                        </div>
                                        <button onClick={() => onToggleParticipantVisibility(participant.id)} className="p-1 opacity-50 group-hover:opacity-100">
                                            {visibleParticipants.includes(participant.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                    </li>
                                ))}
                             </ul>
                        )}
                    </div>
                );
            })}
        </div>
    );
};


export const Sidebar: React.FC<SidebarProps> = (props) => {
  const { currentView, setView, isOpen, setIsOpen, onAddTaskClick, currentDate, setCurrentDate, databases, visibleParticipants, onToggleParticipantVisibility, onToggleDatabaseVisibility, participants, connectionStatus, onRefreshNotion, onDisconnectNotion, lastSynced, syncLogs, unscheduledTaskCount } = props;
  const handleViewChange = (newView: View) => {
    setView(newView);
    setIsOpen(false);
  };

  return (
    <aside className={`w-64 bg-gray-800 p-4 flex flex-col border-r border-gray-700 fixed h-full z-40 md:relative md:translate-x-0 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
                <AppWindow size={24} className="text-brand-purple" />
                <span className="text-xl font-bold">TeamFlow</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 md:hidden text-gray-400 hover:text-white">
                <X size={20} />
            </button>
        </div>

        <div className="mb-4">
            <button 
                onClick={onAddTaskClick}
                className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-md p-2 text-sm transition-colors"
            >
                <Plus size={16} className="mr-2" />
                <span>Add New Task</span>
            </button>
        </div>

      <MiniCalendar currentDate={currentDate} setCurrentDate={setCurrentDate} setView={setView} setIsOpen={setIsOpen} />

      <nav className="mt-6 flex-grow flex flex-col overflow-y-auto">
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => handleViewChange(View.Calendar)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                currentView === View.Calendar ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <Calendar size={16} className="mr-3" />
              Scheduling
            </button>
          </li>
          <li>
            <button
              onClick={() => handleViewChange(View.Inbox)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                currentView === View.Inbox ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center">
                 <Inbox size={16} className="mr-3" />
                 Inbox
              </div>
              {unscheduledTaskCount > 0 && (
                <span className="bg-brand-purple text-white text-xs font-semibold rounded-full px-2 py-0.5">
                  {unscheduledTaskCount}
                </span>
              )}
            </button>
          </li>
          <li>
            <button
              onClick={() => handleViewChange(View.Communications)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                currentView === View.Communications ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <MessageSquare size={16} className="mr-3" />
              Communications Hub
            </button>
          </li>
           <li>
            <button
              onClick={() => handleViewChange(View.Clients)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                currentView === View.Clients ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <Users size={16} className="mr-3" />
              Client Management
            </button>
          </li>
           <li>
            <button
              onClick={() => handleViewChange(View.Database)}
              className={`w-full flex items-center px-3 py-2 text-sm rounded-md ${
                currentView === View.Database ? 'bg-gray-700' : 'hover:bg-gray-700'
              }`}
            >
              <DatabaseIcon size={16} className="mr-3" />
              Database
            </button>
          </li>
        </ul>
        <div className="flex-grow overflow-y-auto">
            <DatabaseList 
                databases={databases}
                visibleParticipants={visibleParticipants}
                onToggleParticipantVisibility={onToggleParticipantVisibility}
                onToggleDatabaseVisibility={onToggleDatabaseVisibility}
                participants={participants}
                onDisconnectNotion={onDisconnectNotion}
            />
        </div>
      </nav>
      <div className="-mx-4 -mb-4 mt-auto flex-shrink-0">
         <NotionStatus status={connectionStatus} onRefresh={onRefreshNotion} lastSynced={lastSynced} syncLogs={syncLogs} />
      </div>
    </aside>
  );
};
