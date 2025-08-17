
import React from 'react';
import { useMockData } from '../hooks/useMockData';

const Users: React.FC = () => {
  const { users } = useMockData();

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Users</h2>
        {/* Placeholder for search bar */}
        <input
          type="text"
          placeholder="Search users..."
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="p-4">Telegram ID</th>
              <th className="p-4">Username</th>
              <th className="p-4">Active Plan</th>
              <th className="p-4">Data Usage</th>
              <th className="p-4">Expires At</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-4 font-mono">{user.telegramId}</td>
                <td className="p-4">@{user.telegramUsername}</td>
                <td className="p-4">{user.activePlanName}</td>
                <td className="p-4">{user.dataUsage.toFixed(2)} GB</td>
                <td className="p-4">{new Date(user.expiresAt).toLocaleDateString()}</td>
                <td className="p-4">
                    {/* Placeholder for user actions */}
                    <button className="text-primary hover:underline">Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
