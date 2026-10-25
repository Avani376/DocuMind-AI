const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export type Source = {
  document_id: number;
  filename: string;
  page_number: number | null;
  chunk_id: number;
  excerpt: string;
};

export type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  created_at: string;
};

export type Chat = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Doc = {
  id: number;
  filename: string;
  status: string;
  error?: string | null;
  created_at: string;
};

export type UploadProgress = (percent: number | null) => void;

let token = localStorage.getItem('documind_token') || '';

export const setToken = (value: string) => {
  token = value;
  if (value) {
    localStorage.setItem('documind_token', value);
  } else {
    localStorage.removeItem('documind_token');
  }
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(BASE + path, { ...init, headers });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach the DocuMind API at ${BASE}. Check that the backend is running and that VITE_API_URL points to its address. From the backend folder, start it with: uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
      );
    }
    throw error;
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      message = (await response.json()).detail || message;
    } catch {
      // Keep the status-based message when the response has no JSON body.
    }
    throw new Error(message);
  }

  return response.status === 204
    ? (undefined as T)
    : response.json();
}

export const api = {
  register: (name: string, email: string, password: string) =>
    req<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email, password }),
    }),
  login: (email: string, password: string) =>
    req<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<any>('/api/auth/me'),
  chats: () => req<Chat[]>('/api/chats'),
  createChat: () =>
    req<Chat>('/api/chats', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getChat: (id: number) => req<any>(`/api/chats/${id}`),
  rename: (id: number, title: string) =>
    req<Chat>(`/api/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  deleteChat: (id: number) =>
    req<any>(`/api/chats/${id}`, { method: 'DELETE' }),
  send: (id: number, content: string) =>
    req<{ user_message: Message; assistant_message: Message }>(
      `/api/chats/${id}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    ),
  retry: (id: number, messageId: number) =>
    req<Message>(`/api/chats/${id}/messages/${messageId}/retry`, {
      method: 'POST',
    }),
  docs: (id: number) => req<Doc[]>(`/api/chats/${id}/documents`),
  docStatus: (id: number) => req<Doc>(`/api/documents/${id}/status`),
  retryDoc: (id: number) =>
    req<Doc>(`/api/documents/${id}/retry`, { method: 'POST' }),
  upload: (id: number, file: File, onProgress: UploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    return new Promise<Doc>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', `${BASE}/api/chats/${id}/documents`);
      if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
      request.upload.onprogress = (event) => {
        onProgress(
          event.lengthComputable
            ? Math.round((event.loaded / event.total) * 100)
            : null
        );
      };
      request.onerror = () =>
        reject(
          new Error(
            `Cannot reach the DocuMind API at ${BASE}. Check that the backend is running and that VITE_API_URL points to its address.`
          )
        );
      request.onabort = () => reject(new Error('The upload was interrupted.'));
      request.onload = () => {
        let body: Doc & { detail?: string };
        try {
          body = JSON.parse(request.responseText);
        } catch {
          reject(new Error(`Request failed (${request.status})`));
          return;
        }
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(body.detail || `Request failed (${request.status})`));
          return;
        }
        resolve(body);
      };
      request.send(form);
    });
  },
  deleteDoc: (id: number) =>
    req<any>(`/api/documents/${id}`, { method: 'DELETE' }),
};
