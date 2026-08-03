import { IDatabaseProvider } from './types';
import { CloudflareD1Provider } from './providers/CloudflareD1Provider';

class DatabaseService {
  private provider: IDatabaseProvider;

  constructor(provider?: IDatabaseProvider) {
    this.provider = provider || new CloudflareD1Provider();
  }

  setProvider(provider: IDatabaseProvider) {
    this.provider = provider;
  }

  getProvider(): IDatabaseProvider {
    return this.provider;
  }

  async init(): Promise<void> {
    await this.provider.init();
  }

  // --- Profiles ---
  async getProfiles() {
    return this.provider.query('SELECT * FROM profiles ORDER BY created_at DESC');
  }

  async getProfileById(id: string) {
    return this.provider.queryOne('SELECT * FROM profiles WHERE id = ?', [id]);
  }

  async getProfileByUserId(userId: string) {
    return this.provider.queryOne('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  }

  async createProfile(profile: any) {
    const record = {
      id: profile.id || crypto.randomUUID(),
      user_id: profile.user_id || profile.id || crypto.randomUUID(),
      full_name: profile.full_name || '',
      avatar_url: profile.avatar_url || null,
      role: profile.role || 'student',
      is_approved: profile.is_approved ? 1 : 0,
      email: profile.email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.provider.execute('INSERT INTO profiles (id, user_id, full_name, avatar_url, role, is_approved, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [record]);
  }

  async updateProfile(id: string, updates: any) {
    return this.provider.execute('UPDATE profiles SET ? WHERE id = ?', [updates, id]);
  }

  // --- Classes & Subjects ---
  async getClasses() {
    return this.provider.query('SELECT * FROM classes WHERE is_active = 1 ORDER BY display_order ASC');
  }

  async createClass(classData: any) {
    const record = {
      id: classData.id || crypto.randomUUID(),
      teacher_id: classData.teacher_id  || 'system',
      class_name: classData.class_name,
      class_key: classData.class_key || classData.class_name.toLowerCase().replace(/\s+/g, '_'),
      display_order: classData.display_order || 0,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.provider.execute('INSERT INTO classes (id, teacher_id, class_name, class_key, display_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [record]);
  }

  async getSubjects() {
    return this.provider.query('SELECT * FROM subjects WHERE is_active = 1 ORDER BY display_order ASC');
  }

  async createSubject(subjectData: any) {
    const record = {
      id: subjectData.id || crypto.randomUUID(),
      teacher_id: subjectData.teacher_id  || 'system',
      subject_name: subjectData.subject_name,
      subject_code: subjectData.subject_code || subjectData.subject_name.substring(0, 4).toUpperCase(),
      icon_name: subjectData.icon_name || 'book',
      color: subjectData.color || '#3B82F6',
      display_order: subjectData.display_order || 0,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.provider.execute('INSERT INTO subjects (id, teacher_id, subject_name, subject_code, icon_name, color, display_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [record]);
  }

  // --- Documents & Pages ---
  async getDocuments(userId?: string) {
    if (userId) {
      return this.provider.query('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    }
    return this.provider.query('SELECT * FROM documents ORDER BY created_at DESC');
  }

  async createDocument(doc: any) {
    const record = {
      id: doc.id || crypto.randomUUID(),
      user_id: doc.user_id,
      title: doc.title,
      class_id: doc.class_id || null,
      subject_id: doc.subject_id || null,
      total_pages: doc.total_pages || 0,
      processing_status: doc.processing_status || 'completed',
      created_at: new Date().toISOString()
    };
    return this.provider.execute('INSERT INTO documents (id, user_id, title, class_id, subject_id, total_pages, processing_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [record]);
  }

  // --- Questions ---
  async getQuestions(filters?: { classId?: string; subjectId?: string; userId?: string }) {
    let sql = 'SELECT * FROM questions WHERE is_deleted = 0';
    const params: any[] = [];
    if (filters?.classId) {
      sql += ' AND class_id = ?';
      params.push(filters.classId);
    }
    if (filters?.subjectId) {
      sql += ' AND subject_id = ?';
      params.push(filters.subjectId);
    }
    sql += ' ORDER BY created_at DESC';
    return this.provider.query(sql, params);
  }

  async createQuestion(question: any) {
    const record = {
      id: question.id || crypto.randomUUID(),
      user_id: question.user_id,
      class_id: question.class_id || null,
      subject_id: question.subject_id || null,
      document_id: question.document_id || null,
      page_number: question.page_number || null,
      question_text: question.question_text,
      question_type: question.question_type || 'multiple_choice',
      options: typeof question.options === 'string' ? question.options : JSON.stringify(question.options || []),
      correct_answer: question.correct_answer || '',
      explanation: question.explanation || '',
      marks: question.marks || 1,
      tags: typeof question.tags === 'string' ? question.tags : JSON.stringify(question.tags || []),
      is_deleted: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.provider.execute('INSERT INTO questions (id, user_id, class_id, subject_id, document_id, page_number, question_text, question_type, options, correct_answer, explanation, marks, tags, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [record]);
  }

  // --- Question Papers & Attempts ---
  async getQuestionPapers() {
    return this.provider.query('SELECT * FROM question_papers WHERE is_deleted = 0 ORDER BY created_at DESC');
  }

  async createQuestionPaper(paper: any) {
    const record = {
      id: paper.id || crypto.randomUUID(),
      user_id: paper.user_id,
      title: paper.title,
      class_id: paper.class_id || null,
      subject_id: paper.subject_id || null,
      total_questions: paper.total_questions || 0,
      time_limit_minutes: paper.time_limit_minutes || 60,
      assign_to_all: paper.assign_to_all ? 1 : 0,
      start_time: paper.start_time || null,
      end_time: paper.end_time || null,
      max_attempts: paper.max_attempts || 1,
      show_results: paper.show_results ? 1 : 1,
      is_deleted: 0,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return this.provider.execute('INSERT INTO question_papers (id, user_id, title, class_id, subject_id, total_questions, time_limit_minutes, assign_to_all, start_time, end_time, max_attempts, show_results, is_deleted, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [record]);
  }

  async getPaperAttempts(userId?: string) {
    if (userId) {
      return this.provider.query('SELECT * FROM paper_attempts WHERE user_id = ? ORDER BY started_at DESC', [userId]);
    }
    return this.provider.query('SELECT * FROM paper_attempts ORDER BY started_at DESC');
  }

  // --- Analytics ---
  async getSystemAnalytics() {
    const profiles = await this.provider.query('SELECT * FROM profiles');
    const documents = await this.provider.query('SELECT * FROM documents');
    const questions = await this.provider.query('SELECT * FROM questions WHERE is_deleted = 0');
    const papers = await this.provider.query('SELECT * FROM question_papers WHERE is_deleted = 0');
    const attempts = await this.provider.query('SELECT * FROM paper_attempts');

    return {
      data: {
        totalUsers: profiles.data?.length || 0,
        totalDocuments: documents.data?.length || 0,
        totalQuestions: questions.data?.length || 0,
        totalPapers: papers.data?.length || 0,
        totalAttempts: attempts.data?.length || 0
      },
      error: null
    };
  }

  // --- AI Providers ---
  async getAiProviders() {
    return this.provider.query('SELECT * FROM ai_providers ORDER BY name ASC');
  }
}

export const dbService = new DatabaseService();
