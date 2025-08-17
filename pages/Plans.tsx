
import React from 'react';
import Button from '../components/ui/Button';
import { useMockData } from '../hooks/useMockData';

const Plans: React.FC = () => {
  const { plans } = useMockData();

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">VPN Plans</h2>
        <Button>
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
                  <div className={`w-12 h-6 rounded-full p-1 flex items-center cursor-pointer ${plan.isVisible ? 'bg-success' : 'bg-gray-600'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${plan.isVisible ? 'translate-x-6' : ''}`}></div>
                  </div>
                </td>
                <td className="p-4">
                  <Button variant="secondary" className="px-3 py-1 text-sm">Edit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Plans;
