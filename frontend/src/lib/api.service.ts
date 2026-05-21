// Simple API service for basic operations
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

class SimpleAPIService {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = typeof window !== 'undefined' ? localStorage.getItem('elicash_token') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (response.status === 401) {
      // Clear local cache and redirect
      localStorage.removeItem('elicash_user');
      window.location.href = '/login';
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
      localStorage.removeItem('elicash_user');
      window.location.href = '/login';
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
      localStorage.removeItem('elicash_user');
      window.location.href = '/login';
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
      localStorage.removeItem('elicash_user');
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const apiService = new SimpleAPIService();