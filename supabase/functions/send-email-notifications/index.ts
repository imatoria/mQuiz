import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailTemplate {
  template_name: string;
  subject: string;
  template_data: Record<string, any>;
  recipient_email: string;
  recipient_id: string;
}

const generateEmailContent = (template: EmailTemplate): string => {
  const { template_name, template_data } = template;
  
  switch (template_name) {
    case 'test_assignment':
      return `
        <h2>New Test Assignment</h2>
        <p>Dear ${template_data.student_name || 'Student'},</p>
        <p>You have been assigned a new test: <strong>${template_data.test_title}</strong></p>
        <p><strong>Due Date:</strong> ${template_data.due_date}</p>
        <p><strong>Duration:</strong> ${template_data.duration} minutes</p>
        <p>Please log in to your account to take the test.</p>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
    
    case 'test_result':
      return `
        <h2>Test Results Available</h2>
        <p>Dear ${template_data.student_name || 'Student'},</p>
        <p>Your test results for <strong>${template_data.test_title}</strong> are now available.</p>
        <p><strong>Score:</strong> ${template_data.score}/${template_data.total_questions}</p>
        <p><strong>Percentage:</strong> ${Math.round((template_data.score / template_data.total_questions) * 100)}%</p>
        <p>Log in to view detailed results and feedback.</p>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
    
    case 'deadline_reminder':
      return `
        <h2>Test Deadline Reminder</h2>
        <p>Dear ${template_data.student_name || 'Student'},</p>
        <p>This is a reminder that the test <strong>${template_data.test_title}</strong> is due soon.</p>
        <p><strong>Due Date:</strong> ${template_data.due_date}</p>
        <p>Please complete the test before the deadline.</p>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
    
    case 'announcement':
      return `
        <h2>New Announcement</h2>
        <p>Dear ${template_data.recipient_name || 'User'},</p>
        <h3>${template_data.announcement_title}</h3>
        <div>${template_data.announcement_content}</div>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
    
    case 'new_message':
      return `
        <h2>New Message</h2>
        <p>Dear ${template_data.recipient_name || 'User'},</p>
        <p>You have received a new message from ${template_data.sender_name}:</p>
        <p><strong>Subject:</strong> ${template_data.subject}</p>
        <blockquote>${template_data.message_preview}</blockquote>
        <p>Log in to read the full message and reply.</p>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
    
    case 'test_email':
      return `
        <h2>Test Email</h2>
        <p>This is a test email from Knowledge Builder.</p>
        <div>${template_data.content || 'Test email content'}</div>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
    
    default:
      return `
        <h2>Notification</h2>
        <p>You have a new notification from Knowledge Builder.</p>
        <p>Please log in to your account for more details.</p>
        <p>Best regards,<br>Knowledge Builder Team</p>
      `;
  }
};

const processEmailQueue = async () => {
  try {
    console.log('Processing email queue...');
    
    // Get pending emails
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError);
      return;
    }

    console.log(`Found ${pendingEmails?.length || 0} pending emails`);

    for (const email of pendingEmails || []) {
      try {
        console.log(`Processing email ${email.id} to ${email.recipient_email}`);
        
        const emailContent = generateEmailContent({
          template_name: email.template_name,
          subject: email.subject,
          template_data: email.template_data as Record<string, any>,
          recipient_email: email.recipient_email,
          recipient_id: email.recipient_id,
        });

        // In a real implementation, you would integrate with an email service like Resend, SendGrid, etc.
        // For this example, we'll simulate sending the email
        console.log(`Simulating email send to ${email.recipient_email}`);
        console.log(`Subject: ${email.subject}`);
        console.log(`Content preview: ${emailContent.substring(0, 100)}...`);

        // Update email status to sent
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: email.attempts + 1,
          })
          .eq('id', email.id);

        if (updateError) {
          console.error(`Error updating email ${email.id}:`, updateError);
        } else {
          console.log(`Email ${email.id} marked as sent`);
        }

      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);
        
        // Update email status to failed
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            attempts: email.attempts + 1,
            error_message: emailError.message,
          })
          .eq('id', email.id);
      }
    }
    
    console.log('Email queue processing completed');
    
  } catch (error) {
    console.error('Error in email queue processing:', error);
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'process_queue') {
      await processEmailQueue();
      return new Response(
        JSON.stringify({ success: true, message: 'Email queue processed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (req.method === 'POST') {
      const { template_name, recipient_email, recipient_id, subject, template_data } = await req.json();

      if (!template_name || !recipient_email || !recipient_id || !subject) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Add email to queue
      const { data, error } = await supabase
        .from('email_queue')
        .insert({
          recipient_email,
          recipient_id,
          subject,
          template_name,
          template_data: template_data || {},
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding email to queue:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to queue email' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Email queued successfully:', data.id);

      return new Response(
        JSON.stringify({ success: true, email_id: data.id }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-email-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);