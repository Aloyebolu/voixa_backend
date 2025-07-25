export type EmailTemplate = 'welcome' | 'password-reset' | 'notification' | 'verification';

export interface EmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export interface EmailTemplateData {
  subject: string;
  html: string;
  text: string;
}