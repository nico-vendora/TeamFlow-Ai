
import { ImportedTask, NotionDatabase, NotionProperty, NotionPropertyMap, NotionTaskPreview, TaskStatus } from '../types';
import { addMinutes } from 'date-fns';

const PROXY_URL = 'https://corsproxy.io/?';

// Simplified client to work in the browser via proxy
export interface NotionClient {
    apiKey: string;
    fetch: (endpoint: string, options: RequestInit) => Promise<any>;
}

export const makeNotionClient = (apiKey: string): NotionClient => {
    if (!apiKey) {
        throw new Error("A Notion API key is required.");
    }
    return {
        apiKey,
        fetch: async (endpoint: string, options: RequestInit) => {
            const response = await fetch(`${PROXY_URL}https://api.notion.com/v1/${endpoint}`, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${apiKey}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.message || `Notion API Error (${response.status})`);
            }
            return response.json();
        }
    };
};

const mapNotionStatusToTaskStatus = (notionStatus: string): TaskStatus => {
  switch (notionStatus) {
    case 'In progress': return TaskStatus.InProgress;
    case 'Done': return TaskStatus.Done;
    case 'Not started':
    default: return TaskStatus.NotStarted;
  }
};

async function queryAllPages(client: NotionClient, databaseId: string, log: (msg: string) => void): Promise<any[]> {
    const allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;
    let pageCount = 0;

    log('Starting to fetch all pages from Notion...');
    while (hasMore) {
        pageCount++;
        log(`Fetching page ${pageCount}...`);
        const queryPayload: any = { page_size: 100 };
        if (startCursor) queryPayload.start_cursor = startCursor;

        const data = await client.fetch(`databases/${databaseId}/query`, {
            method: 'POST',
            body: JSON.stringify(queryPayload),
        });

        allResults.push(...data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
        log(`Page ${pageCount} fetched ${data.results.length} items. More pages: ${hasMore}.`);
    }
    log(`Finished fetching ${pageCount} page(s) with a total of ${allResults.length} items.`);
    return allResults;
}

function mapPageToTask(page: any, mapping: NotionPropertyMap, log: (msg: string) => void): ImportedTask | null {
    const { properties, id, last_edited_time } = page;
    
    const titleProp = properties[mapping.title];
    const title = titleProp?.type === 'title' ? titleProp.title?.[0]?.plain_text : null;

    const dateProp = properties[mapping.date];
    let start: Date | null = null;
    let end: Date | null = null;
    if (dateProp?.type === 'date' && dateProp.date?.start) {
        start = new Date(dateProp.date.start);
        end = dateProp.date.end ? new Date(dateProp.date.end) : addMinutes(start, 30);
    }
    
    if (!title) {
        log(`Skipping item ID ${id}: Missing required Title.`);
        return null;
    }

    let status = TaskStatus.NotStarted;
    const statusProp = properties[mapping.status];
    if (statusProp?.type === 'status') {
        status = mapNotionStatusToTaskStatus(statusProp.status?.name || 'Not started');
    } else if (statusProp?.type === 'select') {
        status = mapNotionStatusToTaskStatus(statusProp.select?.name || 'Not started');
    }

    const assignProp = properties[mapping.assign];
    const assignees: { id: string, name: string | null }[] = [];
    if (assignProp?.type === 'people' && assignProp.people) {
        for (const user of assignProp.people) {
            assignees.push({ id: user.id, name: user.name });
        }
    }
    
    return { id, title, start, end, status, assignees, lastEditedTime: last_edited_time };
}

export async function importDatabase(
    client: NotionClient,
    databaseId: string,
    log: (msg: string) => void,
    mapping: NotionPropertyMap
): Promise<{ tasks: ImportedTask[], skippedCount: number }> {
    log(`Starting import for database: ${databaseId}`);
    log(`Using mapping: ${JSON.stringify(mapping)}`);

    const allPages = await queryAllPages(client, databaseId, log);
    
    const tasks: ImportedTask[] = [];
    let skippedCount = 0;

    for (const page of allPages) {
        const task = mapPageToTask(page, mapping, log);
        if (task) {
            tasks.push(task);
        } else {
            skippedCount++;
        }
    }

    return { tasks, skippedCount };
}

export async function fetchSharedDatabases(client: NotionClient): Promise<NotionDatabase[]> {
    const searchData = await client.fetch('search', {
        method: 'POST',
        body: JSON.stringify({ 
            filter: { value: 'database', property: 'object' },
            sort: { direction: 'descending', timestamp: 'last_edited_time' }
        }),
    });

    const detailedDatabases = await Promise.all(
        searchData.results.map(async (db: any) => {
            try {
                // Fetch full properties list separately
                const fullDb = await client.fetch(`databases/${db.id}`, { method: 'GET' });
                const properties: NotionProperty[] = Object.entries(fullDb.properties).map(([name, prop]: [string, any]) => ({
                    id: prop.id, name, type: prop.type,
                }));
                
                const getParentTitle = (parent: any): string | null => {
                    if (!parent) return null;
                    switch (parent.type) {
                        case 'page_id': return `Page`;
                        case 'database_id': return `Database`;
                        case 'workspace': return "Workspace";
                        default: return null;
                    }
                };

                return {
                    id: db.id,
                    title: db.title[0]?.plain_text || 'Untitled Database',
                    parentTitle: getParentTitle(db.parent),
                    propertiesPreview: properties.slice(0, 5).map(p => ({ name: p.name, type: p.type })),
                    properties: properties,
                };
            } catch (error) {
                console.warn(`Could not retrieve details for database ${db.id}:`, error);
                return null;
            }
        })
    );
    return detailedDatabases.filter((db): db is NotionDatabase => db !== null);
};

export async function fetchNotionDatabaseProperties(client: NotionClient, databaseId: string): Promise<NotionProperty[]> {
    const data = await client.fetch(`databases/${databaseId}`, { method: 'GET' });
    return Object.entries(data.properties).map(([name, prop]: [string, any]) => ({
        id: prop.id,
        name,
        type: prop.type,
    }));
};


export async function previewDatabaseEntries(client: NotionClient, databaseId: string, properties: NotionProperty[]): Promise<NotionTaskPreview[]> {
    const data = await client.fetch(`databases/${databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify({ page_size: 10 }),
    });

    const titlePropName = properties.find(p => p.type === 'title')?.name;
    const datePropName = properties.find(p => p.type === 'date')?.name;

    if (!titlePropName) {
        throw new Error("Database has no 'title' property to preview.");
    }

    return data.results.map((page: any) => {
        const pageProps = page.properties;
        const title = pageProps[titlePropName]?.title?.[0]?.plain_text || 'Untitled';
        
        let date: string | null = null;
        if (datePropName) {
            const dateValue = pageProps[datePropName]?.date;
            if (dateValue?.start) {
                date = new Date(dateValue.start).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'});
            }
        }
        return { title, date };
    });
}
