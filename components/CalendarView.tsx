

import React, { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { Task, CalendarDisplayMode, Participant, TaskStatus } from '../types';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, Menu, Plus, Undo, Redo, CheckCircle, Circle, Dot, BookKey } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  participants: Participant[];
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  onMenuClick: () => void;
  onAddTaskClick: () => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onUpdateTask: (task: Task) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDeleteTask: (taskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
}

interface ProcessedTask extends Task {
    layout: {
        top: string;
        height: string;
        left: string;
        width: string;
    }
}

const hours = Array.from({ length: 24 }, (_, i) => i);

const TaskStatusIcon: React.FC<{ status: TaskStatus }> = ({ status }) => {
    switch (status) {
        case TaskStatus.Done:
            return <CheckCircle size={12} className="text-green-400" />;
        case TaskStatus.InProgress:
            return <Dot size={12} className="text-blue-400" />;
        case TaskStatus.NotStarted:
        default:
            return <Circle size={10} className="text-gray-500" />;
    }
};

const CurrentTimeLabel: React.FC<{ top: number; hasTasksToday: boolean }> = ({ top, hasTasksToday }) => {
    const [now, setNow] = useState(() => new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const style = {
        top: `${top}%`,
        transform: 'translateY(-50%)',
    };

    return (
        <div className="absolute left-0 w-14 flex justify-center items-center pointer-events-none z-20" style={style}>
            {hasTasksToday ? (
                <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg">
                    {format(now, 'HH:mm')}
                </span>
            ) : (
                <span className="text-xs font-medium text-red-500">
                    {format(now, 'HH:mm')}
                </span>
            )}
        </div>
    );
};


const TimeIndicator = forwardRef<HTMLDivElement, { top: number }>(({ top }, ref) => {
    const style = {
        top: `${top}%`,
    };
    return (
        <div ref={ref} className="absolute z-10 w-full pointer-events-none" style={style}>
            <div className="h-px bg-red-500"></div>
        </div>
    );
});
TimeIndicator.displayName = "TimeIndicator";


const calculateLayout = (tasksForDay: Task[]): ProcessedTask[] => {
    if (!tasksForDay || tasksForDay.length === 0) {
        return [];
    }
    const scheduledTasks = tasksForDay.filter(t => t.start && t.end);

    // 1. Prepare tasks: Add minute properties, sort by start time.
    const events = scheduledTasks
        .map(task => {
            const startMinutes = task.start!.getHours() * 60 + task.start!.getMinutes();
            const endMinutes = task.end!.getHours() * 60 + task.end!.getMinutes();
            return {
                ...task,
                startMinutes,
                endMinutes,
                // Temporary properties for layout calculation
                layoutProps: {
                    column: 0,
                    totalColumns: 1,
                }
            };
        })
        .sort((a, b) => {
            if (a.startMinutes !== b.startMinutes) {
                return a.startMinutes - b.startMinutes;
            }
            return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
        });

    // 2. Identify collision groups
    const collisionGroups: (typeof events)[] = [];
    if (events.length > 0) {
        let currentGroup: (typeof events) = [events[0]];
        collisionGroups.push(currentGroup);
        
        for (let i = 1; i < events.length; i++) {
            const event = events[i];
            const maxEndTimeInGroup = Math.max(...currentGroup.map(e => e.endMinutes));
            
            if (event.startMinutes < maxEndTimeInGroup) {
                currentGroup.push(event);
            } else {
                currentGroup = [event];
                collisionGroups.push(currentGroup);
            }
        }
    }

    // 3. Process each collision group to assign columns
    collisionGroups.forEach(group => {
        const columns: number[] = []; // Stores the end time of the last event in each column

        group.forEach(event => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                if (columns[i] <= event.startMinutes) {
                    columns[i] = event.endMinutes;
                    event.layoutProps.column = i;
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                event.layoutProps.column = columns.length;
                columns.push(event.endMinutes);
            }
        });

        const totalColumns = columns.length;
        group.forEach(event => {
            event.layoutProps.totalColumns = totalColumns;
        });
    });


    // 4. Calculate final CSS properties
    return events.map(event => {
        const { column, totalColumns } = event.layoutProps;
        
        const width = 100 / totalColumns;
        const left = column * width;

        const duration = Math.max(event.endMinutes - event.startMinutes, 15);
        const top = (event.startMinutes / (24 * 60)) * 100;
        const height = (duration / (24 * 60)) * 100;

        return {
            ...event,
            layout: {
                top: `${top}%`,
                height: `${height}%`,
                left: `${left}%`,
                width: `calc(${width}% - 4px)`, // Keep margin for visual separation
            }
        };
    });
};

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, participants, onSelectTask, selectedTaskId, onMenuClick, onAddTaskClick, currentDate, setCurrentDate, onUpdateTask, onUndo, onRedo, canUndo, canRedo, onDeleteTask, onDuplicateTask }) => {
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>(CalendarDisplayMode.Week);
  const [isViewSelectorOpen, setViewSelectorOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeIndicatorRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState(0);
  const [resizingTask, setResizingTask] = useState<Task | null>(null);
  const dragInfo = useRef<{ taskId: string | null, offsetY: number, isFromInbox: boolean }>({ taskId: null, offsetY: 0, isFromInbox: false });

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const days = useMemo(() => {
    if (isMobile) {
        return [currentDate, addDays(currentDate, 1)];
    }
    if (displayMode === CalendarDisplayMode.Day) {
        return [currentDate];
    }
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate, displayMode, isMobile]);
  
  const todayIndex = useMemo(() => {
    return days.findIndex(day => isSameDay(day, new Date()));
  }, [days]);

  const hasTasksToday = useMemo(() => {
    if (todayIndex === -1) return false;
    return tasks.some(task => task.start && isSameDay(task.start, new Date()));
  }, [tasks, todayIndex]);

  const processedTasksByDay = useMemo(() => {
    const dayMap = new Map<string, ProcessedTask[]>();
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const tasksForDay = tasks.filter(t => t.start && isSameDay(t.start, day));
      const processedTasks = calculateLayout(tasksForDay);
      dayMap.set(dayKey, processedTasks);
    });
    return dayMap;
  }, [tasks, days]);

  useEffect(() => {
    const updatePosition = () => {
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const totalMinutes = 24 * 60;
        setCurrentTimeTop((minutes / totalMinutes) * 100);
    };

    const interval = setInterval(updatePosition, 60000);
    updatePosition();
    
    return () => clearInterval(interval);
  }, []);

  const scrollToCurrentTime = () => {
    if (timeIndicatorRef.current) {
        timeIndicatorRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }
  };

  useEffect(() => {
    if (todayIndex !== -1) {
        const timer = setTimeout(() => {
          scrollToCurrentTime();
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [currentDate, displayMode, todayIndex, isMobile]);

  const handlePrev = () => {
    const newDate = isMobile
        ? subDays(currentDate, 2)
        : displayMode === CalendarDisplayMode.Week ? subWeeks(currentDate, 1) : subDays(currentDate, 1);
    setCurrentDate(newDate);
  };
  
  const handleNext = () => {
    const newDate = isMobile
        ? addDays(currentDate, 2)
        : displayMode === CalendarDisplayMode.Week ? addWeeks(currentDate, 1) : addDays(currentDate, 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleSetDisplayMode = (mode: CalendarDisplayMode) => {
    setDisplayMode(mode);
    setViewSelectorOpen(false);
  }

  const gridColsClass = {
    1: 'grid-cols-[auto,1fr]',
    2: 'grid-cols-[auto,repeat(2,1fr)]',
    7: 'grid-cols-[auto,repeat(7,1fr)]'
  }[days.length] || 'grid-cols-[auto,1fr]';
  
  const gridBodyColsClass = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      7: 'grid-cols-7'
  }[days.length] || 'grid-cols-1';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
      e.dataTransfer.setData('taskId', task.id);
      e.dataTransfer.effectAllowed = 'move';
      
      const isFromInbox = !task.start;
      if (!isFromInbox) {
          e.currentTarget.classList.add('dragging');
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      dragInfo.current = { taskId: task.id, offsetY, isFromInbox };
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
      e.currentTarget.classList.remove('dragging');
      dragInfo.current = { taskId: null, offsetY: 0, isFromInbox: false };
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      
      const taskId = e.dataTransfer.getData('taskId');
      if (!taskId) return;

      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      document.querySelector('.dragging')?.classList.remove('dragging');

      const gridEl = e.currentTarget;
      const rect = gridEl.getBoundingClientRect();
      
      const dropY = e.clientY - rect.top;
      const isFromInbox = !task.start;
      const taskTopY = isFromInbox ? dropY : dropY - dragInfo.current.offsetY;
      const totalMinutes = Math.max(0, (taskTopY / rect.height) * 24 * 60);
      const snappedMinutes = Math.round(totalMinutes / 15) * 15;

      const dropX = e.clientX - rect.left;
      const dayWidth = rect.width / days.length;
      const dayIndex = Math.min(Math.floor(dropX / dayWidth), days.length - 1);
      const targetDay = days[dayIndex];

      const newStart = new Date(targetDay);
      newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);

      const duration = (task.end && task.start) 
          ? task.end.getTime() - task.start.getTime()
          : 60 * 60 * 1000; // Default to 1 hour for new tasks from inbox
          
      const newEnd = new Date(newStart.getTime() + duration);

      onUpdateTask({ ...task, start: newStart, end: newEnd });
      
      dragInfo.current = { taskId: null, offsetY: 0, isFromInbox: false };
  };
  
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingTask({ ...task });
  };

  useEffect(() => {
    const dayGridEl = scrollContainerRef.current?.querySelector('.relative.border-r');
    if (!resizingTask || !dayGridEl || !resizingTask.start) return;

    const handleMouseMove = (e: MouseEvent) => {
        const rect = dayGridEl.getBoundingClientRect();
        const dropY = e.clientY - rect.top;

        const totalMinutes = (dropY / rect.height) * 24 * 60;
        const snappedMinutes = Math.max(0, Math.round(totalMinutes / 15) * 15);
        
        const startMinutes = resizingTask.start!.getHours() * 60 + resizingTask.start!.getMinutes();
        
        if (snappedMinutes > startMinutes) {
            const newEnd = new Date(resizingTask.start!);
            newEnd.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
            
            setResizingTask(prev => prev ? { ...prev, end: newEnd } : null);
        }
    };
    
    const handleMouseUp = () => {
        if(resizingTask) {
            onUpdateTask(resizingTask);
        }
        setResizingTask(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingTask, onUpdateTask]);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-30">
            <div className="flex items-center space-x-4">
                <button onClick={onMenuClick} className="p-2 -ml-2 text-gray-400 hover:text-white md:hidden">
                    <Menu size={24} />
                </button>
                <span className="text-lg md:text-xl font-semibold">{format(currentDate, isMobile ? 'MMM yyyy' : 'MMMM yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2">
                 <button
                    onClick={onAddTaskClick}
                    className="hidden md:flex items-center space-x-2 px-3 py-2 text-sm bg-brand-purple hover:bg-opacity-80 rounded-md"
                >
                    <Plus size={16} className="-ml-1" />
                    <span>New Task</span>
                </button>
                <div className="hidden md:flex items-center border border-gray-600 rounded-md">
                    <button 
                        onClick={onUndo} 
                        disabled={!canUndo} 
                        className="p-2 hover:bg-gray-700 rounded-l-md disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Undo last action (Ctrl+Z)"
                    >
                        <Undo size={16} />
                    </button>
                    <button 
                        onClick={onRedo} 
                        disabled={!canRedo} 
                        className="p-2 hover:bg-gray-700 rounded-r-md border-l border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Redo last action (Ctrl+Y)"
                    >
                        <Redo size={16} />
                    </button>
                </div>
                 <div className="flex items-center border border-gray-600 rounded-md">
                     <button onClick={handlePrev} className="p-2 hover:bg-gray-700 rounded-l-md"><ChevronLeft size={16} /></button>
                     <button onClick={handleToday} className="px-3 py-2 text-sm hover:bg-gray-700 border-x border-gray-600">Today</button>
                     <button onClick={handleNext} className="p-2 hover:bg-gray-700 rounded-r-md"><ChevronRight size={16} /></button>
                </div>
                <div className="relative hidden md:block">
                    <button onClick={() => setViewSelectorOpen(prev => !prev)} className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-600 rounded-md hover:bg-gray-700 w-28 justify-between">
                        <span>{displayMode}</span>
                        <ChevronDown size={16} />
                    </button>
                    {isViewSelectorOpen && (
                        <div className="absolute right-0 mt-2 w-28 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-30">
                            <button onClick={() => handleSetDisplayMode(CalendarDisplayMode.Day)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-600">Day</button>
                            <button onClick={() => handleSetDisplayMode(CalendarDisplayMode.Week)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-600">Week</button>
                        </div>
                    )}
                </div>
            </div>
        </header>

        <div className="flex flex-col flex-1">
            <div className={`grid ${gridColsClass} sticky top-[73px] bg-gray-800 z-10 border-b border-gray-700`}>
                <div className="w-14 text-center py-2 border-r border-gray-700"></div>
                {days.map(day => (
                    <div key={day.toString()} className="text-center py-2 border-r border-gray-700 last:border-r-0">
                        <span className="text-xs text-gray-400">{format(day, 'EEE')}</span>
                        <p className={`text-lg md:text-2xl font-medium ${isSameDay(day, new Date()) ? 'text-brand-purple' : ''}`}>
                            {format(day, 'd')}
                        </p>
                    </div>
                ))}
            </div>
            <div className="flex flex-1 overflow-y-auto" ref={scrollContainerRef}>
                 <div className="w-14 border-r border-gray-700 relative">
                    {hours.map(hour => (
                        <div key={hour} className="h-24 text-right pr-2 pt-1 text-xs text-gray-500 border-b border-gray-700">
                            {hour > 0 ? `${hour}:00` : ''}
                        </div>
                    ))}
                    {todayIndex !== -1 && <CurrentTimeLabel top={currentTimeTop} hasTasksToday={hasTasksToday} />}
                </div>
                <div 
                    className={`grid ${gridBodyColsClass} flex-1 relative`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    {days.map((day) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const tasksToRender = processedTasksByDay.get(dayKey) || [];
                        return (
                        <div key={day.toString()} className="relative border-r border-gray-700 last:border-r-0">
                            {hours.map(hour => (
                                <div key={hour} className="h-24 border-b border-gray-700"></div>
                            ))}
                            {tasksToRender.map(task => {
                                const taskToDisplay = (resizingTask && resizingTask.id === task.id) ? resizingTask : task;
                                const isSelected = selectedTaskId === task.id;
                                const isResizing = resizingTask && resizingTask.id === task.id;
                                const isCompleted = task.status === TaskStatus.Done;

                                const taskClasses = `task-item absolute p-2 rounded-lg text-xs cursor-pointer transition-all duration-150 flex ${
                                  isSelected 
                                    ? 'bg-brand-purple ring-2 ring-white z-20 text-white' 
                                    : 'bg-brand-purple/20 border border-brand-purple text-gray-300 hover:bg-brand-purple/40'
                                } ${isResizing ? 'resizing' : ''} ${isCompleted ? 'completed' : ''}`;
                                
                                const finalLayout = (resizingTask && resizingTask.id === task.id && resizingTask.start && resizingTask.end)
                                  ? { 
                                      ...task.layout,
                                      height: `${((resizingTask.end.getTime() - resizingTask.start.getTime()) / (1000 * 60) / (24*60)) * 100}%`
                                    }
                                  : task.layout;

                                return (
                                    <div
                                        key={task.id}
                                        draggable={!isResizing}
                                        onDragStart={(e) => !isResizing && handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                        className={taskClasses}
                                        style={finalLayout}
                                        onClick={() => onSelectTask(task.id)}
                                    >
                                        {task.source === 'notion' && (
                                            <BookKey size={12} className="absolute top-1 right-1 text-white/50" />
                                        )}
                                        {task.participantIds.length > 1 && (
                                            <div className="w-1 flex flex-col mr-2">
                                                {task.participantIds.map(pId => {
                                                    const participant = participants.find(p => p.id === pId);
                                                    return <div key={pId} className={`flex-1 ${participant?.color}`} style={{ minHeight: '2px' }}/>
                                                })}
                                            </div>
                                        )}
                                        <div className="flex-1 overflow-hidden">
                                             <div className="flex items-center space-x-1.5 mb-0.5">
                                                <TaskStatusIcon status={task.status} />
                                                <p className="font-bold truncate task-title">{taskToDisplay.title}</p>
                                            </div>
                                            <p className="opacity-80 pl-5">{format(taskToDisplay.start!, 'HH:mm')} - {format(taskToDisplay.end!, 'HH:mm')}</p>
                                        </div>
                                        <div
                                            className="resize-handle"
                                            onMouseDown={(e) => handleResizeStart(e, task)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )})}
                    {todayIndex !== -1 && hasTasksToday && <TimeIndicator ref={timeIndicatorRef} top={currentTimeTop} />}
                </div>
            </div>
        </div>
    </div>
  );
};
