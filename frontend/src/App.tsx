import { useEffect, useRef, useState } from 'react';
import {
  FileUp,
  Plus,
  Search,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
  Send,
  Mic,
  Trash2,
  Copy,
  RefreshCw,
  FileText,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';

import Auth from './components/Auth';
import Splash from './components/Splash';
import Markdown from './components/Markdown';
import AnimatedLogo from './AnimatedLogo';
import ThemeToggle from './components/ThemeToggle';
import BrandMark from './components/BrandMark';

import {
  api,
  setToken,
  type Chat,
  type Message,
  type Doc,
} from './services/api';
import { applyTheme, getSavedTheme } from './theme';

type UploadTask = {
  filename: string;
  chatId: number;
  progress: number | null;
  stage: 'uploading' | 'processing' | 'failed';
  documentId?: number;
  error?: string;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [right, setRight] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [dark, setDark] = useState(() => getSavedTheme() === 'dark');
  const [error, setError] = useState('');
  const [uploadTask, setUploadTask] = useState<UploadTask | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<number | null>(null);
  const uploadLockRef = useRef(false);
  const selectedUploadRef = useRef<File | null>(null);
  const uploadQueueRef = useRef<{
    chatId: number;
    files: File[];
    generation: number;
  } | null>(null);
  const uploadGenerationRef = useRef(0);
  const documentsReady = docs.every((document) => document.status === 'ready');
  const interactionLocked =
    busy || uploadTask !== null || !documentsReady;

  useEffect(() => {
    applyTheme(dark ? 'dark' : 'light');
  }, [dark]);

  function toggleTheme() {
    setDark((previous) => !previous);
  }

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setToken(''))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (user) refreshChats();
  }, [user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function refreshChats() {
    try {
      setChats(await api.chats());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function openChat(id: number) {
    activeRef.current = id;
    setActive(id);
    setMobile(false);
    setError('');

    try {
      const [chat, documents] = await Promise.all([
        api.getChat(id),
        api.docs(id),
      ]);

      setMessages(chat.messages);
      setDocs(documents);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function newChat() {
    try {
      const chat = await api.createChat();

      setChats((previous) => [chat, ...previous]);
      setActive(chat.id);
      setMessages([]);
      setDocs([]);
      activeRef.current = chat.id;
      setMobile(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function send() {
    if (
      !input.trim() ||
      !active ||
      busy ||
      uploadLockRef.current ||
      !docs.every((document) => document.status === 'ready')
    ) return;

    const value = input.trim();

    setInput('');
    setBusy(true);
    setError('');

    setMessages((previous) => [
      ...previous,
      {
        id: Date.now(),
        role: 'user',
        content: value,
        sources: [],
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const response = await api.send(active, value);

      setMessages((previous) => [
        ...previous,
        response.assistant_message,
      ]);

      await refreshChats();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateDocument(chatId: number, document: Doc) {
    if (activeRef.current !== chatId) return;
    setDocs((previous) => {
      const exists = previous.some((item) => item.id === document.id);
      return exists
        ? previous.map((item) => item.id === document.id ? document : item)
        : [document, ...previous];
    });
  }

  async function waitForDocument(
    chatId: number,
    document: Doc,
    filename: string,
    releaseLock = true,
    generation = uploadGenerationRef.current
  ) {
    let current = document;
    while (current.status === 'processing') {
      if (generation !== uploadGenerationRef.current) return false;
      setUploadTask({
        filename,
        chatId,
        progress: 100,
        stage: 'processing',
        documentId: current.id,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      if (generation !== uploadGenerationRef.current) return false;
      try {
        current = await api.docStatus(current.id);
      } catch (caught) {
        if (generation !== uploadGenerationRef.current) return false;
        setError((caught as Error).message);
        continue;
      }
      if (generation !== uploadGenerationRef.current) return false;
      updateDocument(chatId, current);
    }

    if (generation !== uploadGenerationRef.current) return false;
    if (current.status === 'failed') {
      const message = current.error || 'Document processing failed.';
      setUploadTask({
        filename,
        chatId,
        progress: 100,
        stage: 'failed',
        documentId: current.id,
        error: message,
      });
      setError(`${current.filename}: ${message}`);
      uploadLockRef.current = false;
      return false;
    }

    if (current.status !== 'ready') {
      throw new Error(`Unexpected document status: ${current.status}`);
    }

    if (releaseLock) {
      setUploadTask(null);
      uploadLockRef.current = false;
      selectedUploadRef.current = null;
    }
    return true;
  }

  async function uploadFile(
    file: File,
    chatId: number,
    keepLock = false,
    generation = uploadGenerationRef.current
  ): Promise<boolean> {
    if (generation !== uploadGenerationRef.current) return false;
    setError('');
    setUploadTask({
      filename: file.name,
      chatId,
      progress: 0,
      stage: 'uploading',
    });
    selectedUploadRef.current = file;

    try {
      const document = await api.upload(chatId, file, (progress) => {
        if (generation !== uploadGenerationRef.current) return;
        setUploadTask((previous) =>
          previous?.filename === file.name
            ? { ...previous, progress }
            : previous
        );
      });
      if (generation !== uploadGenerationRef.current) return false;
      updateDocument(chatId, document);
      return await waitForDocument(
        chatId,
        document,
        file.name,
        !keepLock,
        generation
      );
    } catch (caught) {
      if (generation !== uploadGenerationRef.current) return false;
      const message = (caught as Error).message;
      setUploadTask({
        filename: file.name,
        chatId,
        progress: null,
        stage: 'failed',
        error: message,
      });
      setError(message);
      uploadLockRef.current = false;
      return false;
    }
  }

  async function continueUploadQueue() {
    const queue = uploadQueueRef.current;
    if (!queue) return;

    while (queue.files.length > 0) {
      if (queue.generation !== uploadGenerationRef.current) return;
      const file = queue.files[0];
      selectedUploadRef.current = file;
      if (!(await uploadFile(file, queue.chatId, true, queue.generation))) return;
      queue.files.shift();
    }

    if (queue.generation !== uploadGenerationRef.current) return;
    uploadQueueRef.current = null;
    selectedUploadRef.current = null;
    uploadLockRef.current = false;
    setUploadTask(null);
  }

  async function upload(files: FileList | null) {
    const selectedFiles = files ? Array.from(files) : [];
    const chatId = active;
    if (
      selectedFiles.length === 0 ||
      !chatId ||
      uploadLockRef.current ||
      busy ||
      !docs.every((document) => document.status === 'ready')
    ) return;

    uploadLockRef.current = true;
    const generation = ++uploadGenerationRef.current;
    uploadQueueRef.current = { chatId, files: selectedFiles, generation };
    await continueUploadQueue();
  }

  async function retryUpload() {
    if (uploadLockRef.current || !uploadTask) return;
    uploadLockRef.current = true;
    setError('');
    const generation =
      uploadQueueRef.current?.generation ?? uploadGenerationRef.current;

    try {
      if (uploadTask.documentId) {
        const document = await api.retryDoc(uploadTask.documentId);
        updateDocument(uploadTask.chatId, document);
        const ready = await waitForDocument(
          uploadTask.chatId,
          document,
          uploadTask.filename,
          Boolean(uploadQueueRef.current),
          generation
        );
        if (ready && uploadQueueRef.current) {
          uploadQueueRef.current.files.shift();
          await continueUploadQueue();
        }
        return;
      }

      if (!selectedUploadRef.current || !uploadQueueRef.current) {
        throw new Error('Select the file again to retry this upload.');
      }
      await continueUploadQueue();
    } catch (caught) {
      if (generation !== uploadGenerationRef.current) return;
      const message = (caught as Error).message;
      setUploadTask((previous) =>
        previous
          ? { ...previous, stage: 'failed', error: message }
          : previous
      );
      setError(message);
      uploadLockRef.current = false;
    }
  }

  function dismissUploadError() {
    uploadGenerationRef.current += 1;
    setUploadTask(null);
    uploadLockRef.current = false;
    selectedUploadRef.current = null;
    uploadQueueRef.current = null;
  }

  async function retryDocument(documentId: number) {
    const document = docs.find((item) => item.id === documentId);
    const chatId = activeRef.current ?? active;
    if (!document || !chatId || uploadLockRef.current) return;
    uploadLockRef.current = true;
    const generation = ++uploadGenerationRef.current;
    setError('');
    setUploadTask({
      filename: document.filename,
      chatId,
      progress: 100,
      stage: 'processing',
      documentId,
    });

    try {
      const retried = await api.retryDoc(documentId);
      updateDocument(chatId, retried);
      await waitForDocument(
        chatId,
        retried,
        document.filename,
        true,
        generation
      );
    } catch (caught) {
      if (generation !== uploadGenerationRef.current) return;
      const message = (caught as Error).message;
      setUploadTask({
        filename: document.filename,
        chatId,
        progress: 100,
        stage: 'failed',
        documentId,
        error: message,
      });
      setError(message);
      uploadLockRef.current = false;
    }
  }

  async function removeChat(id: number) {
    if (
      !confirm(
        'Delete this conversation and its documents?'
      )
    ) {
      return;
    }

    await api.deleteChat(id);

    setChats((previous) =>
      previous.filter((chat) => chat.id !== id)
    );

    if (active === id) {
      activeRef.current = null;
      setActive(null);
      setMessages([]);
      setDocs([]);
    }
  }

  function logout() {
    uploadGenerationRef.current += 1;
    uploadLockRef.current = false;
    uploadQueueRef.current = null;
    selectedUploadRef.current = null;
    setUploadTask(null);
    setToken('');
    setUser(null);
    setChats([]);
    setActive(null);
    activeRef.current = null;
  }

  useEffect(() => {
    if (active === null) return;
    const pendingIds = docs
      .filter(
        (document) =>
          document.status === 'processing' &&
          document.id !== uploadTask?.documentId
      )
      .map((document) => document.id);
    if (pendingIds.length === 0) return;

    let cancelled = false;
    let timer = 0;
    const poll = async () => {
      try {
        const updated = await Promise.all(
          pendingIds.map((id) => api.docStatus(id))
        );
        if (!cancelled && activeRef.current === active) {
          setDocs((previous) =>
            previous.map(
              (document) =>
                updated.find((item) => item.id === document.id) || document
            )
          );
        }
      } catch (caught) {
        if (!cancelled) setError((caught as Error).message);
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, 1200);
      }
    };

    timer = window.setTimeout(poll, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, docs, uploadTask?.documentId]);

  function voice() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Voice input is not supported in this browser.'
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'en-IN';

    recognition.onresult = (event: any) => {
      setInput(
        (previous) =>
          previous +
          ' ' +
          event.results[0][0].transcript
      );
    };

    recognition.onerror = () => {
      setError(
        'Microphone permission or speech recognition error.'
      );
    };

    recognition.start();
  }

  if (checking) {
    return <div className="boot">Loading workspace…</div>;
  }

  if (!user) {
    return (
      <>
        <Splash dark={dark} onToggleTheme={toggleTheme} />
        <Auth
          onAuth={() => api.me().then(setUser)}
          dark={dark}
          onToggleTheme={toggleTheme}
        />
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside
        className={`sidebar ${
          mobile ? 'mobile-open' : ''
        }`}
      >
        <div className="side-brand">
          <BrandMark />

          <b>
            DOCUMIND <i>AI</i>
          </b>

          <button
            className="icon-btn mobile-only"
            onClick={() => setMobile(false)}
            aria-label="Close sidebar"
          >
            <X />
          </button>
        </div>

        <button className="new-chat" onClick={newChat}>
          <Plus size={17} />
          New chat
        </button>

        <div className="search-box">
          <Search size={15} />

          <input
            placeholder="Search chats"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
          />
        </div>

        <div className="history-label">
          RECENT CONVERSATIONS
        </div>

        <div className="chat-list">
          {chats
            .filter((chat) =>
              chat.title
                .toLowerCase()
                .includes(query.toLowerCase())
            )
            .map((chat) => (
              <div
                className={`chat-item ${
                  active === chat.id ? 'selected' : ''
                }`}
                key={chat.id}
              >
                <button
                  onClick={() => openChat(chat.id)}
                >
                  <MessageSquare size={15} />
                  <span>{chat.title}</span>
                </button>

                <button
                  className="delete-chat"
                  title="Delete chat"
                  aria-label={`Delete ${chat.title}`}
                  onClick={() => removeChat(chat.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-bottom">
          <div className="user-chip">
            <div className="avatar">
              {(user.name || user.email)?.[0]?.toUpperCase()}
            </div>

            <span>{user.name || user.email}</span>
          </div>

          <ThemeToggle
            dark={dark}
            onToggle={toggleTheme}
            className="side-action"
          />

          <button
            className="side-action"
            onClick={logout}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {mobile && (
        <div
          className="scrim"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Main workspace */}
      <main className="main">
        <header className="topbar">
          <div className="top-left">
            <button
              className="icon-btn mobile-only"
              onClick={() => setMobile(true)}
              aria-label="Open sidebar"
            >
              <Menu />
            </button>

            <span className="crumb">
              Workspace <b>/</b>{' '}
              {chats.find(
                (chat) => chat.id === active
              )?.title || 'New conversation'}
            </span>
          </div>

          <div className="top-actions">
            <span className="secure-tag">
              <span />
              PRIVATE SESSION
            </span>

            <button
              className="icon-btn"
              onClick={() => setRight(!right)}
              title="Toggle document panel"
              aria-label="Toggle document panel"
            >
              {right ? (
                <PanelRightClose />
              ) : (
                <PanelRightOpen />
              )}
            </button>
          </div>
        </header>

        <section className="chat-scroll">
          <div className="conversation">
            {!active || messages.length === 0 ? (
              <div className="welcome">
                <ThemeToggle
                  dark={dark}
                  onToggle={toggleTheme}
                  className="welcome-theme-toggle"
                />
                {/* Animated logo replaces the old Orb */}
                <AnimatedLogo />

                <p className="eyebrow">
                  DOCUMENT INTELLIGENCE, REIMAGINED
                </p>

                <h2>
                  What would you like
                  <br />
                  to <em>understand?</em>
                </h2>

                <p className="muted">
                  Upload your documents and ask questions.
                  Answers are grounded in retrieved passages,
                  with source references.
                </p>

                <div className="suggestions">
                  {[
                    'Summarize the key points in my document',
                    'What are the main findings?',
                    'Find important dates and figures',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() =>
                        setInput(suggestion)
                      }
                    >
                      {suggestion}
                      <span>↗</span>
                    </button>
                  ))}
                </div>

                {!active && (
                  <button
                    className="primary"
                    onClick={newChat}
                  >
                    <Plus size={16} />
                    Start a conversation
                  </button>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <article
                    className={`message ${message.role}`}
                    key={message.id}
                  >
                    <div className="message-avatar">
                      {message.role === 'assistant'
                        ? '✳'
                        : (user.name || user.email)?.[0]?.toUpperCase()}
                    </div>

                    <div className="message-body">
                      <div className="message-author">
                        {message.role === 'assistant'
                          ? 'DocuMind AI'
                          : 'You'}
                      </div>

                      {message.role === 'assistant' ? (
                        <Markdown text={message.content} />
                      ) : (
                        <p>{message.content}</p>
                      )}

                      {message.sources?.length > 0 && (
                        <div className="sources">
                          <div className="source-heading">
                            <FileText size={14} />
                            SOURCES USED
                          </div>

                          {message.sources.map((source) => (
                            <div
                              className="source"
                              key={source.chunk_id}
                            >
                              <span>
                                {source.filename}
                                {source.page_number
                                  ? `, p. ${source.page_number}`
                                  : ''}
                              </span>

                              <small>
                                Chunk {source.chunk_id}
                              </small>

                              <p>{source.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {message.role === 'assistant' && (
                        <div className="message-tools">
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(
                                message.content
                              )
                            }
                          >
                            <Copy size={14} />
                            Copy
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const response =
                                  await api.retry(
                                    active!,
                                    message.id
                                  );

                                setMessages((previous) =>
                                  previous.map((item) =>
                                    item.id === message.id
                                      ? response
                                      : item
                                  )
                                );
                              } catch (e) {
                                setError(
                                  (e as Error).message
                                );
                              }
                            }}
                          >
                            <RefreshCw size={14} />
                            Regenerate
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}

                {busy && (
                  <div className="thinking">
                    <span />
                    <span />
                    <span />
                    Working with your documents…
                  </div>
                )}

                <div ref={endRef} />
              </>
            )}
          </div>
        </section>

        {error && (
          <div className="error-banner">
            {error}

            <button onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        {/* Message composer */}
        <div className="composer-wrap">
          {uploadTask && (
            <div
              className={`upload-status ${
                uploadTask.stage === 'failed' ? 'upload-status-failed' : ''
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="upload-status-heading">
                <strong title={uploadTask.filename}>
                  {uploadTask.filename}
                </strong>
                <span>
                  {uploadTask.stage === 'uploading'
                    ? 'Uploading'
                    : uploadTask.stage === 'processing'
                      ? 'Processing'
                      : 'Failed'}
                </span>
              </div>
              {uploadTask.stage === 'uploading' &&
                uploadTask.progress !== null && (
                  <progress
                    max={100}
                    value={uploadTask.progress}
                    aria-label={`Uploading ${uploadTask.filename}: ${uploadTask.progress}%`}
                  />
                )}
              <p
                className={
                  uploadTask.stage === 'failed'
                    ? 'upload-status-error'
                    : undefined
                }
              >
                {uploadTask.stage === 'uploading'
                  ? uploadTask.progress === null
                    ? 'Sending file to the server…'
                    : `Uploading file… ${uploadTask.progress}%`
                  : uploadTask.stage === 'processing'
                    ? 'Upload complete. Preparing the document for search…'
                    : uploadTask.error}
              </p>
              {uploadTask.stage === 'failed' && (
                <div className="upload-status-actions">
                  <button
                    className="upload-retry"
                    onClick={() => void retryUpload()}
                    disabled={uploadLockRef.current}
                  >
                    Retry {uploadTask.documentId ? 'processing' : 'upload'}
                  </button>
                  {!uploadTask.documentId && (
                    <button
                      className="upload-retry"
                      onClick={dismissUploadError}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="composer">
            <button
              className="icon-btn attach"
              onClick={() => fileRef.current?.click()}
              disabled={!active || interactionLocked}
              title="Upload document"
              aria-label="Upload document"
            >
              <FileUp />
            </button>

            <input
              ref={fileRef}
              type="file"
              hidden
              multiple
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = '';
              }}
            />

            <textarea
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={
                active
                  ? 'Ask a question about your documents…'
                  : 'Start a new chat to begin'
              }
              disabled={!active || interactionLocked}
              aria-label={
                interactionLocked
                  ? 'Wait until document processing finishes before asking a question'
                  : 'Ask a question'
              }
              rows={1}
            />

            <button
              className="icon-btn"
              onClick={voice}
              title="Voice input"
              aria-label="Voice input"
            >
              <Mic />
            </button>

            <button
              className="send-btn"
              disabled={
                !input.trim() || !active || interactionLocked
              }
              onClick={send}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </div>

          <p className="composer-note">
            DocuMind AI can make mistakes. Verify important
            information against the cited source.
          </p>
        </div>
      </main>

      {/* Document panel */}
      {right && (
        <aside className="context-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                YOUR KNOWLEDGE BASE
              </span>

              <h3>Documents</h3>
            </div>

            <button
              className="icon-btn"
              onClick={() => setRight(false)}
              aria-label="Close document panel"
            >
              <X size={17} />
            </button>
          </div>

          <button
            className="upload-zone"
            disabled={
              busy ||
              uploadTask !== null ||
              !documentsReady
            }
            onClick={() =>
              active
                ? fileRef.current?.click()
                : newChat()
            }
          >
            <FileUp />
            <b>Upload documents</b>
            <span>
              PDF, DOCX, TXT, PNG, JPG, WEBP · up to 20 MB per file
            </span>
          </button>

          <div className="doc-count">
            {docs.length} FILE
            {docs.length === 1 ? '' : 'S'} IN THIS CHAT
          </div>

          {docs.map((document) => (
            <div
              className="doc-card"
              key={document.id}
            >
              <div className="doc-icon">
                <FileText />
              </div>

              <div className="doc-info">
                <b>{document.filename}</b>

                <span
                  className={
                    document.status === 'ready'
                      ? 'status-ready'
                      : 'status-other'
                  }
                >
                  {document.status === 'ready'
                    ? '● Indexed'
                    : `● ${document.status}`}
                </span>

                {document.error && (
                  <small>{document.error}</small>
                )}
                {document.status === 'failed' && (
                  <button
                    className="upload-retry"
                    onClick={() => void retryDocument(document.id)}
                    disabled={uploadTask !== null}
                  >
                    Retry processing
                  </button>
                )}
              </div>

              <button
                className="icon-btn"
                disabled={document.status === 'processing'}
                onClick={async () => {
                  await api.deleteDoc(document.id);

                  setDocs((previous) =>
                    previous.filter(
                      (item) => item.id !== document.id
                    )
                  );
                }}
                title="Remove document"
                aria-label={`Remove ${document.filename}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {docs.length === 0 && (
            <div className="empty-docs">
              <FileText />

              <p>
                Your uploaded files will appear here.
              </p>

              <small>
                Start a chat and add a document to build
                context.
              </small>
            </div>
          )}

          <div className="privacy-note">
            <span>✳</span>

            <div>
              <b>Context stays scoped</b>

              <p>
                Retrieval filters document chunks by your
                account. Cloud AI providers may receive
                retrieved excerpts when answering.
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
