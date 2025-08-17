import { MarzbanService } from '../services/marzbanService.js';
import { logger } from './logger.js';

export interface VPNConfig {
  id: string;
  username: string;
  password: string;
  server: string;
  port: number;
  method: string;
  protocol: string;
  configString: string;
  subscriptionUrl: string;
  qrCode?: string;
}

export class ConfigGenerator {
  private marzbanService: MarzbanService;

  constructor() {
    this.marzbanService = new MarzbanService();
  }

  async generateConfig(subscriptionId: string, panelId: string): Promise<string> {
    try {
      // Get subscription details
      const subscription = await this.getSubscriptionDetails(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get panel details
      const panel = await this.marzbanService.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      // Get user config from Marzban panel
      const marzbanConfig = await this.marzbanService.getUserConfig(panelId, subscription.username);
      if (!marzbanConfig) {
        throw new Error('Failed to get VPN configuration from panel');
      }

      // Generate different config formats
      const configs = {
        shadowsocks: this.generateShadowsocksConfig(marzbanConfig, panel),
        vmess: this.generateVmessConfig(marzbanConfig, panel),
        trojan: this.generateTrojanConfig(marzbanConfig, panel),
        vless: this.generateVlessConfig(marzbanConfig, panel),
        subscription: marzbanConfig.subscription_url
      };

      // Return the most appropriate config format
      return this.selectBestConfig(configs, marzbanConfig);
    } catch (error) {
      logger.error('Error generating VPN config:', error);
      throw new Error('Failed to generate VPN configuration');
    }
  }

  private async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    // This would typically come from the database
    // For now, we'll return a mock object
    return {
      id: subscriptionId,
      username: `user_${subscriptionId}`,
      password: 'generated_password'
    };
  }

  private generateShadowsocksConfig(config: any, panel: any): string {
    try {
      const server = new URL(panel.url).hostname;
      const port = 443; // Default port
      const method = 'aes-256-gcm';
      const password = config.username; // Use username as password for simplicity

      // Shadowsocks URI format
      const ssUri = `ss://${Buffer.from(`${method}:${password}`).toString('base64')}@${server}:${port}#${encodeURIComponent(panel.name)}`;

      return `🔐 Shadowsocks Configuration

🌐 Server: ${server}
🔌 Port: ${port}
🔑 Method: ${method}
👤 Username: ${config.username}
🔒 Password: ${password}

📱 URI (for apps):
${ssUri}

💡 Instructions:
1. Copy the URI above
2. Open your Shadowsocks app
3. Import from URI
4. Connect and enjoy!`;
    } catch (error) {
      logger.error('Error generating Shadowsocks config:', error);
      return 'Error generating Shadowsocks configuration';
    }
  }

  private generateVmessConfig(config: any, panel: any): string {
    try {
      const server = new URL(panel.url).hostname;
      const port = 443;
      const uuid = this.generateUUID();
      const path = '/ws';
      const host = server;

      // Vmess URI format
      const vmessUri = `vmess://${Buffer.from(JSON.stringify({
        v: '2',
        ps: panel.name,
        add: server,
        port: port,
        id: uuid,
        aid: '0',
        net: 'ws',
        type: 'none',
        host: host,
        path: path,
        tls: 'tls'
      })).toString('base64')}`;

      return `🔐 Vmess Configuration

🌐 Server: ${server}
🔌 Port: ${port}
🔑 UUID: ${uuid}
🌐 Network: WebSocket
🔒 TLS: Enabled
📁 Path: ${path}
🏷️ Host: ${host}

📱 URI (for apps):
${vmessUri}

💡 Instructions:
1. Copy the URI above
2. Open your V2Ray app
3. Import from URI
4. Connect and enjoy!`;
    } catch (error) {
      logger.error('Error generating Vmess config:', error);
      return 'Error generating Vmess configuration';
    }
  }

  private generateTrojanConfig(config: any, panel: any): string {
    try {
      const server = new URL(panel.url).hostname;
      const port = 443;
      const password = this.generatePassword(16);

      // Trojan URI format
      const trojanUri = `trojan://${password}@${server}:${port}?security=tls&type=ws&path=/trojan#${encodeURIComponent(panel.name)}`;

      return `🔐 Trojan Configuration

🌐 Server: ${server}
🔌 Port: ${port}
🔑 Password: ${password}
🔒 Security: TLS
🌐 Network: WebSocket
📁 Path: /trojan

📱 URI (for apps):
${trojanUri}

💡 Instructions:
1. Copy the URI above
2. Open your Trojan app
3. Import from URI
4. Connect and enjoy!`;
    } catch (error) {
      logger.error('Error generating Trojan config:', error);
      return 'Error generating Trojan configuration';
    }
  }

