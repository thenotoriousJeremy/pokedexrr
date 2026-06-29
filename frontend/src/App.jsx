import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Camera, Search, Database, MapPin, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CameraScanner from './components/CameraScanner';
import CardSearch from './components/CardSearch';
import CollectionList from './components/CollectionList';
import LocationManager from './components/LocationManager';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [statsTrigger, setStatsTrigger] = useState(0); // Used to trigger stats re-fetch when updates occur

  const showToast = (message) => {
    setToast(message);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const triggerRefresh = () => {
    setStatsTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard statsTrigger={statsTrigger} />;
      case 'scanner':
        return <CameraScanner onAddSuccess={triggerRefresh} showToast={showToast} />;
      case 'search':
        return <CardSearch onAddSuccess={triggerRefresh} showToast={showToast} />;
      case 'collection':
        return <CollectionList statsTrigger={statsTrigger} onUpdate={triggerRefresh} showToast={showToast} />;
      case 'locations':
        return <LocationManager statsTrigger={statsTrigger} onUpdate={triggerRefresh} showToast={showToast} />;
      default:
        return <Dashboard statsTrigger={statsTrigger} />;
    }
  };

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon"></div>
          <h1 className="logo-text">Poke<span>Keep</span></h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <Sparkles size={14} style={{ color: 'var(--accent-yellow)' }} />
          <span>Self-Hosted Poké Tracker</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard />
          <span>Dashboard</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera />
          <span>Scan Cards</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search />
          <span>Search & Add</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'collection' ? 'active' : ''}`}
          onClick={() => setActiveTab('collection')}
        >
          <Database />
          <span>My Collection</span>
        </button>
        <button 
          className={`nav-tab ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          <MapPin />
          <span>Locations</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {renderContent()}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
