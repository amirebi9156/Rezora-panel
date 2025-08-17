
import React, { useState } from 'react';
import Button from '../components/ui/Button';
import { useMockData } from '../hooks/useMockData';
import type { MarzbanPanel } from '../types';

type PanelFormData = Omit<MarzbanPanel, 'status' | 'createdAt' | 'id'> & { id?: string; password?: string };

const PanelFormModal: React.FC<{
  panel: PanelFormData | null;
  onClose: () => void;
  onSave: (panel: PanelFormData) => void;
}> = ({ panel, onClose, onSave }) => {
  const [formData, setFormData] = useState<PanelFormData>(
    panel || { name: '', url: '', username: '', password: '' }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg border border-gray-700">
        <h3 className="text-xl font-semibold mb-4">{panel?.id ? 'Edit' : 'Add'} Panel</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Panel Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-1">Panel URL</label>
            <input type="url" name="url" id="url" value={formData.url} onChange={handleChange} placeholder="https://your-panel.com" required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
           <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} required={!panel?.id} placeholder={panel?.id ? "Leave blank to keep unchanged" : ""} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Panel</Button>
          </div>
        </form>
      </div>
    </div>
  );
};


const StatusBadge: React.FC<{ status: MarzbanPanel['status'] }> = ({ status }) => {
  const statusClasses = {
    connected: 'bg-success/20 text-success',
    disconnected: 'bg-warning/20 text-warning',
    error: 'bg-danger/20 text-danger',
  };
  const statusText = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClasses[status]}`}>
      {statusText[status]}
    </span>
  );
};

const Panels: React.FC = () => {
  const { panels, savePanel, deletePanel } = useMockData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<PanelFormData | null>(null);

  const handleOpenModal = (panel: MarzbanPanel | null = null) => {
    setEditingPanel(panel ? { ...panel, password: ''} : null);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPanel(null);
  };

  const handleSavePanel = (panel: PanelFormData) => {
    savePanel(panel);
    handleCloseModal();
  };

  const handleDeletePanel = (id: string) => {
    if (window.confirm('Are you sure you want to delete this panel?')) {
        deletePanel(id);
    }
  };

  return (
    <>
      {isModalOpen && <PanelFormModal panel={editingPanel} onClose={handleCloseModal} onSave={handleSavePanel} />}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Marzban Panels</h2>
          <Button onClick={() => handleOpenModal()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Panel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="p-4">Name</th>
                <th className="p-4">URL</th>
                <th className="p-4">Username</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((panel) => (
                <tr key={panel.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-4">{panel.name}</td>
                  <td className="p-4 font-mono">{panel.url}</td>
                  <td className="p-4">{panel.username}</td>
                  <td className="p-4"><StatusBadge status={panel.status} /></td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <Button variant="secondary" className="px-3 py-1 text-sm" onClick={() => handleOpenModal(panel)}>Edit</Button>
                      <Button variant="danger" className="px-3 py-1 text-sm" onClick={() => handleDeletePanel(panel.id)}>Delete</Button>
                    </div>
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

export default Panels;
