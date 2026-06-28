'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { databases, DATABASE_ID, CHATS_ID, PROFILES_ID, mapDoc, Chat, Profile } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/lib/AuthContext';
import styles from './pesan.module.css';

export default function InboxPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchChats = async () => {
      try {
        // Fetch chats where user is buyer OR seller
        // Appwrite requires separate queries if we don't have a complex index, 
        // but let's try fetching both and merging
        const buyerChatsRes = await databases.listDocuments(DATABASE_ID, CHATS_ID, [
          Query.equal('buyer_id', user.$id),
          Query.orderDesc('last_message_time')
        ]);
        
        const sellerChatsRes = await databases.listDocuments(DATABASE_ID, CHATS_ID, [
          Query.equal('seller_id', user.$id),
          Query.orderDesc('last_message_time')
        ]);

        const allDocs = [...buyerChatsRes.documents, ...sellerChatsRes.documents];
        
        // Remove duplicates if any (though shouldn't be)
        const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.$id, item])).values());
        
        // Sort by time
        uniqueDocs.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

        const fetchedChats = uniqueDocs.map(doc => mapDoc<Chat>(doc));

        // Fetch profiles for the OTHER person in the chat
        for (let chat of fetchedChats) {
          const otherUserId = chat.buyer_id === user.$id ? chat.seller_id : chat.buyer_id;
          const profileRes = await databases.listDocuments(DATABASE_ID, PROFILES_ID, [
            Query.equal('user_id', otherUserId)
          ]);
          if (profileRes.documents.length > 0) {
            if (chat.buyer_id === user.$id) {
              chat.seller = mapDoc<Profile>(profileRes.documents[0]);
            } else {
              chat.buyer = mapDoc<Profile>(profileRes.documents[0]);
            }
          }
        }

        setChats(fetchedChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
      setLoading(false);
    };

    fetchChats();
  }, [user, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingTop: 'var(--navbar-height)' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pesan</h1>
        </div>

        {chats.length === 0 ? (
          <div className={styles.emptyState}>
            <MessageSquare className={styles.emptyStateIcon} />
            <p>Belum ada pesan.</p>
          </div>
        ) : (
          <div className={styles.chatList}>
            {chats.map(chat => {
              const isBuyer = chat.buyer_id === user?.$id;
              const otherPerson = isBuyer ? chat.seller : chat.buyer;
              const name = otherPerson?.full_name || 'Pengguna';
              
              let timeStr = '';
              if (chat.last_message_time) {
                const date = new Date(chat.last_message_time);
                timeStr = date.toLocaleDateString() === new Date().toLocaleDateString() 
                  ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString();
              }

              return (
                <div 
                  key={chat.id} 
                  className={styles.chatItem}
                  onClick={() => router.push(`/pesan/${chat.id}`)}
                >
                  <div className={styles.chatAvatar}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.chatInfo}>
                    <div className={styles.chatHeader}>
                      <span className={styles.chatName}>{name}</span>
                      <span className={styles.chatTime}>{timeStr}</span>
                    </div>
                    <div className={styles.chatLastMessage}>
                      {chat.last_message || 'Mulai percakapan...'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
