
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { CommunicationsHub } from './components/CommunicationsHub';
import { TaskDetailsPanel } from './components/TaskDetailsPanel';
import { ClientManagement } from './components/ClientManagement';
import { AddTaskModal } from './components/AddTaskModal';
import { DatabaseManagement } from './components/DatabaseManagement';
import { ToastContainer } from './components/ToastContainer';
import { NotionAuthModal } from './components/NotionAuthModal';
import { NotionMappingModal } from './components/NotionMappingModal';
import { NotionDatabasePickerModal } from './components/NotionDatabasePickerModal';
import { NotionPreviewModal } from './components/NotionPreviewModal';
import { InboxView } from './components/InboxView';
import { Task, View, Client, TaskStatus, Database, Participant, Notification, ConnectionStatus, Department, NotionProperty, NotionPropertyMap, NotionDatabase, NotionPropertyType, ImportedTask } from './types';
import { mockTasks, mockClients, mockDepartments, mockDatabases, mockParticipants, PARTICIPANT_COLORS } from './constants';
import { format } from 'date-fns';
import { makeNotionClient, importDatabase, fetchSharedDatabases, fetchNotionDatabaseProperties, NotionClient } from './services/notionSync';


const App: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>(mockTasks);
    const [clients, setClients] = useState<Client[]>(mockClients);
    const [databases, setDatabases] = useState<Database[]>(mockDatabases);
    const [participants, setParticipants] = useState<Participant[]>(mockParticipants);
    const [departments] = useState<Department[]>(mockDepartments);
    
    const [currentView, setCurrentView] = useState<View>(View.Calendar);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [addTaskInitialDate, setAddTaskInitialDate] = useState<Date | undefined>(undefined);
    const [isNotionAuthModalOpen, setIsNotionAuthModalOpen] = useState(false);
    const [isNotionMappingModalOpen, setIsNotionMappingModalOpen] = useState(false);
    const [isNotionDbPickerOpen, setIsNotionDbPickerOpen] = useState(false);
    const [isNotionPreviewModalOpen, setIsNotionPreviewModalOpen] = useState(false);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    const [history, setHistory] = useState<Task[][]>([mockTasks]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const [visibleParticipants, setVisibleParticipants] = useState<string[]>(() => mockParticipants.map(p => p.id));
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.Disconnected);
    const [notionConnection, setNotionConnection] = useState<{ apiKey: string; databaseId: string; map: NotionPropertyMap; statusPropertyType?: NotionPropertyType } | null>(null);
    const [notionClient, setNotionClient] = useState<NotionClient | null>(null);
    
    const [pendingNotionClient, setPendingNotionClient] = useState<NotionClient | null>(null);
    const [availableNotionDbs, setAvailableNotionDbs] = useState<NotionDatabase[]>([]);
    const [selectedNotionDb, setSelectedNotionDb] = useState<NotionDatabase | null>(null);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [syncLogs, setSyncLogs] = useState<string[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
        const newNotification = { ...notification, id: new Date().getTime().toString() };
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const addSyncLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        setSyncLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }, []);

    const updateTasksAndHistory = useCallback((newTasks: Task[] | ((prevTasks: Task[]) => Task[]), options: { addToHistory?: boolean } = { addToHistory: true }) => {
        setTasks(prevTasks => {
            const updatedTasks = typeof newTasks === 'function' ? newTasks(prevTasks) : newTasks;
            if (options.addToHistory) {
                const newHistory = [...history.slice(0, historyIndex + 1), updatedTasks];
                setHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
            }
            return updatedTasks;
        });
    }, [history, historyIndex]);
    
    const handleInitiateNotionSync = async (apiKey: string) => {
        setSyncLogs([]);
        addSyncLog('Starting connection...');
        addNotification({ type: 'info', message: 'Finding accessible databases...' });
        try {
            const client = makeNotionClient(apiKey);
            setPendingNotionClient(client);

            addSyncLog('Fetching available databases and their properties...');
            const databases = await fetchSharedDatabases(client);
            addSyncLog(`Found ${databases.length} database(s).`);

            if (databases.length === 0) {
                 throw new Error("No databases shared with this integration. Please share a database and try again.");
            }
            setAvailableNotionDbs(databases);
            setIsNotionAuthModalOpen(false);
            setIsNotionDbPickerOpen(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown network error occurred.';
            addSyncLog(`Error: ${message}`);
            addNotification({ type: 'error', message: `Connection failed: ${message}` });
            throw error; // Rethrow to keep the auth modal and show the error
        }
    };
    
    const handleNotionDatabaseSelected = (database: NotionDatabase) => {
        addSyncLog(`Selected DB: ${database.title} (...${database.id.slice(-6)})`);
        console.log(`Selected DB: ${database.title} (..., id: ${database.id.slice(-6)})`);
        console.log("Properties:", database.properties);

        setSelectedNotionDb(database);
        setIsNotionDbPickerOpen(false);
        setIsNotionPreviewModalOpen(true);
    };

    const handlePreviewConfirmed = () => {
        if (!selectedNotionDb || !pendingNotionClient) return;
        setIsNotionPreviewModalOpen(false);
        setIsNotionMappingModalOpen(true);
    };

    const handlePreviewBack = () => {
        setSelectedNotionDb(null);
        setIsNotionPreviewModalOpen(false);
        setIsNotionDbPickerOpen(true);
    }

    const handleSaveMappingAndSync = async (map: NotionPropertyMap) => {
        if (!selectedNotionDb || !pendingNotionClient) return;
        addSyncLog('Property map saved. Starting initial sync...');
        const { client, database } = { client: pendingNotionClient, database: selectedNotionDb };

        const connectionData = { apiKey: client.apiKey, databaseId: database.id, map };
        localStorage.setItem('notionConnection', JSON.stringify(connectionData));
        setNotionConnection(connectionData);
        setNotionClient(client);

        const newNotionDatabase: Database = {
            id: `notion-${database.id}`,
            name: database.title,
            participants: [],
            type: 'notion',
            sourceId: database.id,
        };
        setDatabases(prev => [...prev.filter(db => db.type !== 'notion'), newNotionDatabase]);

        setIsNotionMappingModalOpen(false);
        setSelectedNotionDb(null);
        setPendingNotionClient(null);
        await handleRefreshNotion(client, connectionData, true, true);
    };

    const handleRefreshNotion = async (client = notionClient, connection = notionConnection, isManualRefresh = true, isInitialSync = false) => {
        if (!connection || !client) {
            addNotification({ type: 'error', message: 'Notion connection details not found.' });
            return;
        }
        
        setSyncLogs([]);
        setConnectionStatus(ConnectionStatus.Connecting);
        if (isManualRefresh) addSyncLog("Manual refresh triggered.");

        try {
            const { tasks: importedTasks, skippedCount } = await importDatabase(client, connection.databaseId, addSyncLog, connection.map);
            
            let participantLookUp = [...participants];
            const newParticipants: Participant[] = [];

            const newTasks: Task[] = importedTasks.map(importedTask => {
                const participantIds: string[] = [];
                for (const notionUser of importedTask.assignees) {
                     let localParticipant = participantLookUp.find(p => p.notionUserId === notionUser.id);
                     if (!localParticipant) {
                        const newParticipant: Participant = {
                            id: `par_notion_${notionUser.id.replace(/-/g, "")}`,
                            name: notionUser.name || 'Untitled User',
                            color: PARTICIPANT_COLORS[participantLookUp.length % PARTICIPANT_COLORS.length],
                            notionUserId: notionUser.id,
                        };
                        newParticipants.push(newParticipant);
                        participantLookUp.push(newParticipant);
                        localParticipant = newParticipant;
                    }
                    participantIds.push(localParticipant.id);
                }

                return {
                    id: importedTask.id,
                    title: importedTask.title,
                    start: importedTask.start,
                    end: importedTask.end,
                    status: importedTask.status,
                    clientId: mockClients[0]?.id, // Defaulting client/department for now
                    departmentId: mockDepartments[0]?.id,
                    participantIds,
                    source: 'notion',
                    notionLastEdited: importedTask.lastEditedTime,
                };
            });
            
            const scheduledTasks = newTasks.filter(t => t.start);
            const unscheduledCount = newTasks.length - scheduledTasks.length;
            
            addSyncLog(`Processing complete. Imported ${newTasks.length} tasks, skipped ${skippedCount} (missing title).`);
            if (unscheduledCount > 0) {
                addSyncLog(`${unscheduledCount} tasks are unscheduled and have been added to the Inbox.`);
            }

            if (newParticipants.length > 0) {
                 addSyncLog(`Adding ${newParticipants.length} new participants found in Notion.`);
                 setParticipants(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const trulyNew = newParticipants.filter(p => !existingIds.has(p.id));
                    return [...prev, ...trulyNew];
                });
            }
            
            const allSyncedParticipants = [...participants, ...newParticipants];

            setDatabases(prev => prev.map(db => {
                if (db.type === 'notion' && db.sourceId === connection.databaseId) {
                    const notionUsersInDb = allSyncedParticipants.filter(p => p.notionUserId);
                    return { ...db, participants: notionUsersInDb };
                }
                return db;
            }));
            
            updateTasksAndHistory(prevTasks => {
                const nativeTasks = prevTasks.filter(t => t.source !== 'notion');
                return [...nativeTasks, ...newTasks];
            }, { addToHistory: isInitialSync });

            if (scheduledTasks.length > 0) {
                const earliestTask = scheduledTasks.reduce((earliest, current) => earliest.start! < current.start! ? earliest : current);
                setCurrentDate(earliestTask.start!);
                addSyncLog(`Navigating calendar to first task on ${format(earliestTask.start!, 'MMM d, yyyy')}.`);
            } else if (newTasks.length > 0) {
                addSyncLog('No scheduled tasks found. View unscheduled tasks in the Inbox.');
                setCurrentView(View.Inbox);
            }

            setConnectionStatus(ConnectionStatus.Connected);
            setLastSynced(new Date());
            
            const syncSummary = `Synced ${newTasks.length} tasks. Skipped: ${skippedCount} (no title). Unscheduled: ${unscheduledCount}.`;
            addSyncLog(syncSummary);
            if (isInitialSync || isManualRefresh) {
                addNotification({ type: 'success', message: syncSummary });
            }

        } catch (error) {
            setConnectionStatus(ConnectionStatus.Connected); 
            const message = error instanceof Error ? error.message : 'An unknown error occurred during sync.';
            addSyncLog(`Sync failed: ${message}`);
            addNotification({ type: 'error', message: `Sync failed: ${message}` });
        }
    };
    
    const handleDisconnectNotion = () => {
        localStorage.removeItem('notionConnection');
        setNotionConnection(null);
        setNotionClient(null);
        setConnectionStatus(ConnectionStatus.Disconnected);
        updateTasksAndHistory(prev => prev.filter(t => t.source !== 'notion'));
        setDatabases(prev => prev.filter(db => db.type !== 'notion'));
        addNotification({ type: 'info', message: 'Disconnected from Notion.' });
    };

    useEffect(() => {
        const savedConnection = localStorage.getItem('notionConnection');
        if (savedConnection) {
            try {
                const connection = JSON.parse(savedConnection);
                if (connection && connection.apiKey && connection.databaseId && connection.map) {
                    const client = makeNotionClient(connection.apiKey);
                    setNotionConnection(connection);
                    setNotionClient(client);
                    
                    setDatabases(prev => {
                        if (prev.some(db => db.sourceId === connection.databaseId)) {
                            return prev;
                        }
                        const newDb: Database = { id: `notion-${connection.databaseId}`, name: "Notion DB (loading...)", participants: [], type: 'notion', sourceId: connection.databaseId };
                        return [...prev, newDb];
                    });

                    setConnectionStatus(ConnectionStatus.Connected);
                    handleRefreshNotion(client, connection, false, false);
                }
            } catch(e) {
                 console.error("Failed to parse saved Notion connection:", e);
                 localStorage.removeItem('notionConnection');
            }
        }
    }, []); // Only run on initial mount
    
    const selectedTask = useMemo(() => {
        return tasks.find(task => task.id === selectedTaskId) || null;
    }, [selectedTaskId, tasks]);

    const handleSelectTask = useCallback((taskId: string) => {
        setSelectedTaskId(taskId);
    }, []);

    const handleCloseTaskDetails = useCallback(() => {
        setSelectedTaskId(null);
    }, []);

    const addTask = useCallback((taskData: Omit<Task, 'id' | 'status'>) => {
        const newTask: Task = {
            ...taskData,
            id: `task_${new Date().getTime()}`,
            status: TaskStatus.NotStarted,
            source: 'native',
        };
        updateTasksAndHistory(prev => [...prev, newTask]);
    }, [updateTasksAndHistory]);

    const updateTask = useCallback((updatedTask: Task) => {
        updateTasksAndHistory(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    }, [updateTasksAndHistory]);

    const deleteTask = useCallback((taskId: string) => {
        updateTasksAndHistory(prev => prev.filter(t => t.id !== taskId));
        if (selectedTaskId === taskId) {
            setSelectedTaskId(null);
        }
    }, [selectedTaskId, updateTasksAndHistory]);
    
    const duplicateTask = useCallback((taskId: string) => {
        const originalTask = tasks.find(t => t.id === taskId);
        if (!originalTask) return;
        const newTask: Task = {
            ...originalTask,
            id: `task_${new Date().getTime()}`,
            title: `${originalTask.title} (Copy)`,
            source: 'native', // Duplicates are always native
        };
        updateTasksAndHistory(prev => [...prev, newTask]);
        setSelectedTaskId(newTask.id); // Select the new duplicated task
    }, [tasks, updateTasksAndHistory]);
    
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setTasks(history[newIndex]);
        }
    }, [history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setTasks(history[newIndex]);
        }
    }, [history, historyIndex]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);


    const addClient = (clientData: Omit<Client, 'id'>) => {
        const newClient: Client = { ...clientData, id: `cli_${new Date().getTime()}` };
        setClients(prev => [...prev, newClient]);
    };
    const updateClient = (updatedClient: Client) => {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };
    const deleteClient = (clientId: string) => {
        setClients(prev => prev.filter(c => c.id !== clientId));
    };

    const addDatabase = (name: string) => {
        const newDb: Database = { id: `db_${new Date().getTime()}`, name, participants: [] };
        setDatabases(prev => [...prev, newDb]);
    };

    const addParticipant = (databaseId: string, name: string) => {
        const newParticipant: Participant = {
            id: `par_${new Date().getTime()}`,
            name,
            color: PARTICIPANT_COLORS[Math.floor(Math.random() * PARTICIPANT_COLORS.length)],
        };
        const updatedDatabases = databases.map(db => {
            if (db.id === databaseId) {
                return { ...db, participants: [...db.participants, newParticipant] };
            }
            return db;
        });
        setDatabases(updatedDatabases);
        setParticipants(prev => [...prev, newParticipant]);
    };

    const updateParticipantColor = (participantId: string, color: string) => {
        const update = (p: Participant) => p.id === participantId ? { ...p, color } : p;
        setParticipants(prev => prev.map(update));
        setDatabases(prev => prev.map(db => ({ ...db, participants: db.participants.map(update) })));
    };

    const scheduledTasks = useMemo(() => tasks.filter(t => t.start), [tasks]);
    const unscheduledTasks = useMemo(() => tasks.filter(t => !t.start), [tasks]);

    const filteredScheduledTasks = useMemo(() => {
        return scheduledTasks.filter(task => 
            task.participantIds.length === 0 || task.participantIds.some(pId => visibleParticipants.includes(pId))
        );
    }, [scheduledTasks, visibleParticipants]);
    
    const filteredUnscheduledTasks = useMemo(() => {
        return unscheduledTasks.filter(task => 
            task.participantIds.length === 0 || task.participantIds.some(pId => visibleParticipants.includes(pId))
        );
    }, [unscheduledTasks, visibleParticipants]);

    const handleToggleParticipantVisibility = (participantId: string) => {
        setVisibleParticipants(prev => 
            prev.includes(participantId) 
                ? prev.filter(id => id !== participantId) 
                : [...prev, participantId]
        );
    };

    const handleToggleDatabaseVisibility = (databaseId: string) => {
        const db = databases.find(d => d.id === databaseId);
        if (!db) return;
        const participantIds = db.participants.map(p => p.id);
        const allVisible = participantIds.every(id => visibleParticipants.includes(id));

        if (allVisible) {
            setVisibleParticipants(prev => prev.filter(id => !participantIds.includes(id)));
        } else {
            setVisibleParticipants(prev => [...new Set([...prev, ...participantIds])]);
        }
    };

    const openAddTaskModal = (date?: Date) => {
        setAddTaskInitialDate(date);
        setIsAddTaskModalOpen(true);
    };

    return (
        <div className="h-screen w-screen flex bg-gray-900 text-gray-300 overflow-hidden">
            <Sidebar
                currentView={currentView}
                setView={setCurrentView}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                onAddTaskClick={() => openAddTaskModal()}
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                databases={databases}
                participants={participants}
                visibleParticipants={visibleParticipants}
                onToggleParticipantVisibility={handleToggleParticipantVisibility}
                onToggleDatabaseVisibility={handleToggleDatabaseVisibility}
                connectionStatus={connectionStatus}
                onRefreshNotion={() => handleRefreshNotion()}
                onDisconnectNotion={handleDisconnectNotion}
                lastSynced={lastSynced}
                syncLogs={syncLogs}
                unscheduledTaskCount={filteredUnscheduledTasks.length}
            />
            <main className="flex-1 flex flex-col min-w-0">
                {currentView === View.Inbox && (
                    <InboxView
                        tasks={filteredUnscheduledTasks}
                        participants={participants}
                        clients={clients}
                        departments={departments}
                        onUpdateTask={updateTask}
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                )}
                {currentView === View.Calendar && (
                    <CalendarView
                        tasks={filteredScheduledTasks}
                        participants={participants}
                        onSelectTask={handleSelectTask}
                        selectedTaskId={selectedTaskId}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onAddTaskClick={() => openAddTaskModal(currentDate)}
                        currentDate={currentDate}
                        setCurrentDate={setCurrentDate}
                        onUpdateTask={updateTask}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={historyIndex > 0}
                        canRedo={historyIndex < history.length - 1}
                        onDeleteTask={deleteTask}
                        onDuplicateTask={duplicateTask}
                    />
                )}
                {currentView === View.Communications && (
                    <CommunicationsHub
                        tasks={tasks}
                        onSelectTask={handleSelectTask}
                        clients={clients}
                        participants={participants}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onUpdateTask={updateTask}
                    />
                )}
                 {currentView === View.Clients && (
                    <ClientManagement
                        clients={clients}
                        onAddClient={addClient}
                        onUpdateClient={updateClient}
                        onDeleteClient={deleteClient}
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                )}
                 {currentView === View.Database && (
                    <DatabaseManagement
                        databases={databases}
                        onAddDatabase={addDatabase}
                        onAddParticipant={addParticipant}
                        onUpdateParticipantColor={updateParticipantColor}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onConnectNotion={() => setIsNotionAuthModalOpen(true)}
                    />
                )}
            </main>
            {selectedTask && (
                <TaskDetailsPanel
                    task={selectedTask}
                    onUpdateTask={updateTask}
                    onClose={handleCloseTaskDetails}
                    clients={clients}
                    departments={departments}
                    participants={participants}
                    databases={databases}
                    onDeleteTask={deleteTask}
                    onDuplicateTask={duplicateTask}
                />
            )}
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onAddTask={addTask}
                clients={clients}
                departments={departments}
                databases={databases}
                participants={participants}
                initialDate={addTaskInitialDate}
            />
            <NotionAuthModal
                isOpen={isNotionAuthModalOpen}
                onClose={() => setIsNotionAuthModalOpen(false)}
                onSync={handleInitiateNotionSync}
            />
            <NotionDatabasePickerModal
                isOpen={isNotionDbPickerOpen}
                onClose={() => setIsNotionDbPickerOpen(false)}
                databases={availableNotionDbs}
                onSelect={handleNotionDatabaseSelected}
            />
            {pendingNotionClient && selectedNotionDb && (
                <NotionPreviewModal
                    isOpen={isNotionPreviewModalOpen}
                    onClose={() => setIsNotionPreviewModalOpen(false)}
                    onBack={handlePreviewBack}
                    onConfirm={handlePreviewConfirmed}
                    database={selectedNotionDb}
                    notionClient={pendingNotionClient}
                />
            )}
            {selectedNotionDb && (
                 <NotionMappingModal
                    isOpen={isNotionMappingModalOpen}
                    onClose={() => setIsNotionMappingModalOpen(false)}
                    properties={selectedNotionDb.properties}
                    onSave={handleSaveMappingAndSync}
                />
            )}
            <ToastContainer notifications={notifications} onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
        </div>
    );
};

export default App;
