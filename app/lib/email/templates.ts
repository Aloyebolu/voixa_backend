import { EmailTemplateData } from './types';

export const getEmailTemplate = (
  templateName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): EmailTemplateData => {
  const templates: Record<string, EmailTemplateData> = {
    welcome: {
      subject: 'Welcome to our platform!',
      html: `
        <div>
          <h1>Welcome, ${data.name}!</h1>
          <p>Thank you for joining our platform.</p>
          <p>Start exploring now!</p>
        </div>
      `,
      text: `Welcome, ${data.name}! Thank you for joining our platform. Start exploring now!`,
    },
    'password-reset': {
      subject: 'Password Reset Request',
      html: `
        <div>
          <h1>Password Reset</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${data.resetLink}">Reset Password</a>
          <p>This link will expire in ${data.expiry} hours.</p>
        </div>
      `,
      text: `Password Reset: Click this link to reset your password: ${data.resetLink}. This link will expire in ${data.expiry} hours.`,
    },
    verification: {
      subject: 'Verify your email address',
      html: `
        <div>
          <h1>Email Verification</h1>
          <p>Please verify your email by using the code:</p>
          <h2>${data.verificationCode}</h2>
          <p>If you didn't create an account, you can ignore this email.</p>
        </div>
      `,
      text: `Email Verification: Your E-Mail verification code is ${data.verificationCode} If you didn't create an account, you can ignore this email.`,
    },
    notification: {
      subject: data.subject || 'New Notification',
      html: `
        <div>
          <h1>${data.title || 'Notification'}</h1>
          <p>${data.message}</p>
          ${data.actionUrl ? `<a href="${data.actionUrl}">View Details</a>` : ''}
        </div>
      `,
      text: `${data.title || 'Notification'}: ${data.message} ${
        data.actionUrl ? `View details at: ${data.actionUrl}` : ''
      }`,
    },
  };

  return templates[templateName] || templates.notification;
};