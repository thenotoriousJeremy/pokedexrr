import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Library, BookOpen, Layers, Archive } from 'lucide-react';

function LocationManager({ statsTrigger, onUpdate, showToast }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [locationCards, setLocationCards] = useState([]);
  
  // Form states for creating a location
  const [name, setName] = useState('');
  const [type, setType] = useState('Binder');
  const [description, setDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [statsTrigger]);

  useEffect(() => {
    if (activeLocationId) {
      fetchLocationCards(activeLocationId);
    } else {
      setLocationCards([]);
    }
  }, [activeLocationId, statsTrigger]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
        if (data.length > 0 && !activeLocationId) {
          // Auto select first location
          setActiveLocationId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading physical storage locations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationCards = async (locId) => {
    try {
      const response = await fetch('/api/collection');
      if (response.ok) {
        const allCards = await response.json();
        // Filter by selected location id
        const filtered = allCards.filter(c => c.location_id === locId);
        
        // Sort cards depending on type
        const loc = locations.find(l => l.id === locId);
        if (loc && loc.type === 'Binder') {
          // Sort by Page and Slot numerically
          filtered.sort((a, b) => {
            const pageA = parseInt((a.sub_location_1 || '').replace(/\D/g, ''), 10) || 0;
            const pageB = parseInt((b.sub_location_1 || '').replace(/\D/g, ''), 10) || 0;
            if (pageA !== pageB) return pageA - pageB;
            
            const slotA = parseInt((a.sub_location_2 || '').replace(/\D/g, ''), 10) || 0;
            const slotB = parseInt((b.sub_location_2 || '').replace(/\D/g, ''), 10) || 0;
            return slotA - slotB;
          });
        } else {
          // Sort by Row (sub1) and Category (sub2)
          filtered.sort((a, b) => {
            const rowA = a.sub_location_1 || '';
            const rowB = b.sub_location_1 || '';
            const compareRows = rowA.localeCompare(rowB, undefined, { numeric: true });
            if (compareRows !== 0) return compareRows;
            
            const secA = a.sub_location_2 || '';
            const secB = b.sub_location_2 || '';
            return secA.localeCompare(secB);
          });
        }
        
        setLocationCards(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    if (!name) return;

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, description })
      });

      if (response.ok) {
        const data = await response.json();
        showToast('Storage container created successfully!');
        setName('');
        setDescription('');
        setIsAdding(false);
        onUpdate();
        setActiveLocationId(data.id);
      } else {
        showToast('Failed to create storage container.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to backend.');
    }
  };

  const handleDeleteLocation = async (locId, locName) => {
    if (!window.confirm(`Are you sure you want to delete "${locName}"? Any cards stored inside will be marked as "Unassigned" and not deleted.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${locId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast(`Deleted storage container "${locName}".`);
        onUpdate();
        if (activeLocationId === locId) {
          setActiveLocationId(locations.length > 1 ? locations.find(l => l.id !== locId).id : null);
        }
      } else {
        showToast('Failed to delete container.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting container.');
    }
  };

  const selectedLoc = locations.find(l => l.id === activeLocationId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
      {/* Location Manager Title Panel */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={22} style={{ color: 'var(--accent-red)' }} />
            Physical Card Storage Coordinator
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Track and search exactly where your physical cards reside in your real-world binders, boxes, and folders.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus size={16} />
          {isAdding ? 'Close Form' : 'New Storage Container'}
        </button>
      </div>

      {/* Add New Container Form */}
      {isAdding && (
        <div className="glass-panel" style={{ borderLeft: '3px solid var(--accent-red)' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>Create Storage Container</h3>
          <form onSubmit={handleCreateLocation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Container Name</label>
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="e.g. Master Binder, Neo Era Box, Bulk Row A" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Container Type</label>
                <select className="select-control" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Binder">Binder</option>
                  <option value="Box">Storage Box</option>
                  <option value="Other">Other / Shelf</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description / Notes</label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="e.g. Blue Ultra Pro 9-Pocket Binder for Scarlet & Violet era cards." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.5rem' }}>
              Create Container
            </button>
          </form>
        </div>
      )}

      {/* Main Containers Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Left Side: Container Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {locations.map((loc) => {
            const isActive = loc.id === activeLocationId;
            return (
              <div 
                key={loc.id} 
                className="glass-panel"
                onClick={() => setActiveLocationId(loc.id)}
                style={{ 
                  flexShrink: 0, 
                  width: '180px', 
                  padding: '1rem', 
                  cursor: 'pointer',
                  border: isActive ? '1.5px solid var(--accent-red)' : '1px solid var(--border-glass)',
                  background: isActive ? 'rgba(255, 71, 71, 0.05)' : 'var(--bg-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {loc.type}
                    </span>
                    {loc.name !== 'Unsorted Pile' && (
                      <button 
                        className="btn btn-danger btn-icon-only" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLocation(loc.id, loc.name);
                        }}
                        style={{ padding: '2px', border: 'none', background: 'transparent' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '0.95rem', marginTop: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.name}</h4>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.description || 'No description'}</p>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-yellow)', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem' }}>
                  {loc.total_cards || 0} Card(s) stored
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Container Contents */}
        {selectedLoc && (
          <div className="glass-panel" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedLoc.type === 'Binder' ? <BookOpen size={18} /> : selectedLoc.type === 'Box' ? <Archive size={18} /> : <Layers size={18} />}
                  {selectedLoc.name} Contents
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Sorted by physical coordinate slots</p>
              </div>
              <div style={{ textalign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL CONTAINER VALUE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-yellow)' }}>
                  ${locationCards.reduce((acc, curr) => acc + (curr.quantity * (curr.price_trend || 0)), 0).toFixed(2)}
                </div>
              </div>
            </div>

            {locationCards.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                <p>This container is currently empty. Go to Search or Scanner to add cards to this location!</p>
              </div>
            ) : (
              <div className="collection-table-wrapper">
                <table className="collection-table">
                  <thead>
                    <tr>
                      <th>Physical Location</th>
                      <th>Card Details</th>
                      <th>Condition / Printing</th>
                      <th>Quantity</th>
                      <th>Price / Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationCards.map((card) => (
                      <tr key={card.entry_id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>
                          {selectedLoc.type === 'Binder' ? (
                            <span>{card.sub_location_1 || 'Unassigned Page'} • {card.sub_location_2 || 'Unassigned Slot'}</span>
                          ) : (
                            <span>{card.sub_location_1 || 'Unassigned Row'} • {card.sub_location_2 || 'Unassigned Divider'}</span>
                          )}
                        </td>
                        <td>
                          <div className="collection-card-row-info">
                            <img src={card.image_url} alt={card.name} className="collection-row-thumbnail" />
                            <div>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{card.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {card.set_name} • #{card.number} ({card.rarity})
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem', color: '#fff' }}>{card.condition}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{card.printing} • {card.language}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>x{card.quantity}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--accent-yellow)' }}>${(card.price_trend || 0).toFixed(2)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Spent: ${((card.purchase_price || 0) * card.quantity).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationManager;
