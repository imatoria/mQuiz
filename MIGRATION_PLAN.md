Complete Migration Plan: Merge Tests into Papers (Single Entity Architecture)

Overview

Transform the application from a two-entity model (Papers + Tests) to a single-entity model where Papers contain all scheduling and test execution functionality directly.



Phase 1: Database Schema Migration (Week 1-2) => Completed

1.1 Extend question\_papers table

Add test scheduling fields directly to question\_papers:



start\_time (timestamp with time zone, nullable)

end\_time (timestamp with time zone, nullable)

max\_attempts (integer, default 1)

assign\_to\_all (boolean, default true)

show\_results (boolean, default false)

is\_scheduled (boolean, default false) - indicates if paper is scheduled as test

time\_limit\_hours (integer, nullable)

time\_limit\_minutes (integer, nullable)

1.2 Create new assignment table

Replace test\_assignments with paper\_assignments:



id (uuid, primary key)

paper\_id (uuid, references question\_papers.id)

assigned\_to\_user\_id (uuid)

created\_at (timestamp)

1.3 Update attempt tracking

Replace test\_attempts with paper\_attempts:



Change scheduled\_test\_id to paper\_id

Keep all other columns the same

Update foreign key relationships

1.4 Update related tables

test\_sessions → paper\_sessions (change test\_attempt\_id to paper\_attempt\_id)

test\_violations → paper\_violations (change test\_attempt\_id to paper\_attempt\_id)

1.5 Drop obsolete tables

Drop scheduled\_tests table

Drop test\_assignments table

Drop test\_attempts table



Phase 2: Database Functions \& RLS Migration (Week 2-3) => Completed

2.1 Update database functions

create\_scheduled\_test → schedule\_paper

can\_attempt\_test → can\_attempt\_paper

can\_view\_scheduled\_test → can\_view\_scheduled\_paper

get\_active\_test\_attempt → get\_active\_paper\_attempt

detect\_multiple\_sessions → update parameter names

log\_test\_violation → log\_paper\_violation

2.2 Update RLS policies

Migrate all test-related policies to paper-related policies

Update policy names and table references

Ensure proper access control for paper scheduling and attempts

2.3 Update triggers

Update audit triggers for renamed tables

Update activity tracking triggers



Phase 3: Edge Functions Migration (Week 3-4) => Completed

3.1 Update existing functions

complete-test → complete-paper-attempt

save-test-progress → save-paper-progress

detect-multiple-sessions → update to use paper\_attempts

log-test-violation → log-paper-violation

3.2 Function logic updates

Replace scheduled\_test\_id with paper\_id throughout

Update all database queries to use new table names

Maintain same functionality with new schema



Phase 4: TypeScript Types Migration (Week 4) => Completed

4.1 Update Supabase types

Remove scheduled\_tests, test\_assignments, test\_attempts types

Update question\_papers type with new scheduling fields

Add paper\_assignments, paper\_attempts types

Update all relationship definitions

4.2 Update component interfaces

ScheduledTest → merged into QuestionPaper interface

TestAttempt → PaperAttempt

Update all component prop types



Phase 5: Frontend Component Refactoring (Week 5-7) => Completed

5.1 Core component updates

QuestionPaperGenerator → UnifiedPaperCreator (with scheduling fields)

Remove TestScheduler component entirely

Update PapersAndTestsManager → PapersManager (unified interface)

Remove ScheduleManager component

5.2 Student interface updates

StudentDashboard → show scheduled papers instead of tests

TestInterface → PaperInterface (same functionality, different data source)

Update all test-related terminology to paper-related

5.3 Results and analytics updates

All result components update to query paper\_attempts

Update component names and terminology

Maintain same functionality with new data structure

5.4 Navigation updates

Remove "Tests" tab from ParentDashboard

Rename "Papers" to "Papers \& Tests" or just "Papers"

Update all routing and menu items



Phase 6: Backend Query Migration (Week 7-8) => Completed

6.1 Replace all database queries

Update every query from scheduled\_tests to question\_papers

Add WHERE clauses for is\_scheduled = true when needed

Update all JOIN operations to use new table relationships

Replace test\_attempts queries with paper\_attempts

6.2 Update API endpoints (if any)

Maintain same API contracts but use new data sources

Update response structures if needed



Phase 7: UI/UX Enhancements (Week 8-9) => Completed

7.1 Unified paper creation form

Single form with paper generation + optional scheduling

Progressive disclosure for scheduling fields

Smart defaults based on paper properties

Validation for scheduling fields

7.2 Enhanced paper management

Show scheduling status in paper lists

Quick actions: Schedule, Edit Schedule, View Attempts

Paper status indicators (Draft, Scheduled, Active, Completed)

7.3 Improved workflows

"Create Paper \& Schedule Test" workflow

"Schedule Existing Paper" workflow

Bulk operations for paper management



Phase 8: Testing \& Validation (Week 9-10) => Completed

8.1 Data migration testing

Verify all existing data migrated correctly

Test edge cases and data integrity

Performance testing with new schema

8.2 Functionality testing

All paper creation and scheduling workflows

Student test-taking experience unchanged

Results and analytics still work correctly

Parent management interfaces functional

8.3 Security testing

RLS policies working correctly

No data leakage between users

Proper access controls maintained



Phase 9: Deployment \& Cleanup (Week 10-11) => Completed

9.1 Production migration

Database migration scripts

Rollback procedures

Monitoring and alerts

9.2 Code cleanup

Remove all test-related components and files

Update documentation and comments

Clean up unused imports and dependencies

9.3 User communication

Update help documentation

User notification of interface changes

Training materials if needed





Benefits of This Architecture:

Simplified Mental Model: Papers are the primary entity, scheduling is just a property

Reduced Complexity: One entity instead of two with complex relationships

Better UX: Single workflow for paper creation and scheduling

Cleaner Database: Fewer tables and simpler relationships

Easier Maintenance: Less code duplication and complexity

Intuitive Navigation: Papers are the central concept throughout

Risk Mitigation:

Data Loss: Comprehensive backup and migration testing

Downtime: Staged migration with rollback procedures

User Confusion: Clear communication and documentation

Functionality Loss: Thorough testing of all workflows

Performance: Database optimization and indexing

This plan completely eliminates the separation between Papers and Tests, creating a unified entity that handles both document generation and test scheduling within the same conceptual and technical framework.

