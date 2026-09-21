import { authorizedPost } from './utils';

/** Tenant `SendNotificationRequest` - pushes to every device of one user. */
export interface SendNotificationRequest {
  userId: string;
  titleCs?: string | null;
  bodyCs?: string | null;
  titleEn?: string | null;
  bodyEn?: string | null;
  titleDe?: string | null;
  bodyDe?: string | null;
}

/** Requires the `notifications.send` permission. */
export const sendNotification = async (
  token: string,
  request: SendNotificationRequest
): Promise<void> =>
  authorizedPost<void, SendNotificationRequest>(
    '/utils/send-notification',
    token,
    request
  );
