
export interface MarzbanPanel {
  id: string;
  name: string;
  url: string;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
}

export interface VPNPlan {
  id: string;
  name: string;
  panelId: string;
  panelName: string;
  dataLimit: number; // in GB
  duration: number; // in days
  price: number; // in USD
  isVisible: boolean;
}

export interface User {
  id: string;
  telegramId: string;
  telegramUsername: string;
  activePlanId: string;
  activePlanName: string;
  expiresAt: string;
  dataUsage: number; // in GB
}

export interface SalesData {
  month: string;
  sales: number;
}
