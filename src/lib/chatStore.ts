import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp, writeBatch, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage, Conversation } from '../shared/types';
import { handleFirestoreError } from './firebase'; // Optional if you need custom error handling, but we can just use try-catch

export const saveMessageToFirestore = async (conversationId: string, userId: string, message: ChatMessage) => {
  try {
    const msgRef = doc(collection(db, 'messages'));
    await setDoc(msgRef, {
      id: msgRef.id,
      conversationId,
      userId,
      role: message.role,
      content: message.content,
      sources: message.sources || null,
      isClarification: message.isClarification || false,
      clarificationOptions: message.clarificationOptions || null,
      createdAt: serverTimestamp()
    });
    
    // Update conversation updatedAt
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      updatedAt: serverTimestamp()
    });
    
    return msgRef.id;
  } catch (error) {
    console.error("Error saving message", error);
    throw error;
  }
};

export const MAX_CONVERSATIONS = 15;

export const enforceMaxConversations = async (userId: string, maxCount: number = MAX_CONVERSATIONS) => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.docs.length > maxCount) {
      const excessDocs = snapshot.docs.slice(maxCount);
      for (const convDoc of excessDocs) {
        await deleteConversationInFirestore(userId, convDoc.id);
      }
      console.log(`[ChatStore] Pruned ${excessDocs.length} conversation(s) to maintain max limit of ${maxCount}`);
    }
  } catch (error) {
    console.error("[ChatStore] Error enforcing max conversations:", error);
  }
};

export const createConversationInFirestore = async (userId: string, firstMessageContent: string, conversationId?: string): Promise<string> => {
  try {
    const title = firstMessageContent.length > 40 ? firstMessageContent.substring(0, 40) + '...' : firstMessageContent;
    
    let convRef;
    if (conversationId) {
      convRef = doc(db, 'conversations', conversationId);
    } else {
      convRef = doc(collection(db, 'conversations'));
    }
    
    await setDoc(convRef, {
      id: convRef.id,
      userId,
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Enforce maximum 15 conversations: delete oldest beyond 15
    enforceMaxConversations(userId, MAX_CONVERSATIONS).catch(console.error);

    return convRef.id;
  } catch (error) {
    console.error("Error creating conversation", error);
    throw error;
  }
};

export const renameConversationInFirestore = async (conversationId: string, newTitle: string) => {
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, { 
      title: newTitle,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error renaming conversation", error);
    throw error;
  }
};

export const deleteConversationInFirestore = async (userId: string, conversationId: string) => {
  try {
    // 1. Delete conversation document first so it disappears immediately from Firestore listeners
    const convRef = doc(db, 'conversations', conversationId);
    await deleteDoc(convRef).catch((err) => {
      console.warn("[chatStore] deleteDoc on conversation document failed:", err);
    });

    // 2. Query and delete all associated messages
    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        where('userId', '==', userId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      if (!messagesSnapshot.empty) {
        let batch = writeBatch(db);
        let count = 0;
        for (const docSnapshot of messagesSnapshot.docs) {
          batch.delete(docSnapshot.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }
    } catch (msgErr) {
      console.warn("[chatStore] Error deleting associated messages:", msgErr);
    }
  } catch (error) {
    console.error("[chatStore] Error deleting conversation", error);
    throw error;
  }
};

export const deleteConversationsInFirestore = async (userId: string, conversationIds: string[]) => {
  try {
    for (const convId of conversationIds) {
      await deleteConversationInFirestore(userId, convId).catch((err) => {
        console.warn(`[chatStore] Error deleting conversation ${convId}:`, err);
      });
    }
  } catch (error) {
    console.error("[chatStore] Error deleting multiple conversations", error);
    throw error;
  }
};

export const subscribeToConversations = (userId: string, callback: (conversations: any[]) => void) => {
  const q = query(
    collection(db, 'conversations'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.docs.length > MAX_CONVERSATIONS) {
      enforceMaxConversations(userId, MAX_CONVERSATIONS).catch(console.error);
    }
    const convs = snapshot.docs.slice(0, MAX_CONVERSATIONS).map(doc => ({
      ...doc.data(),
      id: doc.id,
      createdAt: doc.data().createdAt?.toMillis() || Date.now(),
      updatedAt: doc.data().updatedAt?.toMillis() || Date.now(),
      messages: [] // Messages will be loaded on demand
    }));
    callback(convs);
  });
};

export const subscribeToMessages = (userId: string, conversationId: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    where('userId', '==', userId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      let createdTime: number = Date.now();
      if (data.createdAt) {
        if (typeof data.createdAt.toMillis === 'function') {
          createdTime = data.createdAt.toMillis();
        } else if (typeof data.createdAt.toDate === 'function') {
          createdTime = data.createdAt.toDate().getTime();
        } else if (typeof data.createdAt === 'object' && typeof data.createdAt.seconds === 'number') {
          createdTime = data.createdAt.seconds * 1000;
        } else if (typeof data.createdAt === 'number') {
          createdTime = data.createdAt;
        } else if (typeof data.createdAt === 'string') {
          const parsed = Date.parse(data.createdAt);
          if (!isNaN(parsed)) createdTime = parsed;
        }
      }
      return {
        ...data,
        createdAt: createdTime
      } as ChatMessage;
    });
    callback(messages);
  });
};
