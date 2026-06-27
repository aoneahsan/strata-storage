import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useStorageInit } from './hooks/useStorage';
import HomePage from './pages/HomePage';
import BasicStoragePage from './pages/BasicStoragePage';
import AdvancedFeaturesPage from './pages/AdvancedFeaturesPage';
import QueryPage from './pages/QueryPage';
import SyncPage from './pages/SyncPage';
import PersistencePage from './pages/PersistencePage';
import WhatsNewPage from './pages/WhatsNewPage';
import './styles/app.css';

function App() {
  const { isReady, error } = useStorageInit();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  if (error) {
    return (
      <div className="error-screen">
        <h1>Storage Error</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Initializing Strata Storage...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Strata Storage Demo</h1>
        <p className="tagline">Universal storage for Web, Android & iOS</p>
      </header>

      <nav className="nav">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Home
        </NavLink>
        <NavLink to="/whats-new" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          What&apos;s New
        </NavLink>
        <NavLink to="/basic" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Basic
        </NavLink>
        <NavLink to="/advanced" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Advanced
        </NavLink>
        <NavLink to="/query" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Query
        </NavLink>
        <NavLink to="/sync" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Sync
        </NavLink>
        <NavLink to="/persistence" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Persistence
        </NavLink>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/whats-new" element={<WhatsNewPage />} />
          <Route path="/basic" element={<BasicStoragePage />} />
          <Route path="/advanced" element={<AdvancedFeaturesPage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/sync" element={<SyncPage />} />
          <Route path="/persistence" element={<PersistencePage />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>strata-storage v2.8.0 | Zero Dependencies | MIT</p>
      </footer>
    </div>
  );
}

export default App;
