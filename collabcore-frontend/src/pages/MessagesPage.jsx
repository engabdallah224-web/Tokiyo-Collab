import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ChevronLeft, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  subscribeToMyDMConversations,
  subscribeToDirectMessages,
  sendDirectMessage,
  fetchUserProfile,
} from '../services/firestoreService';

const MessagesPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const withParam = searchParams.get('with');

  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeUserId, setActiveUserId] = useState(withParam || null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const myUid = user?.uid;

  // Load all conversations
  useEffect(() => {
    if (!myUid) return;
    setLoadingConvs(true);
    const unsub = subscribeToMyDMConversations(myUid, (convs) => {
      setConversations(convs);
      setLoadingConvs(false);
    });
    return unsub;
  }, [myUid]);

  // When ?with= param changes, set active user
  useEffect(() => {
    if (withParam && withParam !== activeUserId) {
      setActiveUserId(withParam);
    }
  }, [withParam]);

  // Fetch profile of active user if not in conversations yet
  useEffect(() => {
    if (!activeUserId) {
      setActiveUser(null);
      return;
    }
    // Try to find in conversations list
    const found = conversations.find((c) => c.otherUserId === activeUserId);
    if (found?.otherUser) {
      setActiveUser(found.otherUser);
    } else {
      fetchUserProfile(activeUserId)
        .then((p) => setActiveUser(p))
        .catch(() => setActiveUser(null));
    }
  }, [activeUserId, conversations]);

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!myUid || !activeUserId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToDirectMessages(myUid, activeUserId, setMessages);
    return unsub;
  }, [myUid, activeUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = (userId) => {
    setActiveUserId(userId);
    setSearchParams({ with: userId });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeUserId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      await sendDirectMessage({ toUserId: activeUserId, content });
    } catch {
      setText(content); // restore on error
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDisplayName = (conv) => {
    if (conv.otherUser?.full_name) return conv.otherUser.full_name;
    return conv.otherUserId?.slice(0, 8) + '…';
  };

  const activeConvName = activeUser?.full_name || activeUserId?.slice(0, 8) + '…';
  const activeAvatar = activeUser?.avatar_url || activeUser?.profile_pic;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 flex">
      {/* ── Sidebar: conversation list ───────────────────────────────── */}
      <div
        className={`
          flex-shrink-0 w-full md:w-72 lg:w-80 border-r border-gray-200 bg-white flex flex-col
          ${activeUserId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="px-4 py-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-red-600" />
            Messages
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <p className="text-sm text-gray-500 text-center py-10">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conversations yet.<br />Start one from a project workspace.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.dmId}
                onClick={() => openConversation(conv.otherUserId)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${
                  activeUserId === conv.otherUserId ? 'bg-red-50 border-l-2 border-l-red-600' : ''
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {conv.otherUser?.avatar_url || conv.otherUser?.profile_pic ? (
                    <img
                      src={conv.otherUser.avatar_url || conv.otherUser.profile_pic}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{getDisplayName(conv)}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatTime(conv.lastAt)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${activeUserId ? 'flex' : 'hidden md:flex'}`}>
        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-16 w-16 text-gray-200 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700">Select a conversation</h2>
            <p className="text-sm text-gray-500 mt-1">Choose a conversation from the left to start chatting.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => { setActiveUserId(null); setSearchParams({}); }}
                className="md:hidden p-1 text-gray-500 hover:text-gray-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {activeAvatar ? (
                  <img src={activeAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{activeConvName}</p>
                {activeUser?.university && (
                  <p className="text-xs text-gray-500">{activeUser.university}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isMe = msg.sender_id === myUid;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          isMe
                            ? 'bg-red-600 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                        }`}
                      >
                        <p className="break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-red-200' : 'text-gray-400'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending}
                className="h-9 w-9 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
