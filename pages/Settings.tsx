
import React from 'react';
import Button from '../components/ui/Button';

const SettingsInput: React.FC<{ label: string; placeholder: string; isPassword?: boolean; description?: string }> = ({ label, placeholder, isPassword = false, description }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <input
      type={isPassword ? 'password' : 'text'}
      placeholder={placeholder}
      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
    />
    {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
  </div>
);

const Settings: React.FC = () => {
  const handleSave = () => {
    // In a real app, you would submit the form data to an API.
    // Here, we just show a confirmation.
    alert('Settings saved successfully! (This is a mock action)');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Bot Settings */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-4">Bot Settings</h2>
        <div className="space-y-4">
          <SettingsInput 
            label="Telegram Bot Token" 
            placeholder="Enter your bot token from BotFather"
            isPassword 
            description="This token is used to authenticate your bot with the Telegram API."
          />
          <SettingsInput 
            label="Admin Telegram ID" 
            placeholder="Enter your numeric Telegram user ID"
            description="The bot will send administrative notifications to this user."
          />
        </div>
      </div>

      {/* Payment Gateway Settings */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-4">Payment Gateways</h2>
        <div className="space-y-4">
          <SettingsInput 
            label="Zarinpal Merchant ID" 
            placeholder="Enter your Zarinpal merchant ID"
          />
          <p className="text-sm text-gray-400">More gateways (Crypto, Card-to-Card) can be configured here.</p>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
};

export default Settings;
