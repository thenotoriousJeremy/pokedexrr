import React, { useState, useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { getPrintingBadgeStyle, getPrintingBadgeLabel, getFoilOverlayClass } from '../utils/cardPrinting';
import { getCardRarityBorder, getRarityBadgeLabel, getRarityBadgeStyle } from '../utils/cardRarity';
import { formatPrice } from '../utils/formatPrice';

const infoChipStyle = { fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' };

function pocketColumns(capacity) {
  return Math.max(1, Math.round(Math.sqrt(capacity || 1)));
}

export function getSortCategory(card, sortOrder, setsList = []) {
  if (!card || !sortOrder || sortOrder === 'custom') return null;
  if (sortOrder.startsWith('name')) return card.name ? card.name.charAt(0).toUpperCase() : '?';
  if (sortOrder.startsWith('set')) {
    if (!card.set_name) return 'Unknown Set';
    if (!setsList || setsList.length === 0) return card.set_name;
    const idx = setsList.findIndex(s => s.name === card.set_name);
    return idx >= 0 ? `${idx + 1}. ${card.set_name}` : card.set_name;
  }
  if (sortOrder.startsWith('type')) {
    let typeStr = 'Colorless';
    if (card.types) {
      try {
        const t = typeof card.types === 'string' ? JSON.parse(card.types) : card.types;
        if (t && t.length > 0) typeStr = t[0];
      } catch (e) { /* no-op */ }
    }
    return typeStr;
  }
  if (sortOrder.startsWith('price')) {
    const p = card.price_trend || 0;
    if (p >= 100) return '$100+';
    if (p >= 50) return '$50+';
    if (p >= 20) return '$20+';
    if (p >= 10) return '$10+';
    if (p >= 5) return '$5+';
    if (p >= 1) return '$1+';
    return '< $1';
  }
  if (sortOrder.startsWith('language')) return card.language || 'English';
  return null;
}

function PrintingBadge({ printing }) {
  if (!printing || printing === 'Normal') return null;
  return (
    <div style={{
      position: 'absolute', top: '-4px', right: '-4px',
      fontSize: '0.55rem', fontWeight: 'bold',
      padding: '0.1rem 0.3rem', borderRadius: '4px',
      zIndex: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
      ...getPrintingBadgeStyle(printing)
    }}>
      {getPrintingBadgeLabel(printing)}
    </div>
  );
}

export default function CompartmentView({
  compartment,
  cards = [],
  locationType,
  sortOrder = 'custom',
  setsList = [],
  highlightPositions = [], // Array of positions to highlight (1-indexed)
  targetActiveIndex = null,
  onCardClick = null,
  
  // Storage Management Props (can be omitted for read-only view)
  availableFilters = [],
  onRename = null,
  onSetCapacity = null,
  onToggleFilter = null,
  onRemove = null,
  onMoveCard = null,
  moveTargets = [],
  canRemove = false,
  recommendedSpot = null,
  focusEntryId = null,

  // Multi-select (optional; enabled when onCardLongPress is provided)
  selectMode = false,
  selectedIds = null,
  onCardLongPress = null,
  onCardToggle = null
}) {
  const isBinder = locationType === 'Binder' || locationType === 'Toploader Binder';
  const isSelected = (entryId) => !!(selectedIds && selectedIds.has(entryId));

  // Long-press-to-arm selection, mirrors CollectionList. Coexists with the
  // swipe/coverflow touch handlers because a >10px move cancels the timer.
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const pointerStart = useRef(null);
  useEffect(() => () => clearTimeout(longPressTimer.current), []);

  const beginPress = (e, entryId) => {
    if (!onCardLongPress) return;
    longPressFired.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onCardLongPress(entryId);
      if (navigator.vibrate) navigator.vibrate(25);
    }, 450);
  };
  const movePress = (e) => {
    if (!pointerStart.current) return;
    if (Math.abs(e.clientX - pointerStart.current.x) > 10 || Math.abs(e.clientY - pointerStart.current.y) > 10) {
      clearTimeout(longPressTimer.current);
    }
  };
  const endPress = () => { clearTimeout(longPressTimer.current); pointerStart.current = null; };
  const pressHandlers = (entryId) => ({
    onPointerDown: (e) => beginPress(e, entryId),
    onPointerMove: movePress,
    onPointerUp: endPress,
    onPointerLeave: endPress,
    onContextMenu: (e) => e.preventDefault(),
  });
  // Returns true if the click was consumed by selection (caller should stop).
  const handleSelectClick = (entryId) => {
    if (longPressFired.current) { longPressFired.current = false; return true; }
    if (selectMode) { onCardToggle && onCardToggle(entryId); return true; }
    return false;
  };
  const selectedOutline = { outline: '3px solid var(--accent-red)', outlineOffset: '1px' };

  // --- Box Coverflow State ---
  const slotCountBox = Math.max(compartment?.capacity || 1, cards.length);
  const filledCardsBox = Array.from({ length: slotCountBox }, (_, i) => cards[i] || null);
  
  const initialActiveIndex = highlightPositions.length > 0 
    ? Math.max(0, highlightPositions[0] - 1) 
    : 0;
    
  const [coverflowActiveIndex, setCoverflowActiveIndex] = useState(targetActiveIndex !== null ? targetActiveIndex : initialActiveIndex);

  useEffect(() => {
    if (targetActiveIndex !== null && targetActiveIndex !== undefined) {
      setCoverflowActiveIndex(targetActiveIndex);
    }
  }, [targetActiveIndex]);
  const [touchStart, setTouchStart] = useState(0);

  const handleCoverflowTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleCoverflowTouchEnd = (e, totalCards) => {
    const end = e.changedTouches[0].clientX;
    if (touchStart - end > 40) setCoverflowActiveIndex(prev => Math.min(totalCards - 1, prev + 1));
    if (end - touchStart > 40) setCoverflowActiveIndex(prev => Math.max(0, prev - 1));
  };

  // --- Binder Grid State ---
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(compartment?.display_label || '');
  const [showSets, setShowSets] = useState(false);

  if (!compartment) return null;

  if (isBinder) {
    const cols = pocketColumns(compartment.capacity);
    const recIdx = recommendedSpot ? recommendedSpot.index : -1;
    const rendered = [...cards];
    if (recIdx >= 0) {
      while (rendered.length < recIdx) rendered.push(null);
      rendered.splice(recIdx, 0, {
        __ghost: true,
        image_url: recommendedSpot.image_url,
        name: recommendedSpot.name,
        set_name: recommendedSpot.set_name
      });
    }
    const slotCount = Math.max(compartment.capacity, rendered.length);
    const pockets = Array.from({ length: slotCount }, (_, i) => rendered[i] || null);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', height: '100%' }}>
        {onRename && (
          <div className="row-flash" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {editingLabel ? (
              <input
                autoFocus
                className="input-control"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => { if (editingLabel) { setEditingLabel(false); onRename(labelDraft); } }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { setEditingLabel(false); onRename(labelDraft); }
                  else if (e.key === 'Escape') setEditingLabel(false);
                }}
                style={{ padding: '0.15rem 0.4rem', fontSize: '0.75rem', width: '110px' }}
              />
            ) : (
              <strong onDoubleClick={() => { setLabelDraft(compartment.label || ''); setEditingLabel(true); }} title="Double-click to rename" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
                {compartment.display_label}
              </strong>
            )}
            
            {onToggleFilter && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowSets(s => !s)} style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem' }}>
                {(compartment.assignedFilters || []).length === 0 ? 'Any category' : (compartment.assignedFilters || []).length === 1 ? compartment.assignedFilters[0] : `${compartment.assignedFilters.length} cats`}
              </button>
            )}
            
            {onSetCapacity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span>{compartment.count} /</span>
                <input
                  type="number" min="1" className="input-control" defaultValue={compartment.capacity}
                  onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v > 0 && v !== compartment.capacity) onSetCapacity(v); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  title="Change capacity"
                  style={{ width: '40px', padding: '0 0.1rem', fontSize: '0.65rem', background: 'transparent', border: '1px solid transparent', color: 'inherit', textAlign: 'left' }}
                />
              </div>
            )}
            
            {canRemove && onRemove && (
              <button type="button" className="btn btn-danger btn-icon-only" onClick={onRemove} title="Remove this page" style={{ width: '22px', height: '22px', padding: 0, marginLeft: 'auto' }}>
                &times;
              </button>
            )}
          </div>
        )}
        
        {showSets && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.4rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <select
              className="select-control"
              value=""
              onChange={(e) => { if (e.target.value) onToggleFilter(e.target.value); }}
              style={{ fontSize: '0.7rem', padding: '0.15rem 0.3rem' }}
            >
              <option value="">Choose category to toggle...</option>
              {availableFilters.map(filterVal => (
                <option key={filterVal} value={filterVal}>
                  {(compartment.assignedFilters || []).includes(filterVal) ? `✓ ${filterVal}` : filterVal}
                </option>
              ))}
            </select>
            {compartment.assignedFilters && compartment.assignedFilters.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {compartment.assignedFilters.map(filterVal => (
                  <span key={filterVal} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6rem', padding: '0.1rem 0.3rem', background: 'var(--accent-red)', borderRadius: '3px' }}>
                    {filterVal}
                    <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => onToggleFilter(filterVal)}>&times;</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="binder-pocket-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {pockets.map((card, i) => {
            const pos = i + 1;
            const prev = i > 0 ? pockets[i - 1] : null;
            const cat = getSortCategory(card, sortOrder, setsList);
            const prevCat = getSortCategory(prev, sortOrder, setsList);
            const categoryStart = cat && (!prev || prevCat !== cat);
            const isHighlighted = highlightPositions.includes(pos);
            const isTarget = isHighlighted;

            if (card && card.__ghost) {
              return (
                <div key={`ghost-${i}`} id="recommended-spot" className={`binder-pocket recommended-ghost ${categoryStart ? 'set-start' : ''}`}>
                  {card.image_url && <img src={card.image_url} alt={card.name} style={{ opacity: 0.85 }} />}
                  <div className="rec-ghost-label">Slot {pos}</div>
                  {categoryStart && <div className="set-divider-label" title={cat}>{cat}</div>}
                </div>
              );
            }
            return card ? (
              <div key={card.entry_id || `slot-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  className={`binder-pocket ${categoryStart ? 'set-start' : ''} ${card.entry_id === focusEntryId ? 'focus-flash' : ''}`}
                  style={{
                    ...getCardRarityBorder(card.rarity),
                    ...(isTarget ? {
                      borderColor: 'var(--accent-green)',
                      boxShadow: '0 0 15px rgba(34,197,94,0.4), inset 0 0 20px rgba(34,197,94,0.3)'
                    } : {}),
                    ...(isSelected(card.entry_id) ? selectedOutline : {})
                  }}
                  {...pressHandlers(card.entry_id)}
                  onClick={() => { if (handleSelectClick(card.entry_id)) return; onCardClick && onCardClick(card); }}
                >
                  <img src={card.image_url} alt={card.name} title={card.name} />
                  {getFoilOverlayClass(card.printing) && <div className={getFoilOverlayClass(card.printing)} style={{ borderRadius: '4px' }} />}
                  <PrintingBadge printing={card.printing} />
                  {selectMode && (
                    <div style={{ position: 'absolute', top: '3px', left: '3px', zIndex: 25, width: '18px', height: '18px', borderRadius: '50%', background: isSelected(card.entry_id) ? 'var(--accent-red)' : 'rgba(0,0,0,0.6)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem', fontWeight: 900 }}>{isSelected(card.entry_id) ? '✓' : ''}</div>
                  )}
                  {categoryStart && <div className="set-divider-label" title={cat}>{cat}</div>}
                  
                  {isTarget && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--accent-green)', color: '#000', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>✓</div>
                  )}
                  
                  {sortOrder === 'custom' && moveTargets.length > 1 && onMoveCard && (
                    <div className="binder-pocket-actions">
                      <select value="" onChange={(e) => { if (e.target.value) onMoveCard(card.entry_id, parseInt(e.target.value, 10)); }}>
                        <option value="">Move...</option>
                        {moveTargets.filter(t => t.id !== compartment.id).map(t => (
                          <option key={t.id} value={t.id}>{t.display_label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {card.price_trend && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    ${card.price_trend.toFixed(2)}
                  </div>
                )}
              </div>
            ) : (
              <div key={`empty-${i}`} className="binder-pocket empty" style={isTarget ? { borderColor: 'var(--accent-green)', background: 'rgba(34,197,94,0.1)' } : {}}>
                <span className="slot-number">{pos}</span>
                {isTarget && (
                  <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '0.5rem' }}>Pull</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    // --- Box Coverflow Rendering ---
    const renderedCards = [];
    let slotCounter = 1;
    
    let lastFilledIdx = -1;
    for (let i = filledCardsBox.length - 1; i >= 0; i--) {
      if (filledCardsBox[i]) {
        lastFilledIdx = i;
        break;
      }
    }
    
    const highestTargetIdx = highlightPositions.length > 0 ? Math.max(...highlightPositions) - 1 : -1;
    const renderLimit = Math.max(lastFilledIdx, highestTargetIdx);

    let currentCat = null;
    for (let i = 0; i <= renderLimit; i++) {
      const card = filledCardsBox[i];
      if (card) {
        const cat = getSortCategory(card, sortOrder, setsList);
        if (cat && cat !== currentCat) {
          renderedCards.push({
            __divider: true,
            entry_id: `div-${cat}`,
            label: cat
          });
          currentCat = cat;
        }
        renderedCards.push({ ...card, __slotNumber: slotCounter });
      } else {
        renderedCards.push({
          __empty: true,
          __slotNumber: slotCounter,
          entry_id: `spacer-${slotCounter}`
        });
      }
      slotCounter++;
    }

    let actualActiveIndex = coverflowActiveIndex;
    if (focusEntryId) {
      const targetIdx = renderedCards.findIndex(c => c.entry_id === focusEntryId);
      if (targetIdx !== -1) {
        actualActiveIndex = targetIdx;
      }
    }
    const activeCardIndex = Math.min(actualActiveIndex, Math.max(0, renderedCards.length - 1));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', overflow: 'hidden' }}>
        {onRename && (
          <div className="row-flash" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.85rem' }}>{compartment.display_label}</strong>
          </div>
        )}

        {renderedCards.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
            Empty row.
          </div>
        ) : (
          <>
          <div
            className="box-coverflow-container"
            onTouchStart={handleCoverflowTouchStart}
            onTouchEnd={(e) => handleCoverflowTouchEnd(e, renderedCards.length)}
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
              {renderedCards.map((card, i) => {
                const offset = i - activeCardIndex;
                const absOffset = Math.abs(offset);
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
                
                const pos = card.__slotNumber;
                const isTarget = highlightPositions.includes(pos);
                
                const highlightStyle = isTarget ? { 
                  borderColor: 'var(--accent-green)', 
                  borderWidth: '2px', 
                  borderStyle: 'solid', 
                  boxShadow: '0 0 20px rgba(34,197,94,0.6)' 
                } : {};

                if (card.__empty) {
                  return (
                    <div
                      key={card.entry_id}
                      className={`box-coverflow-card ${offset === 0 ? 'active' : ''}`}
                      style={{ transform, zIndex, opacity: opacity * 0.6, filter, ...highlightStyle }}
                      onClick={() => setCoverflowActiveIndex(i)}
                    >
                      <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.3)', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '5px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 'bold' }}>Slot {card.__slotNumber}</span>
                        {isTarget && (
                          <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1rem', marginTop: '0.5rem' }}>Pull</div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (card.__divider) {
                  return (
                    <div
                      key={card.entry_id}
                      className={`box-coverflow-card ${offset === 0 ? 'active' : ''}`}
                      style={{ transform, zIndex, opacity, filter: 'none', background: 'linear-gradient(135deg, rgba(255, 71, 71, 0.8), rgba(150, 0, 0, 0.8))', border: '1px solid rgba(255, 71, 71, 0.5)', display: 'flex', flexDirection: 'column', overflow: 'visible' }}
                      onClick={() => setCoverflowActiveIndex(i)}
                    >
                      <div style={{ position: 'absolute', top: '-18px', left: '10px', background: 'var(--accent-red)', color: '#fff', padding: '2px 12px', borderRadius: '6px 6px 0 0', fontSize: '0.7rem', fontWeight: 'bold', boxShadow: '0 -2px 5px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
                        {card.label}
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: '#fff' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center', padding: '0 1rem' }}>{card.label}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={card.entry_id}
                    className={`box-coverflow-card ${offset === 0 ? 'active' : ''}`}
                    style={{ transform, zIndex, opacity, filter, ...highlightStyle, ...getCardRarityBorder(card.rarity), ...(isSelected(card.entry_id) ? selectedOutline : {}) }}
                    {...pressHandlers(card.entry_id)}
                    onClick={() => {
                      if (handleSelectClick(card.entry_id)) return;
                      if (offset === 0 && onCardClick) onCardClick(card);
                      else setCoverflowActiveIndex(i);
                    }}
                  >
                    <img src={card.image_url} alt={card.name} />
                    {getFoilOverlayClass(card.printing) && <div className={getFoilOverlayClass(card.printing)} style={{ borderRadius: '4.5px' }} />}
                    <PrintingBadge printing={card.printing} />
                    {selectMode && (
                      <div style={{ position: 'absolute', top: '4px', left: '4px', zIndex: 25, width: '20px', height: '20px', borderRadius: '50%', background: isSelected(card.entry_id) ? 'var(--accent-red)' : 'rgba(0,0,0,0.6)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 900 }}>{isSelected(card.entry_id) ? '✓' : ''}</div>
                    )}
                    
                    {isTarget && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--accent-green)', color: '#000', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="box-coverflow-nav right"
              disabled={activeCardIndex >= renderedCards.length - 1}
              onClick={() => setCoverflowActiveIndex(prev => Math.min(renderedCards.length - 1, prev + 1))}
            >
              &rarr;
            </button>
          </div>

          {(() => {
            const activeCard = renderedCards[activeCardIndex];
            if (!activeCard || activeCard.__ghost || activeCard.__divider || activeCard.__empty) return null;
            
            return (
              <div className="focused-card-info-panel" style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: '0.85rem' }}>#{activeCard.__slotNumber} | {activeCard.name}</strong>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {activeCard.set_name} • #{activeCard.number}
                      </div>
                    </div>

                    {sortOrder === 'custom' && moveTargets.length > 1 && onMoveCard && (
                      <select
                        className="select-control"
                        value=""
                        onChange={(e) => { if (e.target.value) onMoveCard(activeCard.entry_id, parseInt(e.target.value, 10)); }}
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.3rem', width: '110px', flexShrink: 0 }}
                      >
                        <option value="">Move to...</option>
                        {moveTargets.filter(t => t.id !== compartment.id).map(t => (
                          <option key={t.id} value={t.id}>{t.display_label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                    {activeCard.rarity && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.03em', ...getRarityBadgeStyle(activeCard.rarity) }}>
                        {getRarityBadgeLabel(activeCard.rarity)}
                      </span>
                    )}
                    {activeCard.printing && activeCard.printing !== 'Normal' && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', ...getPrintingBadgeStyle(activeCard.printing) }}>
                        {getPrintingBadgeLabel(activeCard.printing)}
                      </span>
                    )}
                    {activeCard.printing === 'Normal' && <span style={infoChipStyle}>Normal</span>}
                    {activeCard.supertype && <span style={{ ...infoChipStyle, color: '#fff' }} title="Supertype">{activeCard.supertype}</span>}
                    {(activeCard.types || []).length > 0 && <span style={infoChipStyle} title="Types">{activeCard.types.join(' / ')}</span>}
                    {(activeCard.subtypes || []).length > 0 && <span style={infoChipStyle} title="Subtypes">{activeCard.subtypes.join(' / ')}</span>}
                    {activeCard.condition && <span style={infoChipStyle}>{activeCard.condition}</span>}
                    {activeCard.language && activeCard.language !== 'English' && <span style={infoChipStyle}>{activeCard.language}</span>}
                    {activeCard.quantity > 1 && <span style={{ ...infoChipStyle, color: '#fff' }}>x{activeCard.quantity}</span>}
                    {activeCard.price_trend > 0 && (
                      <span style={{ ...infoChipStyle, color: 'var(--accent-yellow)', marginLeft: 'auto' }}>
                        Value ${formatPrice(activeCard.price_trend)}
                      </span>
                    )}
                    {activeCard.purchase_price > 0 && <span style={infoChipStyle}>Paid ${formatPrice(activeCard.purchase_price)}</span>}
                  </div>
                </div>
              </div>
            );
          })()}
          </>
        )}
      </div>
    );
  }
}
