
import { useState } from 'react';
import type { MarzbanPanel, VPNPlan, User, SalesData } from '../types';

const mockPanels: MarzbanPanel[] = [
  { id: 'p1', name: 'Germany Server', url: 'https://de.marzban.com', username: 'admin', status: 'connected', createdAt: '2023-10-01' },
  { id: 'p2', name: 'Finland Server', url: 'https://fi.marzban.com', username: 'admin', status: 'disconnected', createdAt: '2023-10-05' },
  { id: 'p3', name: 'US Server', url: 'https://us.marzban.com', username: 'admin', status: 'error', createdAt: '2023-10-10' },
];

const mockPlans: VPNPlan[] = [
  { id: 'pl1', name: 'Monthly 50GB', panelId: 'p1', panelName: 'Germany Server', dataLimit: 50, duration: 30, price: 5, isVisible: true },
  { id: 'pl2', name: 'Monthly 100GB', panelId: 'p1', panelName: 'Germany Server', dataLimit: 100, duration: 30, price: 8, isVisible: true },
  { id: 'pl3', name: 'Quarterly 200GB', panelId: 'p2', panelName: 'Finland Server', dataLimit: 200, duration: 90, price: 20, isVisible: false },
];

const mockUsers: User[] = [
    { id: 'u1', telegramId: '12345678', telegramUsername: 'john_doe', activePlanId: 'pl1', activePlanName: 'Monthly 50GB', expiresAt: '2024-08-15', dataUsage: 15.2 },
    { id: 'u2', telegramId: '87654321', telegramUsername: 'jane_smith', activePlanId: 'pl2', activePlanName: 'Monthly 100GB', expiresAt: '2024-08-20', dataUsage: 45.8 },
    { id: 'u3', telegramId: '11223344', telegramUsername: 'test_user', activePlanId: 'pl1', activePlanName: 'Monthly 50GB', expiresAt: '2024-07-30', dataUsage: 49.5 },
];

const mockSalesData: SalesData[] = [
    { month: 'Jan', sales: 400 },
    { month: 'Feb', sales: 300 },
    { month: 'Mar', sales: 600 },
    { month: 'Apr', sales: 800 },
    { month: 'May', sales: 500 },
    { month: 'Jun', sales: 750 },
];

export const useMockData = () => {
  const [panels, setPanels] = useState<MarzbanPanel[]>(mockPanels);
  const [plans, setPlans] = useState<VPNPlan[]>(mockPlans);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [salesData] = useState<SalesData[]>(mockSalesData);

  const deletePanel = (id: string) => {
    setPanels(currentPanels => currentPanels.filter(p => p.id !== id));
  };
  
  const savePanel = (panel: Omit<MarzbanPanel, 'status' | 'createdAt' | 'id'> & { id?: string }) => {
    if (panel.id) {
      setPanels(currentPanels => currentPanels.map(p => p.id === panel.id ? { ...p, ...panel } : p));
    } else {
      const newPanel: MarzbanPanel = {
        ...panel,
        id: `p${Date.now()}`,
        status: 'disconnected', // Default status for new panels
        createdAt: new Date().toISOString().split('T')[0],
      };
      setPanels(currentPanels => [...currentPanels, newPanel]);
    }
  };
  
  const savePlan = (plan: Omit<VPNPlan, 'panelName' | 'id'> & { id?: string }) => {
     const panelName = panels.find(p => p.id === plan.panelId)?.name || 'Unknown Panel';
     if (plan.id) {
         setPlans(currentPlans => currentPlans.map(p => p.id === plan.id ? { ...p, ...plan, panelName } : p));
     } else {
         const newPlan: VPNPlan = {
             ...plan,
             id: `pl${Date.now()}`,
             panelName,
         };
         setPlans(currentPlans => [...currentPlans, newPlan]);
     }
  };
  
  const togglePlanVisibility = (id: string) => {
      setPlans(currentPlans => currentPlans.map(p => p.id === id ? { ...p, isVisible: !p.isVisible } : p));
  };

  return { panels, plans, users, salesData, deletePanel, savePanel, savePlan, togglePlanVisibility };
};
