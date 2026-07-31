import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_HOST = "bdnolakqylcvspodpwyb.supabase.co";
// Service Role Key provided by user to bypass RLS policies
const SERVICE_ROLE_KEY = process.argv[2] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbm9sYWtxeWxjdnNwb2Rwd3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY5NjYxNywiZXhwIjoyMDY5MjcyNjE3fQ.h30lec-aYJvhWLZslbX0MKJUJuULM7_SJUYyNvIZgFQ";

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
  'system_settings',
  'user_ai_provider_keys'
];

function fetchTableData(table) {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_HOST,
      path: `/rest/v1/${table}?select=*`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
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
  console.log('=== One-Time Full PostgreSQL to SQLite Import Script (Service Role Key) ===');
  const fullImportMap = {};

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

  const publicOutputPath = path.join(__dirname, '..', 'public', 'importedFullDatabase.json');
  const srcOutputPath = path.join(__dirname, '..', 'src', 'services', 'db', 'importedFullDatabase.json');

  fs.writeFileSync(publicOutputPath, JSON.stringify(fullImportMap, null, 2), 'utf-8');
  fs.writeFileSync(srcOutputPath, JSON.stringify(fullImportMap, null, 2), 'utf-8');

  console.log(`\n[SUCCESS] Full PostgreSQL export complete!`);
  console.log(`Saved datasets to:`);
  console.log(` - ${publicOutputPath}`);
  console.log(` - ${srcOutputPath}`);
}

main();
