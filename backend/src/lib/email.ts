import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';
import { prisma } from './prisma';

let transporter: Transporter | null = null;

export function getEmailTransporter(): Transporter {
  if (transporter) return transporter;

  const hasCredentials = Boolean(env.EMAIL_USER && env.EMAIL_PASS);

  if (hasCredentials) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
    logger.info('Email service initialized with real SMTP provider', {
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      from: env.EMAIL_FROM,
    });
  } else {
    // Zero-crash local simulation mode (uses JSON/stream transport)
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    logger.info('Email service initialized in simulation/dev mode (no SMTP credentials configured)');
  }

  return transporter;
}

export function isSmtpConfigured(): boolean {
  return Boolean(env.EMAIL_USER && env.EMAIL_PASS);
}

export interface AbsenteeEmailPayload {
  to: string;
  studentName: string;
  rollNo: string;
  subjectName: string;
  subjectCode: string;
  date: string;
  period: number;
  teacherName: string;
}

/**
 * Generate standard HTML email template for Absentee alert
 */
function renderAbsenteeHtml(data: AbsenteeEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: #dc2626; color: #ffffff; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
    .body { padding: 24px; }
    .alert-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin-bottom: 20px; color: #991b1b; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-table td.label { font-weight: 600; color: #64748b; width: 38%; }
    .info-table td.value { font-weight: 700; color: #0f172a; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 12px; color: #64748b; line-height: 1.5; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 800; background: #fee2e2; color: #b91c1c; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>AttendAI Attendance Alert</h1>
      <p>Official Academic Notification System</p>
    </div>
    <div class="body">
      <div class="alert-banner">
        <strong>Dear ${data.studentName},</strong> you have been marked <span class="badge">ABSENT</span> for the following lecture session.
      </div>
      <table class="info-table">
        <tr>
          <td class="label">Roll Number</td>
          <td class="value">${data.rollNo}</td>
        </tr>
        <tr>
          <td class="label">Subject</td>
          <td class="value">${data.subjectName} (${data.subjectCode})</td>
        </tr>
        <tr>
          <td class="label">Date</td>
          <td class="value">${data.date}</td>
        </tr>
        <tr>
          <td class="label">Period / Lecture</td>
          <td class="value">Period ${data.period}</td>
        </tr>
        <tr>
          <td class="label">Course Faculty</td>
          <td class="value">${data.teacherName}</td>
        </tr>
      </table>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        💡 <strong>Note on Attendance Policy:</strong> Maintaining at least 75% aggregate attendance is mandatory for semester examination eligibility. If you believe this mark was recorded in error, please submit an <strong>Attendance Correction Request</strong> with supporting details via your AttendAI Student Portal within 48 hours.
      </p>
    </div>
    <div class="footer">
      This is an automated academic communication from AttendAI. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch absentee alert in background with automatic audit logging
 */
export async function sendAbsenteeEmailBatch(
  sessionInfo: { subjectName: string; subjectCode: string; date: string; period: number; teacherName: string },
  absentees: { name: string; email: string; rollNo: string }[]
): Promise<void> {
  if (absentees.length === 0) return;

  // Run in background so request finishes immediately
  setImmediate(async () => {
    const mailer = getEmailTransporter();
    const hasSmtp = isSmtpConfigured();

    for (const student of absentees) {
      if (!student.email) continue;

      const payload: AbsenteeEmailPayload = {
        to: student.email,
        studentName: student.name,
        rollNo: student.rollNo,
        subjectName: sessionInfo.subjectName,
        subjectCode: sessionInfo.subjectCode,
        date: sessionInfo.date,
        period: sessionInfo.period,
        teacherName: sessionInfo.teacherName,
      };

      try {
        if (hasSmtp) {
          await mailer.sendMail({
            from: env.EMAIL_FROM,
            to: payload.to,
            subject: `AttendAI Alert: Attendance Marked ABSENT - ${payload.subjectCode}`,
            html: renderAbsenteeHtml(payload),
          });
        }

        // Record delivery log in DefaulterEmailLog
        await prisma.defaulterEmailLog.create({
          data: {
            recipientEmail: payload.to,
            recipientName: payload.studentName,
            rollNo: payload.rollNo,
            subjectCode: payload.subjectCode,
            subjectName: payload.subjectName,
            attendancePercent: 0,
            classesAttended: 0,
            totalClasses: 0,
            senderName: payload.teacherName,
            status: hasSmtp ? 'SENT' : 'SIMULATED',
          },
        });

        logger.info('Absentee notification processed', {
          to: payload.to,
          rollNo: payload.rollNo,
          mode: hasSmtp ? 'SENT' : 'SIMULATED',
        });
      } catch (err: any) {
        logger.error('Failed to dispatch absentee email', { to: payload.to, error: err.message });
      }
    }
  });
}

export interface DefaulterWarningPayload {
  email: string;
  name: string;
  rollNo: string;
  subjectCode: string;
  subjectName: string;
  attendancePercent: number;
  classesAttended: number;
  totalClasses: number;
  senderName: string;
}

/**
 * Send Defaulter Warning Email Batch (<75% threshold)
 */
export async function sendDefaulterWarningBatch(
  defaulters: DefaulterWarningPayload[]
): Promise<{ total: number; sent: number; simulated: number; failed: number }> {
  const mailer = getEmailTransporter();
  const hasSmtp = isSmtpConfigured();

  let sent = 0;
  let simulated = 0;
  let failed = 0;

  for (const item of defaulters) {
    if (!item.email) continue;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #b91c1c; color: #fff; padding: 18px 24px; }
    .header h2 { margin: 0; font-size: 18px; }
    .body { padding: 24px; }
    .stat-box { display: flex; gap: 16px; margin: 16px 0; background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; }
    .stat { flex: 1; text-align: center; }
    .stat .num { font-size: 24px; font-weight: 800; color: #b91c1c; }
    .stat .lbl { font-size: 11px; text-transform: uppercase; color: #7f1d1d; font-weight: 600; margin-top: 4px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>⚠️ Attendance Shortage Warning Notice</h2>
    </div>
    <div class="body">
      <p>Dear <strong>${item.name}</strong> (Roll: ${item.rollNo}),</p>
      <p>This is an official notice that your attendance in <strong>${item.subjectName} (${item.subjectCode})</strong> has dropped below the mandatory <strong>75%</strong> threshold.</p>
      <div class="stat-box">
        <div class="stat">
          <div class="num">${item.attendancePercent}%</div>
          <div class="lbl">Current Percentage</div>
        </div>
        <div class="stat">
          <div class="num">${item.classesAttended} / ${item.totalClasses}</div>
          <div class="lbl">Classes Attended</div>
        </div>
      </div>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        You are advised to attend all upcoming lectures and contact your course faculty (<strong>${item.senderName}</strong>) or Department HOD to discuss your attendance shortfall.
      </p>
    </div>
    <div class="footer">AttendAI Academic Communication Office</div>
  </div>
</body>
</html>
    `.trim();

    try {
      if (hasSmtp) {
        await mailer.sendMail({
          from: env.EMAIL_FROM,
          to: item.email,
          subject: `Urgent: Attendance Shortage Warning - ${item.subjectCode}`,
          html,
        });
        sent++;
      } else {
        simulated++;
      }

      await prisma.defaulterEmailLog.create({
        data: {
          recipientEmail: item.email,
          recipientName: item.name,
          rollNo: item.rollNo,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          attendancePercent: item.attendancePercent,
          classesAttended: item.classesAttended,
          totalClasses: item.totalClasses,
          senderName: item.senderName,
          status: hasSmtp ? 'SENT' : 'SIMULATED',
        },
      });
    } catch (err: any) {
      logger.error('Failed to send defaulter warning email', { to: item.email, error: err.message });
      failed++;
    }
  }

  return { total: defaulters.length, sent, simulated, failed };
}
