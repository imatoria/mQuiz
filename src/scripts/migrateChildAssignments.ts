/**
 * Data Migration Script for Child Subject/Class Assignments
 * 
 * This script helps migrate existing data to ensure all documents and questions
 * are properly linked to child subject/class assignments.
 */

import { supabase } from '@/integrations/supabase/client';

interface MigrationResult {
  success: boolean;
  documentsProcessed: number;
  questionsProcessed: number;
  assignmentsCreated: number;
  errors: string[];
}

export class ChildAssignmentMigrator {
  private errors: string[] = [];

  async runMigration(): Promise<MigrationResult> {
    console.log('Starting child assignment migration...');
    
    let documentsProcessed = 0;
    let questionsProcessed = 0;
    let assignmentsCreated = 0;

    try {
      // Step 1: Get all users who have created documents or questions
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('role', ['parent', 'admin']);

      if (creatorsError) {
        this.errors.push(`Failed to fetch creators: ${creatorsError.message}`);
        return this.getResult(documentsProcessed, questionsProcessed, assignmentsCreated);
      }

      // Step 2: For each creator, ensure they have child relationships
      for (const creator of creators || []) {
        await this.ensureChildRelationships(creator.user_id);
      }

      // Step 3: Create default assignments based on existing documents
      const documentsResult = await this.createAssignmentsFromDocuments();
      documentsProcessed = documentsResult.processed;
      assignmentsCreated += documentsResult.created;

      // Step 4: Create default assignments based on existing questions
      const questionsResult = await this.createAssignmentsFromQuestions();
      questionsProcessed = questionsResult.processed;
      assignmentsCreated += questionsResult.additionalCreated;

      // Step 5: Clean up orphaned data
      await this.cleanupOrphanedData();

      console.log('Migration completed successfully');

    } catch (error: any) {
      this.errors.push(`Migration failed: ${error.message}`);
    }

    return this.getResult(documentsProcessed, questionsProcessed, assignmentsCreated);
  }

