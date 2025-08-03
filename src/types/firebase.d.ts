// Type definitions for optional Firebase imports
declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
}

declare module 'firebase/firestore' {
  export function getFirestore(): any;
  export function collection(db: any, path: string): any;
  export function doc(db: any, path: string, id: string): any;
  export function setDoc(ref: any, data: any): Promise<void>;
  export function getDoc(ref: any): Promise<any>;
  export function deleteDoc(ref: any): Promise<void>;
  export function onSnapshot(ref: any, callback: (snapshot: any) => void): () => void;
}

declare module 'firebase/database' {
  export function getDatabase(): any;
  export function ref(db: any, path: string): any;
  export function set(ref: any, value: any): Promise<void>;
  export function get(ref: any): Promise<any>;
  export function remove(ref: any): Promise<void>;
  export function onValue(ref: any, callback: (snapshot: any) => void): () => void;
}
