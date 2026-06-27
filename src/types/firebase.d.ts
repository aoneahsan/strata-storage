// Type definitions for optional Firebase imports

// Firebase App types
export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  databaseURL?: string;
}

export interface FirebaseApp {
  name: string;
  options: FirebaseConfig;
  automaticDataCollectionEnabled: boolean;
}

// Firestore types
export interface Firestore {
  type: 'firestore';
  _delegate?: unknown;
}

export interface DocumentReference {
  id: string;
  path: string;
  parent: CollectionReference;
}

export interface CollectionReference {
  id: string;
  path: string;
  parent: DocumentReference | null;
}

export interface DocumentSnapshot {
  id: string;
  exists(): boolean;
  data(): Record<string, unknown> | undefined;
  get(fieldPath: string): unknown;
}

export interface QuerySnapshot {
  size: number;
  empty: boolean;
  docs: DocumentSnapshot[];
}

// Realtime Database types
export interface Database {
  type: 'database';
  _delegate?: unknown;
}

export interface DatabaseReference {
  key: string | null;
  parent: DatabaseReference | null;
  root: DatabaseReference;
  toString(): string;
}

export interface DataSnapshot {
  key: string | null;
  exists(): boolean;
  val(): unknown;
  child(path: string): DataSnapshot;
  forEach(action: (child: DataSnapshot) => boolean | void): boolean;
}

declare module 'firebase/app' {
  export function initializeApp(config: FirebaseConfig): FirebaseApp;
  export function getApps(): FirebaseApp[];
}

declare module 'firebase/firestore' {
  export function getFirestore(): Firestore;
  export function collection(db: Firestore, path: string): CollectionReference;
  export function doc(db: Firestore, path: string, id: string): DocumentReference;
  export function setDoc(ref: DocumentReference, data: Record<string, unknown>): Promise<void>;
  export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function onSnapshot(
    ref: DocumentReference | CollectionReference,
    callback: (snapshot: DocumentSnapshot | QuerySnapshot) => void,
  ): () => void;
}

declare module 'firebase/database' {
  export function getDatabase(): Database;
  export function ref(db: Database, path: string): DatabaseReference;
  export function set(ref: DatabaseReference, value: unknown): Promise<void>;
  export function get(ref: DatabaseReference): Promise<DataSnapshot>;
  export function remove(ref: DatabaseReference): Promise<void>;
  export function onValue(
    ref: DatabaseReference,
    callback: (snapshot: DataSnapshot) => void,
  ): () => void;
}
