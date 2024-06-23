import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';
import { EmailTemplate, sendGridTemplates } from './templates';

export interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    sgMail.setApiKey(sendGridApiKey);
  }

  async sendEmail(
    to: string,
    type: EmailTemplate,
    attachments: Array<EmailAttachment> = <Array<EmailAttachment>>[],
  ): Promise<void> {
    try {
      await sgMail.send({
        from: this.configService.get<string>('SENDGRID_SENDER_EMAIL'),
        replyTo: this.configService.get<string>('SENDGRID_REPLY_TO_EMAIL'),
        to,
        templateId: sendGridTemplates[type],
        attachments,
      });
      this.logger.log(`${type} email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      if (error.response) {
        this.logger.error(error.response.body);
      }
    }
  }
}
