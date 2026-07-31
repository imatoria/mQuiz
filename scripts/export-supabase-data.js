import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_HOST = "bdnolakqylcvspodpwyb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbm9sYWtxeWxjdnNwb2Rwd3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTY2MTcsImV4cCI6MjA2OTI3MjYxN30.HQ7nSVk61iT3Asy-7cn1-K_-TLAnu9nkdfuO-KfM1o8";

const TABLES = [
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
  console.log('Exporting data from Supabase via HTTPS REST API...');
  const exportDataMap = {};

  for (const table of TABLES) {
    process.stdout.write(`Fetching ${table}... `);
    const result = await fetchTableData(table);
    if (result.error) {
      console.log(`[WARNING] ${result.error}`);
      exportDataMap[table] = [];
    } else {
      console.log(`[OK] ${result.data.length} rows`);
      exportDataMap[table] = result.data;
    }
  }

  const outputDir = path.join(__dirname, '..', 'src', 'services', 'db');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'initialSeedData.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportDataMap, null, 2), 'utf-8');
  console.log(`Export complete! Written to ${outputPath}`);
}

main();
