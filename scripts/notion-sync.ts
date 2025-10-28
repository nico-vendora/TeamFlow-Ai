// To run:
// 1. Make sure you have ts-node installed: npm install -g ts-node
// 2. Set your Notion secret: export NOTION_SECRET="your_secret_here"
// 3. Run the script: ts-node scripts/notion-sync.ts --db <YOUR_DATABASE_ID> --title Name --date Scadenza --status Stato --assign Manager

import { Client } from '@notionhq/client';
import { NotionPropertyMap } from '../types';
import { addMinutes } from 'date-fns';

// --- Re-implementing a subset of the service logic for Node.js using the official SDK ---

const makeNotion = () => {
    const apiKey = process.env.NOTION_SECRET;
    if (!apiKey) {
        console.error("ERROR: NOTION_SECRET environment variable is not set.");
        // FIX: Cast process to any to access exit method in non-node TS environments.
        (process as any).exit(1);
    }
    return new Client({ auth: apiKey });
};

async function queryAllPagesCLI(notion: Client, databaseId: string, log: (msg: string) => void): Promise<any[]> {
    const allResults: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;
    let pageCount = 0;

    log('Starting to fetch all pages from Notion...');
    while (hasMore) {
        pageCount++;
        const response = await notion.databases.query({
            database_id: databaseId,
            page_size: 100,
            start_cursor: startCursor,
        });

        allResults.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor ?? undefined;
        log(`Page ${pageCount} fetched ${response.results.length} items. More pages: ${hasMore}.`);
    }
    log(`Finished fetching ${pageCount} page(s) with a total of ${allResults.length} items.`);
    return allResults;
}

const parseArgs = (): { dbId: string; mapping: Partial<NotionPropertyMap> } => {
    // FIX: Cast process to any to access argv property in non-node TS environments.
    const args = (process as any).argv.slice(2);
    const dbArg = args.find(a => a.startsWith('--db='));
    if (!dbArg) {
        console.error("ERROR: Missing required argument: --db=<databaseId>");
        // FIX: Cast process to any to access exit method in non-node TS environments.
        (process as any).exit(1);
    }
    const dbId = dbArg.split('=')[1];

    const mapping: Partial<NotionPropertyMap> = {};
    const titleArg = args.find(a => a.startsWith('--title='));
    if(titleArg) mapping.title = titleArg.split('=')[1];

    const dateArg = args.find(a => a.startsWith('--date='));
    if(dateArg) mapping.date = dateArg.split('=')[1];

    const statusArg = args.find(a => a.startsWith('--status='));
    if(statusArg) mapping.status = statusArg.split('=')[1];

    const assignArg = args.find(a => a.startsWith('--assign='));
    if(assignArg) mapping.assign = assignArg.split('=')[1];

    return { dbId, mapping };
};


async function inferMapping(notion: Client, dbId: string): Promise<NotionPropertyMap> {
    const db = await notion.databases.retrieve({ database_id: dbId });
    const props = Object.values(db.properties);
    
    const mapping: Partial<NotionPropertyMap> = {
        // FIX: Cast the result of `.find()` to `any` to handle `unknown` type and allow property access.
        title: (props.find((p: any) => p.type === 'title') as any)?.name,
        // FIX: Cast the result of `.find()` to `any` to handle `unknown` type and allow property access.
        date: (props.find((p: any) => p.type === 'date') as any)?.name,
        // FIX: Cast the result of `.find()` to `any` to handle `unknown` type and allow property access.
        status: (props.find((p: any) => p.type === 'status' || p.type === 'select') as any)?.name,
        // FIX: Cast the result of `.find()` to `any` to handle `unknown` type and allow property access.
        assign: (props.find((p: any) => p.type === 'people') as any)?.name,
    };
    
    if (!mapping.title || !mapping.date || !mapping.status || !mapping.assign) {
        throw new Error(`Could not automatically infer all required properties. Found: ${JSON.stringify(mapping)}`);
    }
    return mapping as NotionPropertyMap;
}

const main = async () => {
    console.log("--- Notion Sync Dry-Run ---");
    const { dbId, mapping: argMapping } = parseArgs();
    const notion = makeNotion();

    const mapping = Object.keys(argMapping).length === 4
        ? argMapping as NotionPropertyMap
        : await inferMapping(notion, dbId);
    
    console.log(`Using mapping: ${JSON.stringify(mapping, null, 2)}`);

    let skippedCount = 0;
    
    const allPages = await queryAllPagesCLI(notion, dbId, console.log);
    
    const importedTasks = allPages.filter(page => {
        // @ts-ignore
        const titleProp = page.properties[mapping.title];
        const title = titleProp?.type === 'title' ? titleProp.title?.[0]?.plain_text : null;
        
        // @ts-ignore
        const dateProp = page.properties[mapping.date];
        const hasDate = dateProp?.type === 'date' && dateProp.date?.start;

        if (!title || !hasDate) {
            skippedCount++;
            return false;
        }
        return true;
    });

    console.log("\n--- DRY-RUN COMPLETE ---");
    console.log(`Total items retrieved from Notion: ${allPages.length}`);
    console.log(`Imported tasks (have title and date): ${importedTasks.length}`);
    console.log(`Skipped tasks (missing title or date): ${skippedCount}`);
    console.log("------------------------");
};

main().catch(error => {
    console.error("\n--- SCRIPT FAILED ---");
    console.error(error);
    // FIX: Cast process to any to access exit method in non-node TS environments.
    (process as any).exit(1);
});
