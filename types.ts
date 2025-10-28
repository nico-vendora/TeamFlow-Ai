
export enum TaskStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Done = 'Done',
}

export enum View {
  Calendar = 'Calendar',
  Inbox = 'Inbox',
  Communications = 'Communications',
  Clients = 'Clients',
  Database = 'Database',
}

export enum CalendarDisplayMode {
    Day = 'Day',
    Week = 'Week',
    Month = 'Month',
}

export enum ConnectionStatus {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Connecting = 'connecting',
}

export interface Client {
  id: string;
  name: string;
  email: string;
  communicationPreferences?: string;
}

export interface Department {
  id: string;
  name: string;
  color: string; // Tailwind color class e.g., 'bg-green-500'
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  notionUserId?: string;
}

export interface Database {
  id: string;
  name: string;
  participants: Participant[];
  type?: 'native' | 'notion';
  sourceId?: string;
}


export interface Task {
  id: string;
  title: string;
  start: Date | null;
  end: Date | null;
  status: TaskStatus;
  clientId: string;
  departmentId: string;
  participantIds: string[];
  communication?: string;
  aiCommunication?: string;
  source?: 'native' | 'notion';
  notionLastEdited?: string;
}

export interface ImportedTask {
    id: string;
    title: string;
    start: Date | null;
    end: Date | null;
    status: TaskStatus;
    assignees: { id: string, name: string | null }[];
    lastEditedTime: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export type NotionPropertyType = 'title' | 'rich_text' | 'select' | 'status' | 'date' | 'people' | 'multi_select' | 'number' | 'checkbox' | 'url' | 'email' | 'phone_number' | 'formula' | 'relation' | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time' | 'last_edited_by';

export interface NotionProperty {
  id: string;
  name: string;
  type: NotionPropertyType;
}

export interface NotionPropertyMap {
  title: string;
  status: string;
  date: string;
  assign: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  parentTitle: string | null;
  propertiesPreview: { name: string; type: NotionPropertyType }[];
  properties: NotionProperty[];
}

export interface NotionTaskPreview {
    title: string;
    date: string | null;
}
