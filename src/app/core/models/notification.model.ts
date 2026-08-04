export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface NotificationPreferenceItem {
  type: string;
  description: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  availableChannels: ('inApp' | 'email' | 'push')[];
}

export interface CompanyNotificationChannelSetting {
  channel: 'inApp' | 'email' | 'push';
  enabled: boolean;
  lockedByPlatform: boolean;
}

export interface CompanyNotificationSetting {
  type: string;
  description: string;
  channels: CompanyNotificationChannelSetting[];
}
