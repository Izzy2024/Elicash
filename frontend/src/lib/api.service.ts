// Simple API service for basic operations.
// Auth relies solely on the httpOnly cookie; in production the API is reached
// same-origin through the Netlify proxy (see netlify.toml), so no token is
// ever exposed to JavaScript.
const API_URL = import.meta.env.PUBLIC_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '');

class SimpleAPIService {
  private getHeaders(contentType = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
  }

  private handleUnauthorized(): void {
    localStorage.removeItem('elicash_user');
    localStorage.removeItem('elicash_token');
    window.location.href = '/login';
  }

  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (response.status === 401) {
      this.handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (response.status === 401) {
      this.handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async put(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });

    if (response.status === 401) {
      this.handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async delete(endpoint: string): Promise<any> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (response.status === 401) {
      this.handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async download(endpoint: string, filename: string): Promise<void> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(''),
      credentials: 'include',
    });

    if (response.status === 401) {
      this.handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }
}

export const apiService = new SimpleAPIService();
