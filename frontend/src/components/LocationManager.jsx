import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, X, Sparkles } from 'lucide-react';
import { sortCardsByOrder } from '../utils/cardSort';
import { getPrintingBadgeLabel, getPrintingBadgeStyle, getFoilOverlayClass } from '../utils/cardPrinting';
import { getCardRarityBorder } from '../utils/cardRarity';

const CONTAINER_TYPES = ['Binder', 'Toploader Binder', 'Box', 'Toploader Box', 'Graded Slab Box', 'Display Shelf / Stand', 'Deck Box', 'Tin / Case', 'Other'];

// Base sort schemes a container can use. 'set-number' has a foil-aware
// sub-option (stored as the separate 'set-number-printing' scheme
// server-side) rather than existing as its own top-level entry — from the
// user's perspective it's one scheme with a toggle, not two schemes.
const SORT_BASES = [
  { value: 'custom', label: 'Custom (manual order, next empty slot)' },
  { value: 'name-asc', label: 'A-Z Alphabetical' },
  { value: 'set-number', label: 'Set & Number' },
  { value: 'price-desc', label: 'Value (High-Low)' },
  { value: 'type-name', label: 'Energy Type' }
];

// Given a stored sort_order value, splits it into the base scheme shown in
// the main dropdown plus whether the foil-aware sub-option is active.
function splitSortOrder(sortOrder) {
  if (sortOrder === 'set-number-printing') return { base: 'set-number', foilAware: true };
  return { base: sortOrder || 'custom', foilAware: false };
}

// A binder page's pocket grid is square-ish (3x3 for the default capacity-9
// page) rather than however many columns happen to fit the viewport.
function pocketColumns(capacity) {
  return Math.max(1, Math.round(Math.sqrt(capacity || 1)));
}

function PrintingBadge({ printing }) {
  const label = getPrintingBadgeLabel(printing);
  if (!label) return null;
  return (
    <span style={{
      position: 'absolute', top: '4px', right: '4px',
      fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.05em',
      padding: '1px 5px', borderRadius: '3px', zIndex: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,0.5)', textTransform: 'uppercase',
      ...getPrintingBadgeStyle(printing)
    }}>{label}</span>
  );
}

