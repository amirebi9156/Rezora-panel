
import React, { useState } from 'react';
import Button from '../components/ui/Button';
import { useMockData } from '../hooks/useMockData';
import type { VPNPlan, MarzbanPanel } from '../types';

type PlanFormData = Omit<VPNPlan, 'panelName' | 'id'> & { id?: string };

const PlanFormModal: React.FC<{
  plan: PlanFormData | null;
  panels: MarzbanPanel[];
  onClose: () => void;
  onSave: (plan: PlanFormData) => void;
}> = ({ plan, panels, onClose, onSave }) => {
  const [formData, setFormData] = useState<PlanFormData>(
    plan || { name: '', panelId: '', dataLimit: 0, duration: 0, price: 0, isVisible: true }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const isNumber = ['dataLimit', 'duration', 'price'].includes(name);

    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : isNumber ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.panelId) {
        alert("Please select a panel.");
        return;
    }
    onSave(formData);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">{plan?.id ? 'Edit' : 'Create'} Plan</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Plan Name</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
                <label htmlFor="panelId" className="block text-sm font-medium text-gray-300 mb-1">Marzban Panel</label>
                <select name="panelId" id="panelId" value={formData.panelId} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="" disabled>Select a panel</option>
                    {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="dataLimit" className="block text-sm font-medium text-gray-300 mb-1">Data Limit (GB)</label>
                <input type="number" name="dataLimit" id="dataLimit" value={formData.dataLimit} onChange={handleChange} required min="0" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
             <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1">Duration (Days)</label>
                <input type="number" name="duration" id="duration" value={formData.duration} onChange={handleChange} required min="0" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
             <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">Price ($)</label>
                <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="isVisible" id="isVisible" checked={formData.isVisible} onChange={handleChange} className="h-4 w-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary" />
            <label htmlFor="isVisible" className="ml-2 block text-sm text-gray-300">Visible to users in bot</label>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Plan</Button>
          </div>
        </form>
      </div>
    </div>
  );
};


const Plans: React.FC = () => {
  const { plans, panels, savePlan, togglePlanVisibility } = useMockData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanFormData | null>(null);

  const handleOpenModal = (plan: VPNPlan | null = null) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
  };
  
  const handleSavePlan = (plan: PlanFormData) => {
    savePlan(plan);
    handleCloseModal();
  };

  return (
    <>
      {isModalOpen && <PlanFormModal plan={editingPlan} panels={panels} onClose={handleCloseModal} onSave={handleSavePlan} />}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">VPN Plans</h2>
          <Button onClick={() => handleOpenModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Plan
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="p-4">Plan Name</th>
                <th className="p-4">Panel</th>
                <th className="p-4">Data Limit</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Price</th>
                <th className="p-4">Visible</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4 font-semibold">{plan.name}</td>
                  <td className="p-4">{plan.panelName}</td>
                  <td className="p-4">{plan.dataLimit} GB</td>
                  <td className="p-4">{plan.duration} days</td>
                  <td className="p-4">${plan.price.toFixed(2)}</td>
                  <td className="p-4">
                    <div onClick={() => togglePlanVisibility(plan.id)} className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer ${plan.isVisible ? 'bg-success' : 'bg-gray-600'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${plan.isVisible ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Button variant="secondary" className="px-3 py-1 text-sm" onClick={() => handleOpenModal(plan)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Plans;
