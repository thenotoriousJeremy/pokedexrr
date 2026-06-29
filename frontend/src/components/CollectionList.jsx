import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Edit2, X, MapPin } from 'lucide-react';

function CollectionList({ statsTrigger, onUpdate, showToast }) {
  const [collection, setCollection] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchFilter, setSearchFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  
  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editCondition, setEditCondition] = useState('Near Mint');
  const [editPrinting, setEditPrinting] = useState('Normal');
  const [editLanguage, setEditLanguage] = useState('English');
  const [editPurchasePrice, setEditPurchasePrice] = useState(0);
  const [editLocationId, setEditLocationId] = useState('');
  const [editSubLocation1, setEditSubLocation1] = useState('');
  const [editSubLocation2, setEditSubLocation2] = useState('');

  useEffect(() => {
    fetchCollection();
    fetchLocations();
  }, [statsTrigger]);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/collection');
      if (response.ok) {
        const data = await response.json();
        setCollection(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading collection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const handleDelete = async (entryId, cardName) => {
    if (!window.confirm(`Are you sure you want to delete ${cardName} from your collection?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/collection/${entryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast(`${cardName} removed from collection.`);
        onUpdate();
      } else {
        showToast('Failed to delete card.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to backend.');
    }
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditCondition(item.condition);
    setEditPrinting(item.printing);
    setEditLanguage(item.language);
    setEditPurchasePrice(item.purchase_price || 0);
    setEditLocationId(item.location_id || '');
    setEditSubLocation1(item.sub_location_1 || '');
    setEditSubLocation2(item.sub_location_2 || '');
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingItem(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const response = await fetch(`/api/collection/${editingItem.entry_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(editQuantity, 10),
          condition: editCondition,
          printing: editPrinting,
          language: editLanguage,
          purchase_price: parseFloat(editPurchasePrice) || 0,
          location_id: editLocationId ? parseInt(editLocationId, 10) : null,
          sub_location_1: editSubLocation1,
          sub_location_2: editSubLocation2
        })
      });

      if (response.ok) {
        showToast('Card entry updated.');
        onUpdate();
        closeEdit();
      } else {
        showToast('Failed to update card.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error editing card.');
    }
  };

  // Extract unique rarities from collection for filters
  const uniqueRarities = Array.from(new Set(collection.map(item => item.rarity).filter(Boolean)));

  // Filter logic
  const filteredCollection = collection.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          (item.set_name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
                          (item.number || '').includes(searchFilter);
    const matchesLocation = locationFilter === '' ? true : 
                            locationFilter === 'unassigned' ? !item.location_id : 
                            item.location_id == locationFilter;
    const matchesRarity = rarityFilter === '' ? true : item.rarity === rarityFilter;
    const matchesCondition = conditionFilter === '' ? true : item.condition === conditionFilter;

    return matchesSearch && matchesLocation && matchesRarity && matchesCondition;
  });

  const selectedLoc = locations.find(l => l.id == editLocationId);
  const isBinder = selectedLoc ? selectedLoc.type === 'Binder' : false;
  const isBox = selectedLoc ? selectedLoc.type === 'Box' : false;

  return (
    <div>
      {/* Title & Exports Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#fff' }}>My Pokémon Card Collection</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Browse, edit, and filter your physical and digital card list.</p>
        </div>
        
        {/* Export buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/api/export?format=csv" download className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <Download size={14} />
            Export CSV
          </a>
          <a href="/api/export?format=json" download className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <Download size={14} />
            Export JSON
          </a>
        </div>
      </div>

      {/* Filter Options Panel */}
      <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          
          {/* Text Search */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Search Cards</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                className="input-control" 
                placeholder="Search name, set, card number..." 
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Selector Filters Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Location</label>
              <select className="select-control" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                <option value="">All Locations</option>
                <option value="unassigned">Unassigned Pile</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Rarity</label>
              <select className="select-control" value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)}>
                <option value="">All Rarities</option>
                {uniqueRarities.map(rarity => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Condition</label>
              <select className="select-control" value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
                <option value="">All Conditions</option>
                <option value="Near Mint">Near Mint</option>
                <option value="Lightly Played">Lightly Played</option>
                <option value="Moderately Played">Moderately Played</option>
                <option value="Heavily Played">Heavily Played</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Database Listing Panel */}
      {loading ? (
        <div className="spinner"></div>
      ) : filteredCollection.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1.5rem' }}>
          <p>No cards matched your filters. Clear filters or add some cards!</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="collection-table-wrapper">
            <table className="collection-table">
              <thead>
                <tr>
                  <th>Card Name / Set</th>
                  <th>Real-World Location</th>
                  <th>Condition / Printing</th>
                  <th>Qty</th>
                  <th>Valuation (Each)</th>
                  <th>Total Spent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollection.map((item) => (
                  <tr key={item.entry_id}>
                    <td>
                      <div className="collection-card-row-info">
                        <img src={item.image_url} alt={item.name} className="collection-row-thumbnail" />
                        <div>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {item.set_name} • #{item.number} • {item.rarity}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.location_name ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} style={{ color: 'var(--accent-red)' }} />
                            {item.location_name}
                          </span>
                          {(item.sub_location_1 || item.sub_location_2) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1rem' }}>
                              {item.location_type === 'Binder' ? 'Page' : item.location_type === 'Box' ? 'Row' : ''} {item.sub_location_1 || '?'}{' '}
                              {item.sub_location_2 ? `• Slot/Section: ${item.sub_location_2}` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned Pile</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#fff' }}>{item.condition}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.printing} • {item.language}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>x{item.quantity}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--accent-yellow)' }}>${(item.price_trend || 0).toFixed(2)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Market Price</div>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>
                      ${((item.purchase_price || 0) * item.quantity).toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button className="btn btn-secondary btn-icon-only" onClick={() => openEdit(item)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-danger btn-icon-only" onClick={() => handleDelete(item.entry_id, item.name)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer Overlay for Editing Collection Item */}
      <div className={`drawer-backdrop ${isEditOpen ? 'open' : ''}`} onClick={closeEdit}></div>
      <div className={`quick-add-drawer ${isEditOpen ? 'open' : ''}`}>
        {editingItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.25rem' }}>Edit Collection Card</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{editingItem.name} ({editingItem.set_name} • #{editingItem.number})</p>
              </div>
              <button className="btn btn-secondary btn-icon-only" onClick={closeEdit} style={{ borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label>Quantity</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    min="1" 
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Purchase Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="input-control" 
                    value={editPurchasePrice}
                    onChange={(e) => setEditPurchasePrice(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Condition</label>
                  <select className="select-control" value={editCondition} onChange={(e) => setEditCondition(e.target.value)}>
                    <option value="Near Mint">Near Mint</option>
                    <option value="Lightly Played">Lightly Played</option>
                    <option value="Moderately Played">Moderately Played</option>
                    <option value="Heavily Played">Heavily Played</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Printing</label>
                  <select className="select-control" value={editPrinting} onChange={(e) => setEditPrinting(e.target.value)}>
                    <option value="Normal">Normal</option>
                    <option value="Holofoil">Holofoil</option>
                    <option value="Reverse Holofoil">Reverse Holofoil</option>
                    <option value="1st Edition">1st Edition</option>
                    <option value="Promo">Promo</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Language</label>
                  <select className="select-control" value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)}>
                    <option value="English">English</option>
                    <option value="Japanese">Japanese</option>
                    <option value="German">German</option>
                    <option value="French">French</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Italian">Italian</option>
                  </select>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1rem', marginTop: '0.5rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.2)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-World Location Assignment</h4>
                
                <div className="form-group">
                  <label>Storage Container</label>
                  <select className="select-control" value={editLocationId} onChange={(e) => setEditLocationId(e.target.value)}>
                    <option value="">Unassigned Pile</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name} ({loc.type})</option>
                    ))}
                  </select>
                </div>

                {editLocationId && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>{isBinder ? 'Page Number' : isBox ? 'Row Number / Letter' : 'Sub-Location 1'}</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        placeholder={isBinder ? 'e.g. Page 12' : isBox ? 'e.g. Row 2' : 'e.g. Top shelf'} 
                        value={editSubLocation1}
                        onChange={(e) => setEditSubLocation1(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>{isBinder ? 'Slot Number (1-9)' : isBox ? 'Divider / Section' : 'Sub-Location 2'}</label>
                      <input 
                        type="text" 
                        className="input-control" 
                        placeholder={isBinder ? 'e.g. Slot 4' : isBox ? 'e.g. Behind Grass Divider' : 'e.g. Box A'} 
                        value={editSubLocation2}
                        onChange={(e) => setEditSubLocation2(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeEdit} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save Changes</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionList;
