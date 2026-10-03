import React, { useEffect, useRef, useState } from 'react';
import { get, post, del, sseStream } from '../api.js';
import { useI18n } from '../i18n.jsx';
import Markdown from '../components/Markdown.jsx';
import { useToast } from '../components/ui.jsx';

export default function Chat() {
  const { t } = useI18n();
  const toast = useToast();
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { loadChats(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamText]);

  async function loadChats() {
    try {
      const d = await get('/chats');
      setChats(d.chats);
      if (d.chats.length && !active) openChat(d.chats[0]);
    } catch (e) { toast(e.message, 'error'); }
  }

  async function openChat(chat) {
    setActive(chat);
    try {
      const d = await get(`/chats/${chat.id}`);
      setMessages(d.messages);
    } catch (e) { toast(e.message, 'error'); }
  }

  async function newChat() {
    try {
      const d = await post('/chats', {});
      setChats((c) => [d.chat, ...c]);
      setActive(d.chat);
      setMessages([]);
    } catch (e) { toast(e.message, 'error'); }
  }

  async function removeChat(e, chat) {
    e.stopPropagation();
    if (!confirm(t('common_confirm_delete'))) return;
    try {
      await del(`/chats/${chat.id}`);
      setChats((c) => c.filter((x) => x.id !== chat.id));
      if (active?.id === chat.id) { setActive(null); setMessages([]); }
    } catch (err) { toast(err.message, 'error'); }
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    let chat = active;
    if (!chat) {
      const d = await post('/chats', { title: text.slice(0, 60) });
      chat = d.chat;
      setChats((c) => [chat, ...c]);
      setActive(chat);
    }
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setStreaming(true);
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;
    await sseStream(`/chats/${chat.id}/messages`, { message: text }, {
      signal: controller.signal,
      onDelta: (d) => setStreamText((s) => s + d),
      onDone: () => {
        setStreamText((s) => {
          setMessages((m) => [...m, { role: 'assistant', content: s }]);
          return '';
        });
        setStreaming(false);
        loadChats();
      },
      onError: (err) => { toast(err.message, 'error'); setStreaming(false); setStreamText(''); },
    }).catch((e) => {
      if (e.name !== 'AbortError') toast(e.message, 'error');
      setStreaming(false);
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('chat_title')}</h1>
        <button className="btn btn-primary" onClick={newChat}>＋ {t('chat_new')}</button>
      </div>
      <div className="chat-layout">
        <div className="card chat-list">
          {chats.length === 0 && <div className="muted text-center" style={{ padding: 20, fontSize: 13 }}>{t('chat_empty')}</div>}
          {chats.map((c) => (
            <div key={c.id} className={`chat-item ${active?.id === c.id ? 'active' : ''}`} onClick={() => openChat(c)}>
              <span className="chat-item-title">💬 {c.title}</span>
              <button className="chat-del" onClick={(e) => removeChat(e, c)}>✕</button>
            </div>
          ))}
        </div>
        <div className="card chat-pane">
          <div className="chat-messages">
            {messages.length === 0 && !streaming && (
              <div className="empty-state" style={{ margin: 'auto' }}><div className="icon">💬</div>{t('chat_empty')}</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg msg-${m.role}`}>
                {m.role === 'assistant' ? <Markdown content={m.content} /> : m.content}
              </div>
            ))}
            {streaming && streamText && (
              <div className="msg msg-assistant typing-cursor"><Markdown content={streamText} /></div>
            )}
            {streaming && !streamText && (
              <div className="msg msg-assistant"><span className="spinner spinner-dark" /></div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-bar">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={t('chat_placeholder')}
              rows={1}
            />
            <button className="btn btn-primary" onClick={send} disabled={streaming || !input.trim()}>
              {streaming ? <span className="spinner" /> : t('chat_send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