  private generateVlessConfig(config: any, panel: any): string {
    try {
      const server = new URL(panel.url).hostname;
      const port = 443;
      const uuid = this.generateUUID();
      const path = '/vless';
      const host = server;

      // Vless URI format
      const vlessUri = `vless://${uuid}@${server}:${port}?encryption=none&security=tls&type=ws&host=${host}&path=${path}#${encodeURIComponent(panel.name)}`;

      return `🔐 Vless Configuration

🌐 Server: ${server}
🔌 Port: ${port}
🔑 UUID: ${uuid}
🔒 Encryption: None
🔒 Security: TLS
🌐 Network: WebSocket
📁 Path: ${path}
🏷️ Host: ${host}

📱 URI (for apps):
${vlessUri}

💡 Instructions:
1. Copy the URI above
2. Open your V2Ray app
3. Import from URI
4. Connect and enjoy!`;
    } catch (error) {
      logger.error('Error generating Vless config:', error);
      return 'Error generating Vless configuration';
    }
  }

  private selectBestConfig(configs: any, marzbanConfig: any): string {
    // Priority order: subscription URL > vmess > vless > trojan > shadowsocks
    if (configs.subscription) {
      return `🔐 VPN Configuration

📱 Subscription URL (Recommended):
${configs.subscription}

💡 Instructions:
1. Copy the subscription URL above
2. Open your VPN app
3. Add subscription
4. Select a server and connect

🌐 Alternative Configurations:

${configs.vmess}

---

${configs.vless}

---

${configs.trojan}

---

${configs.shadowsocks}`;
    }

    // If no subscription URL, return vmess as default
    return configs.vmess;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generatePassword(length: number): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async generateQRCode(configString: string): Promise<string> {
    try {
      // This would typically use a QR code generation library
      // For now, we'll return a placeholder
      return `📱 QR Code Generated

🔗 Configuration:
${configString}

💡 Scan this QR code with your VPN app to automatically configure the connection.`;
    } catch (error) {
      logger.error('Error generating QR code:', error);
      return 'Error generating QR code';
    }
  }

  async generateConfigFile(subscriptionId: string, panelId: string, format: 'json' | 'yaml' | 'txt' = 'txt'): Promise<string> {
    try {
      const config = await this.generateConfig(subscriptionId, panelId);
      
      switch (format) {
        case 'json':
          return JSON.stringify({
            subscription_id: subscriptionId,
            panel_id: panelId,
            generated_at: new Date().toISOString(),
            configuration: config
          }, null, 2);
        
        case 'yaml':
          return `subscription_id: ${subscriptionId}
panel_id: ${panelId}
generated_at: ${new Date().toISOString()}
configuration: |
  ${config.replace(/\n/g, '\n  ')}`;
        
        case 'txt':
        default:
          return config;
      }
    } catch (error) {
      logger.error('Error generating config file:', error);
      throw new Error('Failed to generate configuration file');
    }
  }

  async validateConfig(configString: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!configString || configString.trim().length === 0) {
      errors.push('Configuration string is empty');
    }

    if (configString.length > 10000) {
      errors.push('Configuration string is too long');
    }

    // Basic validation for common config formats
    if (configString.includes('vmess://')) {
      try {
        const base64 = configString.replace('vmess://', '');
        const decoded = JSON.parse(Buffer.from(base64, 'base64').toString());
        
        if (!decoded.add || !decoded.port || !decoded.id) {
          errors.push('Invalid Vmess configuration format');
        }
      } catch (error) {
        errors.push('Invalid Vmess configuration encoding');
      }
    }

    if (configString.includes('ss://')) {
      try {
        const base64 = configString.replace('ss://', '').split('#')[0];
        const decoded = Buffer.from(base64, 'base64').toString();
        
        if (!decoded.includes('@') || !decoded.includes(':')) {
          errors.push('Invalid Shadowsocks configuration format');
        }
      } catch (error) {
        errors.push('Invalid Shadowsocks configuration encoding');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const generateConfig = async (subscriptionId: string, panelId: string): Promise<string> => {
  const generator = new ConfigGenerator();
  return await generator.generateConfig(subscriptionId, panelId);
};

export default ConfigGenerator;
