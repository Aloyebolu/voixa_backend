import nodemailer from 'nodemailer';
import { EmailOptions } from './types';
import { getEmailTemplate } from './templates';

// For development, use Ethereal.email test account
const createTransporter = async () => {
  // Generate test SMTP service account from ethereal.email

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'jensen24@ethereal.email', // generated ethereal user
      pass: 'qhMhS5YeKS8xKEQ7Sd', // generated ethereal password
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = await createTransporter();
    const template = getEmailTemplate(options.template, options.data);

    const info = await transporter.sendMail({
      from: '"Your App Name" <no-reply@example.com>',
      to: options.to,
      subject: options.subject || template.subject,
      html: template.html,
      text: template.text,
    });

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};