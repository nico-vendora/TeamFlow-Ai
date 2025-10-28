import { Task, Client, Department, Participant, Database, TaskStatus } from './types';
import { addHours, addDays, set, subDays } from 'date-fns';

const now = new Date();

export const PARTICIPANT_COLORS = [
  // Vibrant Palette
  'bg-rose-400', 'bg-pink-400', 'bg-fuchsia-400', 'bg-purple-400', 'bg-violet-400',
  'bg-indigo-400', 'bg-blue-400', 'bg-sky-400', 'bg-cyan-400', 'bg-teal-400',
  'bg-emerald-400', 'bg-green-400', 'bg-lime-400', 'bg-yellow-400', 'bg-amber-400',
  'bg-orange-400', 'bg-red-400', 
  // Neutral options
  'bg-slate-400', 'bg-neutral-400', 'bg-stone-400'
];

export const mockClients: Client[] = [
  { id: 'cli_1', name: '3aChem', email: 'contact@3achem.com', communicationPreferences: 'Prefers formal communication. Send weekly summaries on Friday afternoons.' },
  { id: 'cli_2', name: 'Natura House', email: 'support@naturahouse.it', communicationPreferences: 'Casual and friendly tone. Likes to be updated as soon as a task is completed.' },
  { id: 'cli_3', name: 'Global Solutions', email: 'team@globalsolutions.com', communicationPreferences: 'Strictly professional. Use bullet points to summarize progress. No informal language.' },
];

export const mockDepartments: Department[] = [
  { id: 'dep_1', name: 'SEO', color: 'bg-green-500' },
  { id: 'dep_2', name: 'Development', color: 'bg-blue-500' },
  { id: 'dep_3', name: 'Marketing', color: 'bg-purple-500' },
];

export const mockParticipants: Participant[] = [
  { id: 'par_1', name: 'Nicolò Bineri', color: PARTICIPANT_COLORS[1] },
  { id: 'par_2', name: 'Stefano Chirico', color: PARTICIPANT_COLORS[6] },
  { id: 'par_3', name: 'Salvatore Musolino', color: PARTICIPANT_COLORS[5] },
];

export const mockDatabases: Database[] = [
    {
        id: 'db_1',
        name: 'Vendor Database',
        participants: mockParticipants,
    }
];


export const mockTasks: Task[] = [
  // Shared Task
  {
    id: 'task_shared',
    title: 'Q4 Strategy Meeting',
    start: set(now, { hours: 14, minutes: 0, seconds: 0 }),
    end: set(now, { hours: 15, minutes: 0, seconds: 0 }),
    status: TaskStatus.NotStarted,
    clientId: 'cli_3',
    departmentId: 'dep_3',
    participantIds: ['par_1', 'par_3'], 
  },
  // Overlapping tasks for today
  {
    id: 'task_overlap_1',
    title: 'Review Ad Campaign',
    start: set(now, { hours: 10, minutes: 0, seconds: 0 }),
    end: set(now, { hours: 11, minutes: 0, seconds: 0 }),
    status: TaskStatus.InProgress,
    clientId: 'cli_1',
    departmentId: 'dep_3',
    participantIds: ['par_1'],
  },
  {
    id: 'task_overlap_2',
    title: 'Client Call: Natura House',
    start: set(now, { hours: 10, minutes: 30, seconds: 0 }),
    end: set(now, { hours: 11, minutes: 30, seconds: 0 }),
    status: TaskStatus.NotStarted,
    clientId: 'cli_2',
    departmentId: 'dep_1',
    participantIds: ['par_2'],
  },
  {
    id: 'task_overlap_3',
    title: 'Code Refactoring',
    start: set(now, { hours: 10, minutes: 45, seconds: 0 }),
    end: set(now, { hours: 12, minutes: 0, seconds: 0 }),
    status: TaskStatus.NotStarted,
    clientId: 'cli_3',
    departmentId: 'dep_2',
    participantIds: ['par_3'],
  },
  // Non-overlapping task
  {
    id: 'task_solo',
    title: 'Prepare Marketing Brief',
    start: set(now, { hours: 13, minutes: 0, seconds: 0 }),
    end: set(now, { hours: 13, minutes: 45, seconds: 0 }),
    status: TaskStatus.Done,
    clientId: 'cli_1',
    departmentId: 'dep_3',
    participantIds: ['par_1'],
    communication: 'Marketing brief is ready for review.',
    aiCommunication: 'The marketing brief has been prepared and is now available for your review. Please let us know if you have any feedback.'
  },
   // Task that is Done but awaiting communication
  {
    id: 'task_awaiting_comm',
    title: 'Finalize Website Copy',
    start: set(subDays(now, 1), { hours: 16, minutes: 0, seconds: 0 }),
    end: set(subDays(now, 1), { hours: 17, minutes: 30, seconds: 0 }),
    status: TaskStatus.Done,
    clientId: 'cli_2',
    departmentId: 'dep_3',
    participantIds: ['par_1'],
  },
  // Another set of overlapping tasks
  {
    id: 'task_overlap_4',
    title: 'SEO Keyword Research',
    start: set(addDays(now, 1), { hours: 9, minutes: 0, seconds: 0 }),
    end: set(addDays(now, 1), { hours: 10, minutes: 30, seconds: 0 }),
    status: TaskStatus.NotStarted,
    clientId: 'cli_2',
    departmentId: 'dep_1',
    participantIds: ['par_2'],
  },
  {
    id: 'task_overlap_5',
    title: 'Design Mockups',
    start: set(addDays(now, 1), { hours: 9, minutes: 0, seconds: 0 }),
    end: set(addDays(now, 1), { hours: 10, minutes: 0, seconds: 0 }),
    status: TaskStatus.InProgress,
    clientId: 'cli_3',
    departmentId: 'dep_2',
    participantIds: ['par_3'],
  },
];