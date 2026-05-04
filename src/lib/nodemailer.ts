import nodemailer from "nodemailer";
import path from "path";

const email = process.env.GMAIL_EMAIL;
const pass = process.env.GMAIL_APP_PASSWORD;

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: email,
    pass: pass,
  },
});

export const mailOptions = {
  from: email,
  to: email,
};

export async function sendWelcomeEmail(email: string, name: string) {
  
  const imagePath = path.join(process.cwd(), "public", "welcomeLetter", "welcomeLetter.jpg");
  const imageCid = "lbc-welcome-letter@nodemailer";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Dear ${name},</p>
      <p>We are delighted to confirm your official membership in the London Bridge Club (LBC).</p>
      <p>You are now part of an exclusive network that brings together leaders and organisations from across the globe, from London to Istanbul.</p>
      <p>To better acquaint you with the vision of our club and the opportunities it presents, please find the personal welcome letter from our CEO, Mr. Patrick Robert Douglas COX, below.</p>
      <p>It is a privilege to have you with us.</p>
      <p>Sincerely,</p>
      <p><strong>The London Bridge Club Team</strong></p>
      <br>
      <img src="cid:${imageCid}" alt="LBC Welcome Letter" style="width: 100%; max-width: 600px; height: auto; border: 1px solid #ddd; margin-top: 32px;" />
    </div>
  `;

  await transporter.sendMail({
    from: '"LondonBridge" <muhammed@elmalitech.com>',
    to: email,
    subject: `Welcome to the London Bridge Club, ${name}`,
    html: htmlBody,
    attachments: [
      {
        filename: "welcomeLetter.jpg",
        path: imagePath,
        cid: imageCid,
      },
    ],
  });
}

export async function sendApprovalRequestEmail(userData: { fullName: string; email: string; status: string; linkedinUrl?: string }) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">New Membership Application</h2>
      <p>A new user has registered and is waiting for approval:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 150px;">Full Name:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${userData.fullName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${userData.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status:</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">${userData.status}</td>
        </tr>
        ${userData.linkedinUrl ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">LinkedIn:</td>
          <td style="padding: 8px; border: 1px solid #ddd;"><a href="${userData.linkedinUrl}">${userData.linkedinUrl}</a></td>
        </tr>
        ` : ''}
      </table>
      <p style="margin-top: 30px;">
        Please log in to the admin panel to approve or reject this application.
      </p>
      <div style="margin-top: 20px;">
        <a href="https://londonbridge.club/admin/users" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px;">Go to Admin Panel</a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"LBC System" <muhammed@elmalitech.com>',
    to: "info@londonbridge.club",
    subject: `New Registration: ${userData.fullName}`,
    html: htmlBody,
  });
}

export async function sendUserApprovedEmail(email: string, name: string) {
  const paymentLink = "https://londonbridge.club/membership";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #000;">Application Approved!</h2>
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that your membership application for the <strong>London Bridge Club</strong> has been approved.</p>
      <p>The next step is to complete your registration by selecting a membership plan and completing the payment.</p>
      <div style="margin-top: 30px; margin-bottom: 30px;">
        <a href="${paymentLink}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Proceed to Payment</a>
      </div>
      <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
      <p><a href="${paymentLink}">${paymentLink}</a></p>
      <p>Welcome to our exclusive community!</p>
      <p>Best regards,<br><strong>The London Bridge Club Team</strong></p>
    </div>
  `;

  await transporter.sendMail({
    from: '"LondonBridge" <muhammed@elmalitech.com>',
    to: email,
    subject: `Your LBC Membership Application has been Approved!`,
    html: htmlBody,
  });
}

export async function sendInvitationEmail(email: string, invitationLink: string) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #000;">You're Invited!</h2>
      <p>Hello,</p>
      <p>You have been invited to join the <strong>London Bridge Club</strong>, an exclusive network for professionals and organizations.</p>
      <p>To accept your invitation and create your account, please click the button below:</p>
      <div style="margin-top: 30px; margin-bottom: 30px;">
        <a href="${invitationLink}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Complete Registration</a>
      </div>
      <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
      <p><a href="${invitationLink}">${invitationLink}</a></p>
      <p>We look forward to welcoming you to the club.</p>
      <p>Best regards,<br><strong>The London Bridge Club Team</strong></p>
    </div>
  `;

  await transporter.sendMail({
    from: '"LondonBridge" <muhammed@elmalitech.com>',
    to: email,
    subject: `Invitation to join the London Bridge Club`,
    html: htmlBody,
  });
}

export async function sendSystemNotification(action: string, details: string) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #000; border-bottom: 2px solid #000; padding-bottom: 10px;">LBC System Notification</h2>
      <p>A new system action has been performed:</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <p><strong>Action:</strong> ${action}</p>
        <p><strong>Details:</strong> ${details}</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</p>
      </div>
      <p style="margin-top: 30px;">This is an automated notification from the London Bridge Club Portal.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: '"LBC System" <muhammed@elmalitech.com>',
      to: "info@londonbridge.club",
      subject: `System Alert: ${action}`,
      html: htmlBody,
    });
  } catch (error) {
    console.error("Failed to send system notification:", error);
  }
}

export default transporter;
