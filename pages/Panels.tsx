
import React from 'react';
import Button from '../components/ui/Button';
import { useMockData } from '../hooks/useMockData';
import type { MarzbanPanel } from '../types';

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
  const { panels } = useMockData();

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Marzban Panels</h2>
        <Button>
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
                    <Button variant="secondary" className="px-3 py-1 text-sm">Edit</Button>
                    <Button variant="danger" className="px-3 py-1 text-sm">Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Panels;