// A card is just a compartment (a binder page, a box row, a deck box's whole
// interior) — real capacity/label/set-assignment lives on the compartment
// itself, not inferred from location.type. One renderer covers every
// container type instead of separate Box/Binder/CoverFlow implementations.
function CompartmentCard({ compartment, cards, sortOrder, availableSets, onRename, onSetCapacity, onToggleSet, onRemove, onDeleteCard, onMoveCard, moveTargets, canRemove }) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(compartment.display_label);
  const [showSets, setShowSets] = useState(false);
  const isCustom = sortOrder === 'custom';

  return (
    <div className="glass-panel" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {editingLabel ? (
          <input
            autoFocus
            className="input-control"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => { setEditingLabel(false); onRename(labelDraft); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingLabel(false); onRename(labelDraft); } if (e.key === 'Escape') setEditingLabel(false); }}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', width: '140px' }}
          />
        ) : (
          <strong onDoubleClick={() => { setLabelDraft(compartment.display_label); setEditingLabel(true); }} title="Double-click to rename" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            {compartment.display_label}
          </strong>
        )}
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{compartment.count} / {compartment.capacity}</span>
        <button type="button" className="btn btn-secondary" onClick={() => setShowSets(s => !s)} style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>
          {compartment.assignedSets.length === 0 ? 'Any set' : compartment.assignedSets.length === 1 ? compartment.assignedSets[0] : `${compartment.assignedSets.length} sets`}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Capacity
          <input
            type="number" min="1" className="input-control" defaultValue={compartment.capacity}
            onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v > 0 && v !== compartment.capacity) onSetCapacity(v); }}
            style={{ width: '60px', padding: '0.15rem 0.3rem', fontSize: '0.7rem' }}
          />
        </label>
        {canRemove && (
          <button type="button" className="btn btn-danger btn-icon-only" onClick={onRemove} title="Remove this compartment (must be empty)" style={{ width: '26px', height: '26px', padding: 0, marginLeft: 'auto' }}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {showSets && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <select
            className="select-control"
            value=""
            onChange={(e) => { if (e.target.value) onToggleSet(e.target.value); }}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
          >
            <option value="">Choose set to toggle...</option>
            {availableSets.map(setName => (
              <option key={setName} value={setName}>
                {compartment.assignedSets.includes(setName) ? `✓ ${setName}` : setName}
              </option>
            ))}
          </select>
          {compartment.assignedSets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {compartment.assignedSets.map(setName => (
                <span key={setName} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', padding: '0.15rem 0.35rem', background: 'var(--accent-red)', borderRadius: '3px' }}>
                  {setName}
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => onToggleSet(setName)}>&times;</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>Empty</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {cards.map(card => (
            <div key={card.entry_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border-glass)' }}>
              <div style={{ position: 'relative', width: '32px', flexShrink: 0, overflow: 'hidden', borderRadius: '3px', ...getCardRarityBorder(card.rarity) }}>
                <img src={card.image_url} alt={card.name} style={{ width: '100%', aspectRatio: 0.718, objectFit: 'cover', display: 'block' }} />
                {getFoilOverlayClass(card.printing) && (
                  <div className={getFoilOverlayClass(card.printing)} style={{ borderRadius: '3px' }} />
                )}
                <PrintingBadge printing={card.printing} />
              </div>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.name} {card.quantity > 1 ? `x${card.quantity}` : ''}
              </span>
              {isCustom && moveTargets.length > 1 && (
                <select
                  className="select-control"
                  value=""
                  onChange={(e) => { if (e.target.value) onMoveCard(card.entry_id, parseInt(e.target.value, 10)); }}
                  style={{ fontSize: '0.65rem', padding: '0.15rem 0.3rem', maxWidth: '110px' }}
                >
                  <option value="">Move to...</option>
                  {moveTargets.filter(t => t.id !== compartment.id).map(t => (
                    <option key={t.id} value={t.id}>{t.display_label}</option>
                  ))}
                </select>
              )}
              <button type="button" onClick={() => onDeleteCard(card.entry_id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }} title="Remove from collection">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// One binder page: a fixed pocket grid (capacity slots, empty ones shown as
// dashed placeholders) instead of CompartmentCard's variable-length row list.
function BinderPageContent({ compartment, cards, sortOrder, availableSets, onRename, onSetCapacity, onToggleSet, onRemove, onDeleteCard, onMoveCard, moveTargets, canRemove, recommendedSpot }) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(compartment.display_label);
  const [showSets, setShowSets] = useState(false);
  const isCustom = sortOrder === 'custom';
  const cols = pocketColumns(compartment.capacity);
  const slotCount = Math.max(compartment.capacity, cards.length);
  const pockets = Array.from({ length: slotCount }, (_, i) => cards[i] || null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {editingLabel ? (
          <input
            autoFocus
            className="input-control"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => { setEditingLabel(false); onRename(labelDraft); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingLabel(false); onRename(labelDraft); } if (e.key === 'Escape') setEditingLabel(false); }}
            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', width: '110px' }}
          />
        ) : (
          <strong onDoubleClick={() => { setLabelDraft(compartment.display_label); setEditingLabel(true); }} title="Double-click to rename" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
            {compartment.display_label}
          </strong>
        )}
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{compartment.count}/{compartment.capacity}</span>
        <button type="button" className="btn btn-secondary" onClick={() => setShowSets(s => !s)} style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem' }}>
          {compartment.assignedSets.length === 0 ? 'Any set' : compartment.assignedSets.length === 1 ? compartment.assignedSets[0] : `${compartment.assignedSets.length} sets`}
        </button>
        <input
          type="number" min="1" className="input-control" defaultValue={compartment.capacity}
          onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v > 0 && v !== compartment.capacity) onSetCapacity(v); }}
          title="Pockets on this page"
          style={{ width: '46px', padding: '0.1rem 0.25rem', fontSize: '0.65rem' }}
        />
        {canRemove && (
          <button type="button" className="btn btn-danger btn-icon-only" onClick={onRemove} title="Remove this page (must be empty)" style={{ width: '22px', height: '22px', padding: 0, marginLeft: 'auto' }}>
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {showSets && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
          <select
            className="select-control"
            value=""
            onChange={(e) => { if (e.target.value) onToggleSet(e.target.value); }}
            style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}
          >
            <option value="">Choose set to toggle...</option>
            {availableSets.map(setName => (
              <option key={setName} value={setName}>
                {compartment.assignedSets.includes(setName) ? `✓ ${setName}` : setName}
              </option>
            ))}
          </select>
          {compartment.assignedSets.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {compartment.assignedSets.map(setName => (
                <span key={setName} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', background: 'var(--accent-red)', borderRadius: '3px' }}>
                  {setName}
                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => onToggleSet(setName)}>&times;</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="binder-pocket-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {pockets.map((card, i) => {
          const isRecSpot = recommendedSpot && recommendedSpot.index === i;
          return card ? (
            <div
              key={card.entry_id}
              className={`binder-pocket ${isRecSpot ? 'recommended-highlight' : ''}`}
              style={{
                ...getCardRarityBorder(card.rarity),
                ...(isRecSpot ? { outline: '3px solid #ffc107', outlineOffset: '2px', boxShadow: '0 0 10px #ffc107' } : {})
              }}
            >
              <img src={card.image_url} alt={card.name} title={`${card.name}${card.quantity > 1 ? ` x${card.quantity}` : ''}`} />
              {getFoilOverlayClass(card.printing) && (
                <div className={getFoilOverlayClass(card.printing)} style={{ borderRadius: '4px' }} />
              )}
              <PrintingBadge printing={card.printing} />
              {isRecSpot && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#ffc107', color: '#000', fontSize: '0.5rem', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px', zIndex: 10 }}>REC SPOT</div>
              )}
              <div className="binder-pocket-actions">
                {isCustom && moveTargets.length > 1 && (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) onMoveCard(card.entry_id, parseInt(e.target.value, 10)); }}
                  >
                    <option value="">Move...</option>
                    {moveTargets.filter(t => t.id !== compartment.id).map(t => (
                      <option key={t.id} value={t.id}>{t.display_label}</option>
                    ))}
                  </select>
                )}
                <button type="button" onClick={() => onDeleteCard(card.entry_id)} title="Remove from collection">
                  <X size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className={`binder-pocket-empty ${isRecSpot ? 'recommended-highlight' : ''}`}
              style={isRecSpot ? { border: '2px dashed #ffc107', background: 'rgba(255, 193, 7, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffc107', fontSize: '0.6rem', fontWeight: 'bold' } : {}}
            >
              {isRecSpot ? 'REC SPOT' : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LocationManager({ statsTrigger, onUpdate, showToast, selectedLocationId, setSelectedLocationId, setSelectedCardFilter, setActiveTab }) {
  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [compartments, setCompartments] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewestRecommendation, setShowNewestRecommendation] = useState(false);
  const [newestRecommendation, setNewestRecommendation] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Binder');

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [showAutoAssignInfo, setShowAutoAssignInfo] = useState(false);

  const [unsortedSearch, setUnsortedSearch] = useState('');
  const [unsortedSort, setUnsortedSort] = useState('scanned-desc');
  const [applyAllTarget, setApplyAllTarget] = useState('');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [filingMode, setFilingMode] = useState(false);
  const [filingQueue, setFilingQueue] = useState([]);
  const [filingIndex, setFilingIndex] = useState(0);

  const newestScannedCard = useMemo(() => {
    const unsorted = allCards.filter(c => !c.location_id);
    if (unsorted.length === 0) return null;
    return [...unsorted].sort((a, b) => {
      const timeA = a.added_at ? new Date(a.added_at).getTime() : 0;
      const timeB = b.added_at ? new Date(b.added_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.entry_id - a.entry_id;
    })[0];
  }, [allCards]);

  useEffect(() => {
    let active = true;
    if (!showNewestRecommendation || !activeLocationId || !newestScannedCard) {
      setNewestRecommendation(null);
      return;
    }
    const fetchRec = async () => {
      try {
        const res = await fetch(`/api/locations/${activeLocationId}/recommend?card_id=${newestScannedCard.card_id}&printing=${newestScannedCard.printing}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setNewestRecommendation(data);
        }
      } catch (err) {
        console.error('Failed to fetch recommendation', err);
      }
    };
    fetchRec();
    return () => { active = false; };
  }, [showNewestRecommendation, activeLocationId, newestScannedCard]);

  const currentRecSpot = filingMode && filingQueue[filingIndex]?.recommended
    ? filingQueue[filingIndex].recommended
    : (newestRecommendation && newestScannedCard ? newestRecommendation : null);

  useEffect(() => {
    if (filingMode && filingQueue[filingIndex]?.recommended) {
      const rec = filingQueue[filingIndex].recommended;
      if (isBinderType) {
        const compIdx = compartments.findIndex(c => c.id === rec.compartment_id);
        if (compIdx !== -1) setActivePageIndex(compIdx);
      } else {
        setActiveCompartmentId(rec.compartment_id);
        const posIdx = Math.floor(rec.position / 1000) - 1;
        setCoverflowActiveIndex(Math.max(0, posIdx));
      }
    }
  }, [filingMode, filingIndex, filingQueue, compartments, isBinderType]);
  const touchStartRef = useRef(0);

  const [activeCompartmentId, setActiveCompartmentId] = useState(null);
  const [coverflowActiveIndex, setCoverflowActiveIndex] = useState(0);
  const [editingRowLabel, setEditingRowLabel] = useState(false);
  const [rowLabelDraft, setRowLabelDraft] = useState('');
  const [showRowSets, setShowRowSets] = useState(false);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    const diffX = touchStartRef.current - endX;
    if (diffX > 50) {
      setActivePageIndex(prev => Math.min(compartments.length - 1, prev + 1));
    } else if (diffX < -50) {
      setActivePageIndex(prev => Math.max(0, prev - 1));
    }
  };

  const coverflowTouchStartRef = useRef(0);

  const handleCoverflowTouchStart = (e) => {
    coverflowTouchStartRef.current = e.changedTouches[0].clientX;
  };

  const handleCoverflowTouchEnd = (e, totalCards) => {
    const endX = e.changedTouches[0].clientX;
    const diffX = coverflowTouchStartRef.current - endX;
    const threshold = 40;
    if (diffX > threshold) {
      setCoverflowActiveIndex(prev => Math.min(totalCards - 1, prev + 1));
    } else if (diffX < -threshold) {
      setCoverflowActiveIndex(prev => Math.max(0, prev - 1));
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setActiveCompartmentId(null);
    setActivePageIndex(0);
    setCoverflowActiveIndex(0);
  }, [activeLocationId]);

  useEffect(() => {
    if (compartments.length > 0) {
      const exists = compartments.some(c => c.id === activeCompartmentId);
      if (!exists) {
        setActiveCompartmentId(compartments[0].id);
      }
    } else {
      setActiveCompartmentId(null);
    }
  }, [compartments, activeCompartmentId]);

  useEffect(() => {
    setCoverflowActiveIndex(0);
  }, [activeCompartmentId]);

  useEffect(() => {
    if (activePageIndex >= compartments.length && compartments.length > 0) {
      setActivePageIndex(compartments.length - 1);
    }
  }, [compartments.length, activePageIndex]);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      if (res.ok) setLocations(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchAllCards = async () => {
    try {
      const res = await fetch('/api/collection');
      if (res.ok) setAllCards(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchCompartments = async (locId) => {
    if (!locId) { setCompartments([]); return; }
    try {
      const res = await fetch(`/api/locations/${locId}/compartments`);
      if (res.ok) setCompartments(await res.json());
    } catch (err) { console.error(err); }
  };

  const refreshAll = async () => {
    await Promise.all([fetchLocations(), fetchAllCards()]);
    if (activeLocationId) await fetchCompartments(activeLocationId);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchLocations(), fetchAllCards()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsTrigger]);

  useEffect(() => {
    fetchCompartments(activeLocationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocationId, statsTrigger]);

  useEffect(() => {
    if (selectedLocationId) {
      if (selectedLocationId === 'unsorted') {
        setActiveLocationId(null);
      } else {
        setActiveLocationId(selectedLocationId);
      }
      setSelectedLocationId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  const selectedLoc = locations.find(l => l.id === activeLocationId);
  const isBinderType = selectedLoc?.type === 'Binder' || selectedLoc?.type === 'Toploader Binder';
  const unsortedCards = useMemo(() => {
    let cards = allCards.filter(c => !c.location_id && (
      c.name.toLowerCase().includes(unsortedSearch.toLowerCase()) ||
      (c.set_name || '').toLowerCase().includes(unsortedSearch.toLowerCase())
    ));
    return sortCardsByOrder([...cards], unsortedSort, selectedLoc?.foil_sorting);
  }, [allCards, unsortedSearch, unsortedSort, selectedLoc]);

  const availableSetNames = useMemo(() =>
    Array.from(new Set(allCards.map(c => c.set_name).filter(Boolean))).sort(),
  [allCards]);

  const cardsByCompartment = useMemo(() => {
    const map = new Map();
    allCards.forEach(c => {
      if (!c.compartment_id) return;
      if (!map.has(c.compartment_id)) map.set(c.compartment_id, []);
      map.get(c.compartment_id).push(c);
    });
    return map;
  }, [allCards]);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), type: newType })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Storage container created!');
        setNewName('');
        setShowCreate(false);
        await fetchLocations();
        setActiveLocationId(data.id);
        onUpdate();
      } else {
        showToast(data.error || 'Failed to create container.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating container.');
    }
  };

  const handleDeleteLocation = async (locId, name) => {
    if (!window.confirm(`Delete "${name}"? Stored cards will move to Unsorted.`)) return;
    try {
      const res = await fetch(`/api/locations/${locId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Deleted "${name}".`);
        if (activeLocationId === locId) setActiveLocationId(null);
        await refreshAll();
        onUpdate();
      } else {
        showToast('Failed to delete container.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting container.');
    }
  };

  const handleUpdateLocationField = async (field, value) => {
    if (!selectedLoc) return;
    try {
      const res = await fetch(`/api/locations/${selectedLoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        showToast('Container updated.');
        await fetchLocations();
      } else {
        showToast('Failed to update container.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating container.');
    }
  };

  const handleAddCompartment = async () => {
    if (!selectedLoc) return;
    try {
      const res = await fetch(`/api/locations/${selectedLoc.id}/compartments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) { showToast('Compartment added.'); await Promise.all([fetchCompartments(selectedLoc.id), fetchLocations()]); }
      else showToast('Failed to add compartment.');
    } catch (err) { console.error(err); showToast('Error adding compartment.'); }
  };

  const handleRemoveCompartment = async (compartmentId) => {
    if (!window.confirm('Remove this compartment?')) return;
    try {
      const res = await fetch(`/api/compartments/${compartmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { showToast('Compartment removed.'); await Promise.all([fetchCompartments(activeLocationId), fetchLocations()]); }
      else showToast(data.error || 'Failed to remove compartment.');
    } catch (err) { console.error(err); showToast('Error removing compartment.'); }
  };

  const handleRenameCompartment = async (compartmentId, label) => {
    try {
      await fetch(`/api/compartments/${compartmentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label }) });
      await fetchCompartments(activeLocationId);
    } catch (err) { console.error(err); showToast('Error renaming compartment.'); }
  };

  const handleSetCapacity = async (compartmentId, capacity) => {
    try {
      await fetch(`/api/compartments/${compartmentId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capacity }) });
      await fetchCompartments(activeLocationId);
    } catch (err) { console.error(err); showToast('Error resizing compartment.'); }
  };

  const handleToggleCompartmentSet = async (compartment, setName) => {
    const current = compartment.assignedSets || [];
    const next = current.includes(setName) ? current.filter(s => s !== setName) : [...current, setName];
    try {
      await fetch(`/api/compartments/${compartment.id}/sets`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sets: next }) });
      await fetchCompartments(activeLocationId);
    } catch (err) { console.error(err); showToast('Error updating set assignment.'); }
  };

  const handleAutoAssignSets = async () => {
    if (!selectedLoc) return;
    if (!window.confirm(`Auto-distribute your owned sets across "${selectedLoc.name}"'s compartments by size? This replaces current set assignments.`)) return;
    try {
      const res = await fetch(`/api/locations/${selectedLoc.id}/auto-assign-sets`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.skipped.length ? `Assigned sets. Didn't fit: ${data.skipped.join(', ')}` : 'Sets auto-assigned.');
        await fetchCompartments(selectedLoc.id);
      } else {
        showToast(data.error || 'Failed to auto-assign sets.');
      }
    } catch (err) { console.error(err); showToast('Error auto-assigning sets.'); }
  };

  const handleMoveCard = async (entryId, compartmentId) => {
    try {
      const res = await fetch(`/api/collection/${entryId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compartment_id: compartmentId })
      });
      if (res.ok) { showToast('Card moved.'); await refreshAll(); }
      else showToast('Failed to move card.');
    } catch (err) { console.error(err); showToast('Error moving card.'); }
  };

  const handleDeleteCard = async (entryId) => {
    if (!window.confirm('Remove this card from your collection?')) return;
    try {
      const res = await fetch(`/api/collection/${entryId}`, { method: 'DELETE' });
      if (res.ok) { showToast('Card removed.'); await refreshAll(); onUpdate(); }
      else showToast('Failed to remove card.');
    } catch (err) { console.error(err); showToast('Error removing card.'); }
  };

  const handleFileCard = async (entryId, locationId) => {
    try {
      const res = await fetch(`/api/collection/${entryId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId })
      });
      if (res.ok) { showToast('Card filed.'); await refreshAll(); onUpdate(); }
      else showToast('Failed to file card.');
    } catch (err) { console.error(err); showToast('Error filing card.'); }
  };

  const handleApplyAll = async () => {
    if (!applyAllTarget || unsortedCards.length === 0) return;
    const target = locations.find(l => l.id === parseInt(applyAllTarget, 10));
    if (!window.confirm(`File all ${unsortedCards.length} unsorted card(s) into "${target?.name}"?`)) return;
    try {
      const res = await fetch(`/api/locations/${applyAllTarget}/apply-all`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: unsortedCards.map(c => c.entry_id) })
      });
      const data = await res.json();
      if (res.ok) { showToast(data.message); await refreshAll(); onUpdate(); }
      else showToast(data.error || 'Failed to file batch.');
    } catch (err) { console.error(err); showToast('Error filing batch.'); }
  };

  const startFilingMode = async () => {
    if (!applyAllTarget || unsortedCards.length === 0) return;
    const targetLoc = locations.find(l => l.id === parseInt(applyAllTarget, 10));
    if (!targetLoc) return;
    
    const sortedForFiling = sortCardsByOrder([...unsortedCards], targetLoc.sort_order, targetLoc.foil_sorting);

    try {
      const res = await fetch(`/api/locations/${applyAllTarget}/recommend-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: sortedForFiling.map(c => c.entry_id) })
      });
      if (res.ok) {
        const data = await res.json();
        setFilingQueue(data);
        setFilingIndex(0);
        setFilingMode(true);
        setActiveLocationId(parseInt(applyAllTarget, 10));
      } else {
        showToast('Failed to start filing mode.');
      }
    } catch (err) { console.error(err); showToast('Error starting filing mode.'); }
  };

  const handleFilingPlaced = async (entryId, locationId, compartmentId, position) => {
    try {
      const res = await fetch(`/api/collection/${entryId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId, compartment_id: compartmentId, position })
      });
      if (res.ok) {
        await refreshAll();
        if (filingIndex < filingQueue.length - 1) {
          setFilingIndex(filingIndex + 1);
        } else {
          showToast('Filing complete!');
          setFilingMode(false);
          onUpdate();
        }
      } else {
        showToast('Failed to file card.');
      }
    } catch (err) { console.error(err); showToast('Error filing card.'); }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="storage-workspace-grid">
      {/* Locations sidebar */}
      <div className="glass-panel location-sidebar-col" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '0.85rem' }}>Storage</strong>
          <button type="button" className="btn btn-secondary btn-icon-only" onClick={() => setShowCreate(s => !s)} style={{ width: '28px', height: '28px', padding: 0 }}>
            <Plus size={14} />
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateLocation} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <input className="input-control" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }} />
            <select className="select-control" value={newType} onChange={(e) => setNewType(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}>
              {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem' }}>Create</button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {locations.map(loc => (
            <div
              key={loc.id}
              onClick={() => setActiveLocationId(loc.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: activeLocationId === loc.id ? 'rgba(255,71,71,0.1)' : 'transparent',
                border: activeLocationId === loc.id ? '1px solid var(--accent-red)' : '1px solid transparent'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{loc.type} • {loc.total_cards || 0} cards</div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteLocation(loc.id, loc.name); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {locations.length === 0 && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No storage containers yet.</p>}
        </div>
      </div>

      {/* Selected location detail */}
      <div className="glass-panel" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
        {!selectedLoc ? (
          <p style={{ color: 'var(--text-secondary)' }}>Select a container to view its compartments.</p>
        ) : (
          <>
            {currentRecSpot && newestScannedCard && !filingMode && (
              <div className="glass-panel" style={{ padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', border: '1px dashed var(--primary-glow)', background: 'rgba(255, 255, 255, 0.03)', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Sparkles size={14} style={{ color: 'gold' }} />
                  <span>
                    Newest scanned: <strong>{newestScannedCard.name}</strong> ({newestScannedCard.printing}) &rarr;{' '}
                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                      {currentRecSpot.full ? 'Container Full!' : currentRecSpot.label}
                    </span>
                  </span>
                </div>
                {!currentRecSpot.full && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (isBinderType) {
                          const compIdx = compartments.findIndex(c => c.id === currentRecSpot.compartment_id);
                          if (compIdx !== -1) {
                            setActivePageIndex(compIdx);
                          }
                        } else {
                          setActiveCompartmentId(currentRecSpot.compartment_id);
                          const compCards = cardsByCompartment.get(currentRecSpot.compartment_id) || [];
                          const posIdx = Math.floor(currentRecSpot.position / 1000) - 1;
                          setCoverflowActiveIndex(Math.min(posIdx, compCards.length));
                        }
                      }}
                      style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                    >
                      View Spot
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleFileCard(newestScannedCard.entry_id, currentRecSpot.location_id || activeLocationId)}
                      style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                    >
                      File Here
                    </button>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
              <div>
                {editingName ? (
                  <input
                    autoFocus
                    className="input-control"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => { setEditingName(false); if (nameDraft.trim() && nameDraft.trim() !== selectedLoc.name) handleUpdateLocationField('name', nameDraft.trim()); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    style={{ fontSize: '1rem', padding: '0.25rem 0.5rem', fontWeight: 700 }}
                  />
                ) : (
                  <h3
                    onDoubleClick={() => { setNameDraft(selectedLoc.name); setEditingName(true); }}
                    title="Double-click to rename"
                    style={{ margin: 0, cursor: 'pointer' }}
                  >
                    {selectedLoc.name}
                  </h3>
                )}
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedLoc.type} • {compartments.length} compartments</span>
              </div>

              {(() => {
                const { base, foilAware } = splitSortOrder(selectedLoc.sort_order);
                const setBase = (newBase) => handleUpdateLocationField('sort_order', newBase === 'set-number' && foilAware ? 'set-number-printing' : newBase);
                const setFoilAware = (checked) => handleUpdateLocationField('sort_order', checked ? 'set-number-printing' : 'set-number');
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                    <select
                      className="select-control"
                      value={base}
                      onChange={(e) => setBase(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                    >
                      {SORT_BASES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {base === 'set-number' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={foilAware} onChange={(e) => setFoilAware(e.target.checked)} />
                        Split by printing (foil-aware)
                      </label>
                    )}
                    {base === 'set-number' && foilAware && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[{ v: 'normals_first', label: 'Normals First' }, { v: 'foils_first', label: 'Foils First' }].map(opt => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => handleUpdateLocationField('foil_sorting', opt.v)}
                            className={`btn ${(selectedLoc.foil_sorting || 'normals_first') === opt.v ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.6rem', padding: '0.2rem 0.4rem' }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={handleAddCompartment} style={{ fontSize: '0.7rem', padding: '0.35rem 0.6rem' }}>
                {isBinderType ? '+ Add Page' : '+ Add Compartment'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleAutoAssignSets} style={{ fontSize: '0.7rem', padding: '0.35rem 0.6rem' }}>
                Auto-Assign Sets by Size
              </button>
              <button
                type="button"
                onClick={() => setShowAutoAssignInfo(s => !s)}
                title="What does this do?"
                style={{ background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: '50%', width: '20px', height: '20px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ?
              </button>
            </div>

            {showAutoAssignInfo && (
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0, background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                Dedicates each compartment to a specific set instead of letting any card land anywhere. It counts how many cards you own in each set, figures out how many compartments each one needs to fit (based on compartment capacity), and assigns that many consecutive compartments to it — biggest sets first. Use it once to lay out a box/binder by set instead of doing it compartment-by-compartment; it overwrites current set assignments.
              </p>
            )}

            {selectedLoc.sort_order !== 'custom' && (
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
                Sort order isn't Custom — cards file automatically by this scheme; manual per-card moves are disabled until you switch to Custom.
              </p>
            )}

            {isBinderType && compartments.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', margin: '0.2rem 0', background: 'rgba(0,0,0,0.1)', padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={activePageIndex <= 0}
                  onClick={() => setActivePageIndex(prev => Math.max(0, isMobile ? prev - 1 : prev - 2))}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  &larr; Prev
                </button>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {isMobile ? (
                    `Page ${activePageIndex + 1} of ${compartments.length}`
                  ) : (
                    `Pages ${Math.floor(activePageIndex / 2) * 2 + 1}${Math.floor(activePageIndex / 2) * 2 + 2 <= compartments.length ? `-${Math.floor(activePageIndex / 2) * 2 + 2}` : ''} of ${compartments.length}`
                  )}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isMobile ? activePageIndex >= compartments.length - 1 : Math.floor(activePageIndex / 2) * 2 + 2 >= compartments.length}
                  onClick={() => setActivePageIndex(prev => {
                    const next = isMobile ? prev + 1 : prev + 2;
                    return next < compartments.length ? next : prev;
                  })}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Next &rarr;
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: isBinderType ? '1rem' : '0.6rem' }}>
              {isBinderType ? (() => {
                if (compartments.length === 0) return null;
                const pageProps = (c, idx) => ({
                  compartment: c,
                  cards: cardsByCompartment.get(c.id) || [],
                  sortOrder: selectedLoc.sort_order,
                  availableSets: availableSetNames,
                  canRemove: idx === compartments.length - 1 && compartments.length > 1 && (cardsByCompartment.get(c.id) || []).length === 0,
                  moveTargets: compartments,
                  onRename: (label) => handleRenameCompartment(c.id, label),
                  onSetCapacity: (cap) => handleSetCapacity(c.id, cap),
                  onToggleSet: (setName) => handleToggleCompartmentSet(c, setName),
                  onRemove: () => handleRemoveCompartment(c.id),
                  onDeleteCard: handleDeleteCard,
                  onMoveCard: handleMoveCard,
                  recommendedSpot: currentRecSpot && currentRecSpot.compartment_id === c.id ? {
                    index: Math.floor(currentRecSpot.position / 1000) - 1
                  } : null
                });

                if (isMobile) {
                  const targetIdx = Math.min(activePageIndex, compartments.length - 1);
                  const activePage = compartments[targetIdx];
                  if (!activePage) return null;
                  return (
                    <div
                      className="binder-page-container"
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      style={{ touchAction: 'pan-y' }}
                    >
                      <div className="binder-page-left" style={{ width: '100%' }}>
                        <BinderPageContent {...pageProps(activePage, targetIdx)} />
                      </div>
                    </div>
                  );
                } else {
                  const spreadIdx = Math.floor(Math.min(activePageIndex, compartments.length - 1) / 2);
                  const leftIdx = spreadIdx * 2;
                  const rightIdx = leftIdx + 1;
                  const left = compartments[leftIdx];
                  const right = compartments[rightIdx];

                  return (
                    <div className="binder-page-container">
                      <div className="binder-page-left">
                        <BinderPageContent {...pageProps(left, leftIdx)} />
                      </div>
                      <div className="binder-spine" />
                      {right && (
                        <div className="binder-page-right">
                          <BinderPageContent {...pageProps(right, rightIdx)} />
                        </div>
                      )}
                    </div>
                  );
                }
              })() : (() => {
                if (compartments.length === 0) return <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No compartments/rows in this location.</p>;

                const activeComp = compartments.find(c => c.id === activeCompartmentId) || compartments[0];
                if (!activeComp) return null;

                const activeCompCards = cardsByCompartment.get(activeComp.id) || [];
                const activeCardIndex = Math.min(coverflowActiveIndex, Math.max(0, activeCompCards.length - 1));
                const activeCard = activeCompCards[activeCardIndex];

                const isCustom = selectedLoc.sort_order === 'custom';
                const canRemoveActive = compartments.length > 1 && activeCompCards.length === 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Row Selection Header */}
                    <div className="row-selection-grid">
                      {compartments.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`row-tab-btn ${activeCompartmentId === c.id ? 'active' : ''}`}
                          onClick={() => {
                            setActiveCompartmentId(c.id);
                            setRowLabelDraft(c.display_label);
                          }}
                        >
                          <span>{c.display_label}</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({c.count}/{c.capacity})</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Compartment Settings & Inspector */}
                    <div className="glass-panel" style={{ padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {editingRowLabel ? (
                          <input
                            autoFocus
                            className="input-control"
                            value={rowLabelDraft}
                            onChange={(e) => setRowLabelDraft(e.target.value)}
                            onBlur={() => { setEditingRowLabel(false); handleRenameCompartment(activeComp.id, rowLabelDraft); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { setEditingRowLabel(false); handleRenameCompartment(activeComp.id, rowLabelDraft); }
                              if (e.key === 'Escape') setEditingRowLabel(false);
                            }}
                            style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', width: '130px' }}
                          />
                        ) : (
                          <strong
                            onDoubleClick={() => { setRowLabelDraft(activeComp.display_label); setEditingRowLabel(true); }}
                            title="Double-click to rename"
                            style={{ cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            {activeComp.display_label}
                          </strong>
                        )}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{activeComp.count} / {activeComp.capacity} cards</span>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowRowSets(s => !s)} style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem' }}>
                          {activeComp.assignedSets.length === 0 ? 'Any set' : activeComp.assignedSets.length === 1 ? activeComp.assignedSets[0] : `${activeComp.assignedSets.length} sets`}
                        </button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Capacity
                          <input
                            type="number" min="1" className="input-control" defaultValue={activeComp.capacity}
                            onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v > 0 && v !== activeComp.capacity) handleSetCapacity(activeComp.id, v); }}
                            style={{ width: '50px', padding: '0.1rem 0.25rem', fontSize: '0.65rem' }}
                          />
                        </label>
                        {canRemoveActive && (
                          <button
                            type="button"
                            className="btn btn-danger btn-icon-only"
                            onClick={() => handleRemoveCompartment(activeComp.id)}
                            title="Remove this compartment (must be empty)"
                            style={{ width: '22px', height: '22px', padding: 0, marginLeft: 'auto' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      {showRowSets && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
                          <select
                            className="select-control"
                            value=""
                            onChange={(e) => { if (e.target.value) handleToggleCompartmentSet(activeComp, e.target.value); }}
                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}
                          >
                            <option value="">Choose set to toggle...</option>
                            {availableSetNames.map(setName => (
                              <option key={setName} value={setName}>
                                {activeComp.assignedSets.includes(setName) ? `✓ ${setName}` : setName}
                              </option>
                            ))}
                          </select>
                          {activeComp.assignedSets.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {activeComp.assignedSets.map(setName => (
                                <span key={setName} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', background: 'var(--accent-red)', borderRadius: '3px' }}>
                                  {setName}
                                  <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleToggleCompartmentSet(activeComp, setName)}>&times;</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* iPod Album Art Cover Flow Layout */}
                    {activeCompCards.length === 0 ? (
                      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                        Empty row. Scan or file cards here!
                      </div>
                    ) : (
                      <>
                        <div
                          className="box-coverflow-container"
                          onTouchStart={handleCoverflowTouchStart}
                          onTouchEnd={(e) => handleCoverflowTouchEnd(e, activeCompCards.length)}
                        >
                          <button
                            type="button"
                            className="box-coverflow-nav left"
                            disabled={activeCardIndex <= 0}
                            onClick={() => setCoverflowActiveIndex(prev => Math.max(0, prev - 1))}
                          >
                            &larr;
                          </button>

                          <div className="box-coverflow-track">
                            {activeCompCards.map((card, i) => {
                              const offset = i - activeCardIndex;
                              const absOffset = Math.abs(offset);

                              const isRecSpot = currentRecSpot &&
                                currentRecSpot.compartment_id === activeComp.id &&
                                Math.floor(currentRecSpot.position / 1000) - 1 === i;

                              let transform = '';
                              let zIndex = 10 - absOffset;
                              let opacity = 1;
                              let filter = 'none';

                              if (offset === 0) {
                                transform = `translateX(0px) scale(1.22) translateZ(0px)`;
                                opacity = 1;
                              } else {
                                const dir = offset > 0 ? 1 : -1;
                                const translateX = dir * (85 + absOffset * 35);
                                const rotateY = dir * -48;
                                transform = `translateX(${translateX}px) scale(0.8) rotateY(${rotateY}deg)`;
                                opacity = Math.max(0.12, 1 - absOffset * 0.22);
                                filter = `brightness(${Math.max(0.35, 1 - absOffset * 0.18)})`;
                              }

                              return (
                                <div
                                  key={card.entry_id}
                                  className={`box-coverflow-card ${offset === 0 ? 'active' : ''}`}
                                  style={{
                                    transform,
                                    zIndex,
                                    opacity,
                                    filter,
                                    ...(isRecSpot ? { outline: '3px solid #ffc107', outlineOffset: '2px', boxShadow: '0 0 10px #ffc107' } : {})
                                  }}
                                  onClick={() => setCoverflowActiveIndex(i)}
                                >
                                  <img src={card.image_url} alt={card.name} />
                                  <PrintingBadge printing={card.printing} />
                                  {isRecSpot && (
                                    <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#ffc107', color: '#000', fontSize: '0.5rem', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px', zIndex: 10 }}>REC SPOT</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="box-coverflow-nav right"
                            disabled={activeCardIndex >= activeCompCards.length - 1}
                            onClick={() => setCoverflowActiveIndex(prev => Math.min(activeCompCards.length - 1, prev + 1))}
                          >
                            &rarr;
                          </button>
                        </div>

                        {/* Focused Card Actions */}
                        {activeCard && (
                          <div className="focused-card-info-panel">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <strong style={{ fontSize: '0.85rem' }}>{activeCard.name}</strong>
                                {activeCard.quantity > 1 && <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>x{activeCard.quantity}</span>}
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  {activeCard.set_name} • #{activeCard.set_number}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {isCustom && compartments.length > 1 && (
                                  <select
                                    className="select-control"
                                    value=""
                                    onChange={(e) => { if (e.target.value) handleMoveCard(activeCard.entry_id, parseInt(e.target.value, 10)); }}
                                    style={{ fontSize: '0.65rem', padding: '0.15rem 0.3rem', width: '110px' }}
                                  >
                                    <option value="">Move to...</option>
                                    {compartments.filter(t => t.id !== activeComp.id).map(t => (
                                      <option key={t.id} value={t.id}>{t.display_label}</option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDeleteCard(activeCard.entry_id)}
                                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem' }}
                                >
                                  Remove Card
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* Unsorted queue */}
      <div className="glass-panel location-unsorted-col" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        {filingMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.85rem' }}>Filing Mode</strong>
              <button type="button" className="btn btn-secondary btn-icon-only" onClick={() => { setFilingMode(false); refreshAll(); }} style={{ padding: '0.2rem 0.5rem', width: 'auto', fontSize: '0.7rem' }}>
                Cancel
              </button>
            </div>
            
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Card {filingIndex + 1} of {filingQueue.length}
            </div>
            
            {filingQueue[filingIndex] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                <img src={filingQueue[filingIndex].entry.image_url} alt={filingQueue[filingIndex].entry.name} style={{ width: '120px', borderRadius: '5px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} />
                
                <div style={{ textAlign: 'center' }}>
                  <strong style={{ fontSize: '1rem', display: 'block' }}>{filingQueue[filingIndex].entry.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{filingQueue[filingIndex].entry.set_name} • {filingQueue[filingIndex].entry.printing}</span>
                </div>
                
                {filingQueue[filingIndex].recommended ? (
                  <div style={{ background: 'rgba(255, 193, 7, 0.15)', border: '1px solid #ffc107', borderRadius: 'var(--radius-sm)', padding: '0.75rem', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#ffc107', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', marginBottom: '0.25rem' }}>Place Here</div>
                    <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{filingQueue[filingIndex].recommended.label}</strong>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255, 71, 71, 0.15)', border: '1px solid #ff4747', borderRadius: 'var(--radius-sm)', padding: '0.75rem', width: '100%', textAlign: 'center' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#fff' }}>Container Full!</strong>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { if (filingIndex + 1 < filingQueue.length) { setFilingIndex(prev => prev + 1); } else { showToast('Filing complete!'); setFilingMode(false); onUpdate(); } }} style={{ flex: 1, padding: '0.6rem' }}>
                    Skip
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    disabled={!filingQueue[filingIndex].recommended}
                    onClick={() => {
                      const rec = filingQueue[filingIndex].recommended;
                      handleFilingPlaced(filingQueue[filingIndex].entry.entry_id, rec.location_id, rec.compartment_id, rec.position);
                    }} 
                    style={{ flex: 2, padding: '0.6rem', fontSize: '0.9rem', fontWeight: 'bold' }}
                  >
                    Placed
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <strong style={{ fontSize: '0.85rem' }}>Unsorted ({unsortedCards.length})</strong>
            {newestScannedCard && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={showNewestRecommendation}
                  onChange={(e) => setShowNewestRecommendation(e.target.checked)}
                />
                <span>Show recommended spot for newest scanned</span>
              </label>
            )}
            <input
              className="input-control" placeholder="Search..." value={unsortedSearch}
              onChange={(e) => setUnsortedSearch(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
            />
            <select className="select-control" value={unsortedSort} onChange={(e) => setUnsortedSort(e.target.value)} style={{ fontSize: '0.7rem', padding: '0.3rem 0.5rem' }}>
              <option value="scanned-desc">Scanned (Newest First)</option>
              <option value="scanned-asc">Scanned (Oldest First)</option>
              <option value="name-asc">A-Z</option>
              <option value="price-desc">Value (High-Low)</option>
              <option value="set-number">Set & Number</option>
            </select>

            {unsortedCards.length > 0 && (
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <select className="select-control" value={applyAllTarget} onChange={(e) => setApplyAllTarget(e.target.value)} style={{ fontSize: '0.65rem', padding: '0.25rem 0.4rem', flex: 1 }}>
                  <option value="">Sort/Apply to...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button type="button" className="btn btn-secondary" disabled={!applyAllTarget} onClick={startFilingMode} style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }} title="Sort cards and file one by one">
                  File Cards
                </button>
                <button type="button" className="btn btn-primary" disabled={!applyAllTarget} onClick={handleApplyAll} style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>
                  Apply All
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {unsortedCards.map(card => (
                <div key={card.entry_id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                  <div style={{ position: 'relative', width: '28px', flexShrink: 0, overflow: 'hidden', borderRadius: '3px', ...getCardRarityBorder(card.rarity) }}>
                    <img src={card.image_url} alt={card.name} style={{ width: '100%', aspectRatio: 0.718, objectFit: 'cover', display: 'block' }} />
                    {getFoilOverlayClass(card.printing) && (
                      <div className={getFoilOverlayClass(card.printing)} style={{ borderRadius: '3px' }} />
                    )}
                  </div>
                  <span
                    onClick={() => { setSelectedCardFilter(card.name); setActiveTab('collection'); }}
                    title="Find in Collection"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  >
                    {card.name}
                  </span>
                  <select
                    className="select-control" value=""
                    onChange={(e) => { if (e.target.value) handleFileCard(card.entry_id, parseInt(e.target.value, 10)); }}
                    style={{ fontSize: '0.6rem', padding: '0.15rem 0.25rem', maxWidth: '90px' }}
                  >
                    <option value="">File to...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <button type="button" onClick={() => handleDeleteCard(card.entry_id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
              {unsortedCards.length === 0 && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing unsorted.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LocationManager;
