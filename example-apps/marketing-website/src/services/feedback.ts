import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import analytics from '@/services/analytics';

export interface Feedback {
  id?: string;
  type: 'issue' | 'feedback' | 'review' | 'feature';
  title: string;
  description: string;
  rating?: number;
  userId: string;
  userEmail: string;
  createdAt: Date;
}

const COLLECTION = 'ss_feedback';

export async function submitFeedback(data: Omit<Feedback, 'id' | 'createdAt'>) {
  const startTime = performance.now();
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: serverTimestamp(),
    });
    const duration = Math.round(performance.now() - startTime);
    analytics.apiCall('feedback/submit', 'POST', true, duration);
    analytics.track('feedback_submitted', { type: data.type, has_rating: !!data.rating });
    return docRef.id;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    analytics.apiCall('feedback/submit', 'POST', false, duration);
    analytics.error('feedback_submit_error', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function getUserFeedback(userId: string): Promise<Feedback[]> {
  const startTime = performance.now();
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const duration = Math.round(performance.now() - startTime);
    analytics.apiCall('feedback/user', 'GET', true, duration);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Feedback[];
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    analytics.apiCall('feedback/user', 'GET', false, duration);
    throw error;
  }
}

export async function getPublicReviews(): Promise<Feedback[]> {
  const startTime = performance.now();
  try {
    const q = query(
      collection(db, COLLECTION),
      where('type', '==', 'review'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const duration = Math.round(performance.now() - startTime);
    analytics.apiCall('feedback/reviews', 'GET', true, duration);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Feedback[];
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    analytics.apiCall('feedback/reviews', 'GET', false, duration);
    throw error;
  }
}
