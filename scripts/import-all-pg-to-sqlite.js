import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_HOST = "bdnolakqylcvspodpwyb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbm9sYWtxeWxjdnNwb2Rwd3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTY2MTcsImV4cCI6MjA2OTI3MjYxN30.HQ7nSVk61iT3Asy-7cn1-K_-TLAnu9nkdfuO-KfM1o8";

const ALL_TABLES = [
  'ai_providers',
  'announcements',
  'announcement_recipients',
  'audit_logs',
  'classes_parent',
  'subjects_parent',
  'child_class_assignments',
  'child_subject_assignments',
  'documents',
  'document_pages',
  'email_queue',
  'messages',
  'notifications',
  'paper_assignments',
  'paper_attempts',
  'paper_sessions',
  'paper_violations',
  'parent_child_relationships',
  'profiles',
  'questions',
  'question_papers',
  'question_paper_questions',
  'system_settings'
];

function fetchTableData(table) {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_HOST,
      path: `/rest/v1/${table}?select=*`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(body);
            resolve({ table, data: parsed, error: null });
          } else {
            resolve({ table, data: [], error: `HTTP ${res.statusCode}: ${body}` });
          }
        } catch (err) {
          resolve({ table, data: [], error: err.message });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ table, data: [], error: e.message });
    });

    req.end();
  });
}

async function main() {
  console.log('=== One-Time Full PostgreSQL to SQLite Import Script ===');
  const fullImportMap = {};

  // Check if a local dump file was passed (e.g. node scripts/import-all-pg-to-sqlite.js ./my-pg-dump.json)
  const customDumpPath = process.argv[2];
  if (customDumpPath && fs.existsSync(customDumpPath)) {
    console.log(`Reading local PostgreSQL dump file: ${customDumpPath}`);
    const dumpContent = JSON.parse(fs.readFileSync(customDumpPath, 'utf-8'));
    const outputPath = path.join(__dirname, '..', 'public', 'importedFullDatabase.json');
    fs.writeFileSync(outputPath, JSON.stringify(dumpContent, null, 2), 'utf-8');
    console.log(`[SUCCESS] Full import saved to ${outputPath}`);
    return;
  }

  // Otherwise, attempt live fetch from Supabase
  for (const table of ALL_TABLES) {
    process.stdout.write(`Fetching ${table}... `);
    const result = await fetchTableData(table);
    if (result.error) {
      console.log(`[NOTICE] ${result.error}`);
      fullImportMap[table] = [];
    } else {
      console.log(`[OK] ${result.data.length} rows`);
      fullImportMap[table] = result.data;
    }
  }

  const outputPath = path.join(__dirname, '..', 'public', 'importedFullDatabase.json');
  fs.writeFileSync(outputPath, JSON.stringify(fullImportMap, null, 2), 'utf-8');
  console.log(`\n[SUCCESS] One-time import complete! Saved snapshot to ${outputPath}`);
  console.log(`To load this snapshot into your browser's SQLite database, open Developer Tools Console in mQuiz and run:`);
  console.log(`fetch('/importedFullDatabase.json').then(r=>r.json()).then(data=>{ localStorage.setItem('mquiz_sqlite_db_v1', JSON.stringify(data)); location.reload(); });`);
}

main();
