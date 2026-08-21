import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSend, FiImage, FiPhone, FiCheck, FiCheckCircle,
  FiClock, FiAlertCircle, FiChevronDown, FiMaximize2, FiUser
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useSettings } from '../../context/SettingsContext';
import { chatService } from '../../services/chatService';

// Fallback quick replies by role
const QUICK_REPLIES = {
  USER: [
    "I'm at home, please come in.",
    "Please call once you arrive.",
    "Doorbell is not working, please knock.",
    "Please share your estimated arrival time."
  ],
  VENDOR: [
    "I'm arriving in 5-10 minutes.",
    "I have reached your doorstep.",
    "Please share the exact landmark / flat number.",
    "I'm on my way to your location."
  ],
  WORKER: [
    "I'm arriving in 5-10 minutes.",
    "I have reached your doorstep.",
    "Please share the exact landmark.",
    "I'm on my way."
  ],
  ADMIN: [
    "Hello! Support Admin here. How can I assist you with this booking?",
    "We have reviewed the dispute details and are processing the resolution.",
    "Please share any additional details or photos here.",
    "Our team has intervened to assist with this order."
  ]
};

export default function ChatDrawerModal({
  isOpen,
  onClose,
  bookingId,
  bookingData = null,
  userType = 'user' // 'user' | 'vendor' | 'worker' | 'admin'
}) {
  const socket = useSocket();
  const { isChatEnabled } = useSettings();
  const isChatAllowed = isChatEnabled || userType === 'admin';
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get current user ID and Role
  const getCurrentUser = useCallback(() => {
    try {
      if (userType === 'admin') {
        const aData = JSON.parse(localStorage.getItem('adminUser') || localStorage.getItem('adminData') || '{}');
        return {
          id: (aData._id || aData.id || '').toString(),
          role: 'ADMIN',
          name: aData.name || 'Support Admin'
        };
      } else if (userType === 'vendor') {
        const vData = JSON.parse(localStorage.getItem('vendorData') || '{}');
        return {
          id: (vData._id || vData.id || '').toString(),
          role: 'VENDOR',
          name: vData.name || vData.businessName || 'Service Partner'
        };
      } else if (userType === 'worker') {
        const wData = JSON.parse(localStorage.getItem('workerData') || '{}');
        return {
          id: (wData._id || wData.id || '').toString(),
          role: 'WORKER',
          name: wData.name || 'Technician'
        };
      } else {
        const uData = JSON.parse(localStorage.getItem('userData') || '{}');
        return {
          id: (uData._id || uData.id || '').toString(),
          role: 'USER',
          name: uData.name || 'Customer'
        };
      }
    } catch {
      return { id: '', role: userType.toUpperCase(), name: 'Me' };
    }
  }, [userType]);

  const currentUser = getCurrentUser();

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Handle scroll detection for "New messages ↓" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isScrolledUp);
  };

  // Load chat history
  const loadHistory = useCallback(async (isInitial = true) => {
    if (!bookingId) return;
    try {
      if (isInitial) setLoading(true);
      const res = await chatService.getChatHistory(bookingId);
      if (res.success && res.data) {
        setMessages(res.data.messages || []);
        setIsReadOnly(Boolean(res.data.isReadOnly));
        setHasMore(Boolean(res.data.pagination?.hasMore));
        if (res.data.booking) {
          setBookingInfo(res.data.booking);
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      toast.error(err.message || 'Failed to load chat history');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [bookingId]);

  // Load older messages
  const loadOlderMessages = async () => {
    if (!bookingId || !hasMore || loadingOlder || messages.length === 0) return;
    try {
      setLoadingOlder(true);
      const oldestId = messages[0]?._id;
      const res = await chatService.getChatHistory(bookingId, { before: oldestId });
      if (res.success && res.data) {
        const older = res.data.messages || [];
        setMessages(prev => [...older, ...prev]);
        setHasMore(Boolean(res.data.pagination?.hasMore));
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Mark unread messages as read
  const markAsRead = useCallback(async (unreadList) => {
    if (!bookingId || !unreadList || unreadList.length === 0) return;
    const unreadIds = unreadList.map(m => m._id);

    try {
      if (socket && socket.connected) {
        socket.emit('mark_chat_read', { bookingId, messageIds: unreadIds });
      } else {
        await chatService.markChatRead(bookingId, unreadIds);
      }
    } catch (err) {
      console.warn('Failed to mark chat read:', err);
    }
  }, [bookingId, socket]);

  // Initial setup & Socket listener registration
  useEffect(() => {
    if (!isOpen || !bookingId) return;

    loadHistory(true);

    if (socket) {
      // 1. Join chat room
      socket.emit('join_chat', { bookingId });

      // 2. Chat joined ack
      const handleChatJoined = (data) => {
        if (data.bookingId === bookingId) {
          setIsReadOnly(Boolean(data.isReadOnly));
        }
      };

      // 3. New incoming message
      const handleNewMessage = (msg) => {
        if (msg.bookingId !== bookingId) return;

        setMessages(prev => {
          // Check if message is already in list (e.g. optimistic match)
          const existingIdx = prev.findIndex(
            m => m.clientMessageId === msg.clientMessageId || m._id === msg._id
          );
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = msg;
            return updated;
          }
          return [...prev, msg];
        });

        // If message is from other participant, mark as read
        if (msg.senderId !== currentUser.id) {
          markAsRead([msg]);
          // Play subtle ping sound if available
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.4;
            audio.play().catch(() => {});
          } catch {}
        }

        scrollToBottom(true);
      };

      // 4. Messages read broadcast
      const handleMessagesRead = (data) => {
        if (data.bookingId !== bookingId) return;
        setMessages(prev =>
          prev.map(m => {
            if (m.senderId === currentUser.id) {
              const alreadyRead = (m.readBy || []).some(r => r.userId === data.readerId);
              if (!alreadyRead) {
                return {
                  ...m,
                  readBy: [
                    ...(m.readBy || []),
                    { userId: data.readerId, role: data.readerRole, readAt: data.readAt }
                  ]
                };
              }
            }
            return m;
          })
        );
      };

      // 5. Typing start/stop
      const handleTypingStart = (data) => {
        if (data.bookingId === bookingId && data.senderId !== currentUser.id) {
          setPartnerTyping(true);
        }
      };

      const handleTypingStop = (data) => {
        if (data.bookingId === bookingId && data.senderId !== currentUser.id) {
          setPartnerTyping(false);
        }
      };

      // 6. Partner presence update
      const handlePresence = (data) => {
        if (data.bookingId === bookingId && data.userId !== currentUser.id) {
          setPartnerOnline(Boolean(data.isOnline));
        }
      };

      socket.on('chat_joined', handleChatJoined);
      socket.on('new_chat_message', handleNewMessage);
      socket.on('messages_read', handleMessagesRead);
      socket.on('typing_start', handleTypingStart);
      socket.on('typing_stop', handleTypingStop);
      socket.on('user_presence_update', handlePresence);

      return () => {
        socket.emit('leave_chat', { bookingId });
        socket.off('chat_joined', handleChatJoined);
        socket.off('new_chat_message', handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
        socket.off('typing_start', handleTypingStart);
        socket.off('typing_stop', handleTypingStop);
        socket.off('user_presence_update', handlePresence);
      };
    }
  }, [isOpen, bookingId, socket, currentUser.id, loadHistory, markAsRead, scrollToBottom]);

  // Mark all unread messages as read once messages load
  useEffect(() => {
    if (messages.length > 0) {
      const unreadIncoming = messages.filter(
        m => m.senderId !== currentUser.id && !(m.readBy || []).some(r => r.userId === currentUser.id)
      );
      if (unreadIncoming.length > 0) {
        markAsRead(unreadIncoming);
      }
      scrollToBottom(false);
    }
  }, [messages.length, currentUser.id, markAsRead, scrollToBottom]);

  // Handle typing input with debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (socket && socket.connected && bookingId) {
      socket.emit('typing_start', { bookingId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { bookingId });
      }, 1800);
    }
  };

  // Send message (Optimistic UI)
  const handleSendMessage = async (customText = null, mediaUrl = null) => {
    if (!isChatAllowed) {
      toast.error('In-app chat is currently disabled by admin');
      return;
    }
    const textToSend = (customText !== null ? customText : inputText).trim();
    if (!textToSend && !mediaUrl) return;
    if (isReadOnly) {
      toast.error('Chat is read-only for completed bookings');
      return;
    }

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const msgType = mediaUrl ? (textToSend ? 'IMAGE_WITH_TEXT' : 'IMAGE') : 'TEXT';

    // Optimistic message object
    const optimisticMsg = {
      _id: `temp_${clientMessageId}`,
      clientMessageId,
      bookingId,
      senderId: currentUser.id,
      senderRole: currentUser.role,
      senderName: currentUser.name,
      type: msgType,
      text: textToSend,
      mediaUrl: mediaUrl || null,
      readBy: [{ userId: currentUser.id, role: currentUser.role, readAt: new Date() }],
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // 1. Immediately append to state
    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    scrollToBottom(true);

    if (socket && socket.connected) {
      socket.emit('typing_stop', { bookingId });
    }

    try {
      setSending(true);

      const payload = {
        bookingId,
        clientMessageId,
        type: msgType,
        text: textToSend,
        mediaUrl
      };

      if (socket && socket.connected) {
        socket.emit('send_chat_message', payload, (res) => {
          if (res?.success && res.data) {
            setMessages(prev =>
              prev.map(m => (m.clientMessageId === clientMessageId ? res.data : m))
            );
          } else if (res?.success === false) {
            toast.error(res.message || 'Failed to send message');
          }
        });
      } else {
        // REST Fallback
        const restRes = await chatService.sendMessage(bookingId, payload);
        if (restRes.success && restRes.data) {
          setMessages(prev =>
            prev.map(m => (m.clientMessageId === clientMessageId ? restRes.data : m))
          );
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
      toast.error(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Image Upload handler
  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size cannot exceed 10MB');
      return;
    }

    try {
      setUploadingImage(true);
      setUploadProgress(10);
      const url = await chatService.uploadChatImage(file, (p) => setUploadProgress(p));
      setUploadProgress(100);
      if (url) {
        await handleSendMessage('', url);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Target Participant Info for Header
  const getParticipantDetails = () => {
    const b = bookingInfo || bookingData;
    if (!b) return { name: 'Service Expert', phone: '', avatar: null, role: 'Partner' };

    if (userType === 'user') {
      const partner = b.partner || b.vendorId;
      const worker = b.worker || b.workerId;
      const activeEntity = worker || partner;
      return {
        name: activeEntity?.name || activeEntity?.businessName || b.servicePartnerName || 'Service Partner',
        phone: activeEntity?.phone || '',
        avatar: activeEntity?.avatar || activeEntity?.profilePhoto || null,
        rating: activeEntity?.rating || 4.8,
        role: 'Verified Partner'
      };
    } else {
      const cust = b.customer || b.userId || b.user;
      return {
        name: cust?.name || b.customerName || 'Customer',
        phone: cust?.phone || b.customerPhone || '',
        avatar: cust?.avatar || cust?.profilePicture || null,
        role: 'Customer'
      };
    }
  };

  const participant = getParticipantDetails();
  const quickRepliesList = QUICK_REPLIES[currentUser.role] || QUICK_REPLIES.USER;

  // Format date headers
  const formatDateDivider = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Container (Desktop: Slide-over right 440px, Mobile: Full-screen) */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full sm:max-w-md h-full bg-slate-50 flex flex-col shadow-2xl border-l border-gray-200 overflow-hidden"
      >
        {/* Header (Rapido Style) */}
        <div className="bg-white px-4 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with Online Pulse */}
            <div className="relative w-11 h-11 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 overflow-hidden">
              {participant.avatar ? (
                <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
              ) : (
                <FiUser className="w-5 h-5 text-teal-600" />
              )}
              {partnerOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              )}
            </div>

            {/* Name, Role & Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-sm truncate">{participant.name}</h3>
                <FiCheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" title="Verified" />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className={partnerOnline ? 'text-emerald-600 font-semibold flex items-center gap-1' : 'text-gray-400'}>
                  {partnerOnline ? '● Online' : 'Offline'}
                </span>
                <span>•</span>
                <span className="truncate">{participant.role}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {participant.phone && (
              <a
                href={`tel:${participant.phone}`}
                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                title="Call partner"
              >
                <FiPhone className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              title="Close chat"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Read-Only Status Banner if Completed */}
        {isReadOnly && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-800 shrink-0">
            <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>This booking is completed. Chat history is read-only.</span>
          </div>
        )}

        {/* Chat Messages Body */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting to chat...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-3 border border-teal-100">
                💬
              </div>
              <h4 className="font-bold text-gray-800 text-sm">Direct Booking Chat</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                Connect directly for live coordination, directions, landmarks, or instructions.
              </p>
            </div>
          ) : (
            <>
              {/* Load older messages button */}
              {hasMore && (
                <div className="text-center pb-2">
                  <button
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    className="text-[11px] font-bold text-teal-600 bg-white px-3 py-1 rounded-full shadow-2xs border border-teal-100 hover:bg-teal-50 transition-colors disabled:opacity-50"
                  >
                    {loadingOlder ? 'Loading...' : '↑ Load older messages'}
                  </button>
                </div>
              )}

              {/* Messages grouping */}
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser.id;
                const isRead = (msg.readBy || []).some(r => r.userId !== currentUser.id);

                // Date separator logic
                const prevMsg = messages[idx - 1];
                const showDate = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

                return (
                  <React.Fragment key={msg._id || msg.clientMessageId}>
                    {showDate && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-200/80 px-2.5 py-0.5 rounded-full">
                          {formatDateDivider(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {/* System Message */}
                    {msg.type === 'SYSTEM' ? (
                      <div className="flex justify-center my-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-xl text-center max-w-xs border border-gray-200">
                          {msg.text}
                        </span>
                      </div>
                    ) : (
                      /* Bubble */
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`}>
                        {/* Sender Label for Received */}
                        {!isMe && (
                          <span className="text-[10px] font-bold text-gray-400 ml-2 mb-0.5">
                            {msg.senderName}
                          </span>
                        )}

                        <div
                          className={`max-w-[82%] rounded-2xl p-3 shadow-2xs relative transition-all ${
                            isMe
                              ? 'bg-teal-600 text-white rounded-tr-xs'
                              : 'bg-white text-gray-900 rounded-tl-xs border border-gray-200'
                          }`}
                        >
                          {/* Image Attachment */}
                          {msg.mediaUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden cursor-pointer relative group bg-black/5" onClick={() => setSelectedImageModal(msg.mediaUrl)}>
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="w-full max-h-56 object-cover rounded-xl transition-transform group-hover:scale-102"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <FiMaximize2 className="w-5 h-5 drop-shadow" />
                              </div>
                            </div>
                          )}

                          {/* Text Message */}
                          {msg.text && (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words select-text">
                              {msg.text}
                            </p>
                          )}

                          {/* Timestamp and Read Status */}
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? 'text-teal-100' : 'text-gray-400'}`}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {isMe && (
                              <span>
                                {msg.isOptimistic ? (
                                  <FiClock className="w-2.5 h-2.5 inline" title="Sending..." />
                                ) : isRead ? (
                                  <span className="text-cyan-200 font-bold" title="Read">✓✓</span>
                                ) : (
                                  <span className="text-teal-200" title="Delivered">✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Live Partner Typing Indicator */}
              {partnerTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl px-3 py-2 w-fit shadow-2xs"
                >
                  <span className="text-[10px] text-gray-500 font-medium">{participant.name} is typing</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}

          {/* Floating Scroll-to-Bottom Pill */}
          {showScrollBottom && (
            <button
              onClick={() => scrollToBottom(true)}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-1.5 hover:bg-teal-700 transition-all z-20"
            >
              <span>New messages</span>
              <FiChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Replies Chips (Rapido Style) */}
        {!isReadOnly && isChatAllowed && (
          <div className="px-4 py-2 border-t border-gray-200 bg-white/90 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
            {quickRepliesList.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reply)}
                className="px-3 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 text-gray-700 text-[11px] font-medium whitespace-nowrap border border-gray-200 transition-all active:scale-95 shrink-0"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        {isReadOnly ? (
          <div className="p-3 bg-gray-100 border-t border-gray-200 text-center text-xs text-gray-500 font-medium shrink-0">
            Chat is closed for this completed booking.
          </div>
        ) : !isChatAllowed ? (
          <div className="p-4 bg-slate-50 border-t border-gray-200 shrink-0 text-center text-xs text-slate-600 font-semibold flex items-center justify-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-amber-500" />
            <span>In-app chat is currently paused by admin. Please contact via phone call.</span>
          </div>
        ) : (
          <div className="p-3 bg-white border-t border-gray-200 shrink-0">
            {/* Upload Progress Bar */}
            {uploadingImage && (
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-teal-600 font-bold mb-1">
                  <span>Uploading image...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-teal-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || sending}
                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50 shrink-0"
                title="Send photo"
              >
                <FiImage className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelected}
                className="hidden"
              />

              {/* Text Input */}
              <input
                type="text"
                placeholder="Type your message..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 focus:bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-teal-500 transition-all"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all disabled:opacity-40 active:scale-95 shrink-0 shadow-xs"
                title="Send message"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </motion.div>

      {/* Lightbox Image Preview Modal */}
      <AnimatePresence>
        {selectedImageModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImageModal(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />
            <div className="relative z-10 max-w-3xl max-h-[90vh]">
              <button
                onClick={() => setSelectedImageModal(null)}
                className="absolute -top-10 right-0 text-white p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
              <img
                src={selectedImageModal}
                alt="Enlarged preview"
                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
