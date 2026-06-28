'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Send } from 'lucide-react';
import { databases, DATABASE_ID, CHATS_ID, MESSAGES_ID, PROFILES_ID, PRODUCTS_ID, mapDoc, Chat, Message, Profile, Product, client } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import styles from '../pesan.module.css';

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const fetchChatAndMessages = async () => {
      try {
        // Fetch Chat
        const chatDoc = await databases.getDocument(DATABASE_ID, CHATS_ID, id);
        const fetchedChat = mapDoc<Chat>(chatDoc);
        setChat(fetchedChat);

        // Fetch other user profile
        const otherUserId = fetchedChat.buyer_id === user.$id ? fetchedChat.seller_id : fetchedChat.buyer_id;
        const profileRes = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [
          Query.equal('user_id', otherUserId)
        ]);
        if (profileRes.documents.length > 0) {
          setOtherUser(mapDoc<Profile>(profileRes.documents[0]));
        }

        // Fetch product
        try {
          const productDoc = await databases.getDocument(DATABASE_ID, PRODUCTS_ID, fetchedChat.product_id);
          setProduct(mapDoc<Product>(productDoc));
        } catch (e) {
          console.log('Product might be deleted');
        }

        // Fetch Messages
        const msgRes = await databases.listDocuments(DATABASE_ID, MESSAGES_ID, [
          Query.equal('chat_id', id),
          Query.orderAsc('$createdAt'),
          Query.limit(100)
        ]);
        setMessages(msgRes.documents.map(doc => mapDoc<Message>(doc)));

      } catch (error) {
        console.error('Error fetching chat:', error);
      }
      setLoading(false);
    };

    fetchChatAndMessages();

    // Subscribe to realtime messages
    const unsubscribe = client.subscribe(`databases.${DATABASE_ID}.collections.${MESSAGES_ID}.documents`, response => {
      if (response.events.includes('databases.*.collections.*.documents.*.create')) {
        const newMsg = mapDoc<Message>(response.payload);
        if (newMsg.chat_id === id) {
          setMessages(prev => {
            // avoid duplicate if we sent it
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [id, user]);

  const handleSend = async () => {
    if (!inputText.trim() || !user || !chat) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Create message
      const newMsg = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_ID,
        ID.unique(),
        {
          chat_id: id,
          sender_id: user.$id,
          text: textToSend,
          is_read: false
        }
      );

      // Update chat last message
      await databases.updateDocument(
        DATABASE_ID,
        CHATS_ID,
        id,
        {
          last_message: textToSend,
          last_message_time: new Date().toISOString()
        }
      );

      // Add to local state (realtime might be slightly delayed)
      const mappedMsg = mapDoc<Message>(newMsg);
      setMessages(prev => {
        if (prev.find(m => m.id === mappedMsg.id)) return prev;
        return [...prev, mappedMsg];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Gagal mengirim pesan.');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: 'var(--navbar-height)' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.emptyState}>Chat tidak ditemukan.</div>
        </div>
      </div>
    );
  }

  const name = otherUser?.full_name || 'Pengguna';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.roomContainer}>
          
          {/* Header */}
          <div className={styles.roomHeader}>
            <button className={styles.backBtn} onClick={() => router.push('/pesan')}>
              <ChevronLeft size={20} />
            </button>
            <div className={styles.roomUser}>
              <div className={styles.roomAvatar}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className={styles.roomName}>{name}</div>
                {product && <div className={styles.roomProduct}>Terkait: {product.title}</div>}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messageList}>
            {messages.length === 0 ? (
              <div className={styles.emptyState} style={{ fontSize: '0.9rem' }}>
                Kirim pesan untuk memulai percakapan.
              </div>
            ) : (
              messages.map(msg => {
                const isSent = msg.sender_id === user?.$id;
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const senderName = isSent ? 'Anda' : name;
                
                return (
                  <div key={msg.id} className={`${styles.messageRow} ${isSent ? styles.sent : styles.received}`}>
                    <div className={styles.msgAvatar}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.msgContent}>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgSender}>{senderName}</span>
                        <span className={styles.messageTime}>{timeStr}</span>
                      </div>
                      <div className={styles.messageBubble}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={styles.inputArea}>
            <textarea
              className={styles.messageInput}
              placeholder="Tulis pesan..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              rows={1}
            />
            <button 
              className={styles.sendBtn} 
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Send size={18} />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
