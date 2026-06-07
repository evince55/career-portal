// MeshWatch API - Secure metrics fetching via Azure Functions gateway
// Uses GitHub OAuth PKCE flow for user authentication before exposing Prometheus data

class MeshWatchAPI {
  constructor() {
    this.AZURE_API_BASE = (typeof window !== 'undefined' && window.location) ? window.location.origin + '/api' : '/api';
    this.GITHUB_CLIENT_ID = 'chaitea321';
    this.REDIRECT_URI = (typeof window !== 'undefined' && window.location) ? window.location.origin + '/auth/callback' : '/auth/callback';
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  isAuthenticated() {
    return !!this._accessToken && Date.now() < this._tokenExpiry;
  }

  async startAuthFlow() {
    if (typeof window === 'undefined') return null;

    const codeVerifier = this._generateCodeVerifier();
    const codeChallenge = await this._generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('code_verifier', codeVerifier);

    const authUrl = new URL('https://github.com/authorize');
    authUrl.searchParams.set('client_id', this.GITHUB_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'public_repo read:user');
    authUrl.searchParams.set('state', this._generateState());
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // eslint-disable-next-line require-atomic-updates
    window.location.href = authUrl.toString();
    return authUrl.toString();
  }

  async exchangeCodeForToken(code) {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    if (!codeVerifier) {
      throw new Error('No code verifier found. Start auth flow first.');
    }

    try {
      const response = await fetch('/api/auth/github/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: codeVerifier,
          redirect_uri: this.REDIRECT_URI
        })
      });

      if (!response.ok) {
        throw new Error(`Auth failed: ${response.status}`);
      }

      const data = await response.json();
      this._accessToken = data.access_token;
      this._tokenExpiry = Date.now() + (data.expires_in * 1000);

      sessionStorage.removeItem('code_verifier');
      return data.access_token;
    } catch (error) {
      console.error('[MeshWatchAPI] Token exchange failed:', error.message);
      throw error;
    }
  }

  async getMetrics() {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated. Run startAuthFlow() first.' };
    }

    try {
      const response = await fetch(`${this.AZURE_API_BASE}/metrics`, {
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('[MeshWatchAPI] Metrics fetch failed:', error.message);
      return {
        success: false,
        data: 'Azure Functions endpoint not reachable',
        podsDeployed: 15,
        servicesMonitored: 5,
        monthlyCost: '5.12',
        aiAnalysis: 'Ollama Phi-3 ready'
      };
    }
  }

  async getMinecraftMetrics() {
    if (!this.isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated',
        data: 'Minecraft PaperMC 1.21.4',
        tps: 20,
        players: 3,
        uptime: '99.8%',
        discordAlertsToday: 0,
        lastGcPause: '45ms'
      };
    }

    try {
      const response = await fetch(`${this.AZURE_API_BASE}/minecraft/metrics`, {
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('[MeshWatchAPI] Minecraft metrics fetch failed:', error.message);
      return {
        success: false,
        error: error.message,
        data: 'Minecraft PaperMC 1.21.4',
        tps: 20,
        players: 3,
        uptime: '99.8%',
        discordAlertsToday: 0,
        lastGcPause: '45ms'
      };
    }
  }

  async queryPrometheus(queryId) {
    const whitelistedQueries = [
      'meshwatch_pods',
      'meshwatch_services',
      'minecraft_tps',
      'minecraft_players'
    ];

    if (!whitelistedQueries.includes(queryId)) {
      return { success: false, error: `Query "${queryId}" not whitelisted` };
    }

    if (!this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.AZURE_API_BASE}/prometheus/${queryId}`, {
        headers: {
          'Authorization': `Bearer ${this._accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Prometheus query failed: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('[MeshWatchAPI] Prometheus query failed:', error.message);
      return { success: false, data: null };
    }
  }

  async getAuthStatus() {
    if (this.isAuthenticated()) {
      const remaining = Math.round((this._tokenExpiry - Date.now()) / 60000);
      return {
        authenticated: true,
        tokenRemaining: `${remaining} minutes`,
        scopes: ['public_repo', 'read:user']
      };
    }
    return {
      authenticated: false,
      message: 'Click "Connect GitHub" to authenticate and access live metrics'
    };
  }

  _generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  async _generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  _generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}

export default MeshWatchAPI;