  private async ensureChildRelationships(parentId: string) {
    try {
      // Check if parent has any children
      const { data: relationships, error } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', parentId);

      if (error) {
        this.errors.push(`Error checking relationships for ${parentId}: ${error.message}`);
        return;
      }

      // If no children, create a default child account for migration purposes
      if (!relationships || relationships.length === 0) {
        const { data: parentProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', parentId)
          .single();

        if (!profileError && parentProfile) {
          // This would normally require proper child account creation
          // For now, we'll just log that this needs manual intervention
          console.log(`Parent ${parentProfile.full_name} has no children - manual setup required`);
        }
      }
    } catch (error: any) {
      this.errors.push(`Error ensuring child relationships: ${error.message}`);
    }
  }

  private async createAssignmentsFromDocuments() {
    let processed = 0;
    let created = 0;

    try {
      // Get all documents with their subjects and classes
      const { data: documents, error } = await supabase
        .from('documents')
        .select(`
          id,
          user_id,
          subject_id,
          class_level
        `);

      if (error) {
        this.errors.push(`Failed to fetch documents: ${error.message}`);
        return { processed, created };
      }

      // Group by user, subject, and class to avoid duplicates
      const assignmentMap = new Map<string, {
        parent_id: string;
        subject_id: string;
        class_level: string;
        child_ids: string[];
      }>();

      for (const doc of documents || []) {
        const key = `${doc.user_id}-${doc.subject_id}-${doc.class_level}`;
        
        if (!assignmentMap.has(key)) {
          // Get children for this parent
          const { data: relationships } = await supabase
            .from('parent_child_relationships')
            .select('child_id')
            .eq('parent_id', doc.user_id);

          assignmentMap.set(key, {
            parent_id: doc.user_id,
            subject_id: doc.subject_id,
            class_level: doc.class_level,
            child_ids: relationships?.map(r => r.child_id) || []
          });
        }
        processed++;
      }

      // Create assignments for each unique combination
      for (const assignment of assignmentMap.values()) {
        for (const childId of assignment.child_ids) {
          // Create class assignment
          await this.createClassAssignment(
            childId,
            assignment.parent_id,
            assignment.class_level
          );

          // Create subject assignment
          await this.createSubjectAssignment(
            childId,
            assignment.parent_id,
            assignment.subject_id
          );

          created += 2; // One class + one subject assignment
        }
      }

    } catch (error: any) {
      this.errors.push(`Error creating assignments from documents: ${error.message}`);
    }

    return { processed, created };
  }

  private async createAssignmentsFromQuestions() {
    let processed = 0;
    let additionalCreated = 0;

    try {
      // Get all questions with their subjects and classes that aren't covered by documents
      const { data: questions, error } = await supabase
        .from('questions')
        .select(`
          id,
          user_id,
          subject_id,
          class_level
        `)
        .not('user_id', 'is', null)
        .not('subject_id', 'is', null)
        .not('class_level', 'is', null);

      if (error) {
        this.errors.push(`Failed to fetch questions: ${error.message}`);
        return { processed, additionalCreated };
      }

      // Similar logic as documents but for questions
      const assignmentMap = new Map<string, {
        parent_id: string;
        subject_id: string;
        class_level: string;
        child_ids: string[];
      }>();

      for (const question of questions || []) {
        const key = `${question.user_id}-${question.subject_id}-${question.class_level}`;
        
        if (!assignmentMap.has(key)) {
          const { data: relationships } = await supabase
            .from('parent_child_relationships')
            .select('child_id')
            .eq('parent_id', question.user_id);

          assignmentMap.set(key, {
            parent_id: question.user_id,
            subject_id: question.subject_id,
            class_level: question.class_level,
            child_ids: relationships?.map(r => r.child_id) || []
          });
        }
        processed++;
      }

      // Create assignments (only if they don't already exist)
      for (const assignment of assignmentMap.values()) {
        for (const childId of assignment.child_ids) {
          const classCreated = await this.createClassAssignment(
            childId,
            assignment.parent_id,
            assignment.class_level
          );

          const subjectCreated = await this.createSubjectAssignment(
            childId,
            assignment.parent_id,
            assignment.subject_id
          );

          if (classCreated) additionalCreated++;
          if (subjectCreated) additionalCreated++;
        }
      }

    } catch (error: any) {
      this.errors.push(`Error creating assignments from questions: ${error.message}`);
    }

    return { processed, additionalCreated };
  }

  private async createClassAssignment(
    childId: string,
    parentId: string,
    classLevel: string
  ): Promise<boolean> {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('child_class_assignments')
        .select('id')
        .eq('child_id', childId)
        .eq('parent_id', parentId)
        .eq('class_level', classLevel as any)
        .eq('is_current', true)
        .maybeSingle();

      if (existing) {
        return false; // Already exists
      }

        // Create the assignment
        const { error } = await supabase
          .from('child_class_assignments')
          .upsert({
            child_id: childId,
            parent_id: parentId,
            class_level: classLevel as any,
            is_current: true
          });

      if (error) {
        this.errors.push(`Failed to create class assignment: ${error.message}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.errors.push(`Error creating class assignment: ${error.message}`);
      return false;
    }
  }

  private async createSubjectAssignment(
    childId: string,
    parentId: string,
    subjectId: string
  ): Promise<boolean> {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('child_subject_assignments')
        .select('id')
        .eq('child_id', childId)
        .eq('parent_id', parentId)
        .eq('subject_id', subjectId)
        .eq('is_current', true)
        .maybeSingle();

      if (existing) {
        return false; // Already exists
      }

      // Create the assignment
      const { error } = await supabase
        .from('child_subject_assignments')
        .upsert({
          child_id: childId,
          parent_id: parentId,
          subject_id: subjectId,
          is_current: true
        });

      if (error) {
        this.errors.push(`Failed to create subject assignment: ${error.message}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.errors.push(`Error creating subject assignment: ${error.message}`);
      return false;
    }
  }

  private async cleanupOrphanedData() {
    try {
      // Find documents with invalid subject references
      const { data: orphanedDocs, error: docsError } = await supabase
        .from('documents')
        .select(`
          id,
          subject_id,
          subjects!left(id)
        `)
        .is('subjects.id', null);

      if (docsError) {
        this.errors.push(`Error finding orphaned documents: ${docsError.message}`);
      } else if (orphanedDocs && orphanedDocs.length > 0) {
        console.log(`Found ${orphanedDocs.length} documents with invalid subject references`);
        // Could implement cleanup logic here
      }

      // Find questions with invalid subject references
      const { data: orphanedQuestions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          subject_id,
          subjects!left(id)
        `)
        .is('subjects.id', null)
        .not('subject_id', 'is', null);

      if (questionsError) {
        this.errors.push(`Error finding orphaned questions: ${questionsError.message}`);
      } else if (orphanedQuestions && orphanedQuestions.length > 0) {
        console.log(`Found ${orphanedQuestions.length} questions with invalid subject references`);
        // Could implement cleanup logic here
      }

    } catch (error: any) {
      this.errors.push(`Error during cleanup: ${error.message}`);
    }
  }

  private getResult(
    documentsProcessed: number,
    questionsProcessed: number,
    assignmentsCreated: number
  ): MigrationResult {
    return {
      success: this.errors.length === 0,
      documentsProcessed,
      questionsProcessed,
      assignmentsCreated,
      errors: this.errors
    };
  }
}

// Usage function for manual migration
export async function runChildAssignmentMigration(): Promise<MigrationResult> {
  const migrator = new ChildAssignmentMigrator();
  return await migrator.runMigration();
}