import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, ChevronRight, ChevronLeft, Layers } from 'lucide-react';
import CompartmentView from './CompartmentView';

const CheckoutWizardModal = ({ locationsData, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checkedCards, setCheckedCards] = useState(new Set());
  const [compartmentData, setCompartmentData] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [setsList, setSetsList] = useState([]);

  useEffect(() => {
    fetch('/api/sets').then(r => r.json()).then(setSetsList).catch(() => {});
  }, []);

  // 1. Regroup locationsData by Location -> Compartment
  const steps = useMemo(() => {
    const grouped = [];
    
    // First, flatten into individual cards to pull
    const pulls = [];
    for (const cardInfo of locationsData) {
      for (const loc of cardInfo.locations) {
        pulls.push({
          entry_id: loc.entry_id, // include entry_id from backend
          card_id: cardInfo.card_id,
          card_name: loc.card_name,
          set_name: loc.set_name,
          number: loc.number,
          take: loc.take,
          location_id: loc.location_id,
          location_name: loc.location_name,
          compartment_id: loc.compartment_id,
          compartment_display: loc.compartment_display,
          position: loc.position
        });
      }
    }

    // Group by location_id + compartment_id
    const stepMap = new Map();
    for (const pull of pulls) {
      const stepKey = pull.location_id ? `${pull.location_id}-${pull.compartment_id}` : 'unassigned';
      if (!stepMap.has(stepKey)) {
        stepMap.set(stepKey, {
          id: stepKey,
          location_id: pull.location_id,
          location_name: pull.location_name,
          compartment_id: pull.compartment_id,
          compartment_display: pull.compartment_display,
          pulls: []
        });
      }
      stepMap.get(stepKey).pulls.push(pull);
    }

    // Sort pulls within each step by position so the user can pull them in order
    for (const step of stepMap.values()) {
      step.pulls.sort((a, b) => {
        const posA = a.position || 0;
        const posB = b.position || 0;
        return posA - posB;
      });
    }

    return Array.from(stepMap.values()).sort((a, b) => {
      if (a.location_id === null) return 1;
      if (b.location_id === null) return -1;
      if (a.location_name !== b.location_name) return a.location_name.localeCompare(b.location_name);
      return (a.compartment_id || 0) - (b.compartment_id || 0);
    });
  }, [locationsData]);

  const currentStep = steps[currentStepIndex];

  // 2. Fetch compartment context when step changes
  useEffect(() => {
    let active = true;
    if (!currentStep) return;

    if (currentStep.id === 'unassigned' || !currentStep.location_id) {
      setCompartmentData(null);
      return;
    }

    const fetchCompartment = async () => {
      setLoadingContext(true);
      try {
        const [locRes, compsRes, cardsRes] = await Promise.all([
          fetch(`/api/locations/${currentStep.location_id}`),
          fetch(`/api/locations/${currentStep.location_id}/compartments`),
          fetch(`/api/collection?compartment_id=${currentStep.compartment_id}`)
        ]);

        if (locRes.ok && compsRes.ok && cardsRes.ok) {
          const loc = await locRes.json();
          const comps = await compsRes.json();
          const cards = await cardsRes.json();
          // Find the specific compartment metadata
          const comp = comps.find(c => c.id === currentStep.compartment_id);
          
          if (active && comp) {
            // Sort cards by position (or custom sort order) so CompartmentView matches the physical layout
            cards.sort((a, b) => (a.position || 0) - (b.position || 0));
            setCompartmentData({ ...comp, cards, location: loc });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingContext(false);
      }
    };
    fetchCompartment();
    return () => { active = false; };
  }, [currentStep]);

  // First unchecked card position
  const firstUnchecked = currentStep ? currentStep.pulls.find(p => !checkedCards.has(`${p.card_id}-${p.position}`)) : null;
  const focusEntryId = firstUnchecked ? firstUnchecked.entry_id : null;

  if (!currentStep) return null;

  // Track checked state via unique pull ID (card_id + position)
  const toggleCheck = async (pull) => {
    const pullId = getPullId(pull);
    const isChecked = checkedCards.has(pullId);
    
    // Optimistic UI update
    const next = new Set(checkedCards);
    if (isChecked) {
      next.delete(pullId);
    } else {
      next.add(pullId);
    }
    setCheckedCards(next);

    // Update physical location in backend
    if (pull.entry_id) {
      try {
        if (!isChecked) {
          // Unassign the card since it's checked (pulled)
          await fetch(`/api/collection/${pull.entry_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location_id: null, compartment_id: null, position: null })
          });
        } else {
          // Put it back to its original location if unchecked
          await fetch(`/api/collection/${pull.entry_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              location_id: pull.location_id, 
              compartment_id: pull.compartment_id, 
              position: pull.position 
            })
          });
        }
      } catch (err) {
        console.error('Failed to update card location', err);
      }
    }
  };

  const getPullId = (pull) => `${pull.card_id}-${pull.position}`;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(i => i + 1);
    } else {
      onClose(); // Finished
    }
  };

  const allPullsChecked = currentStep.pulls.every(p => checkedCards.has(getPullId(p)));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
    }} onClick={onClose}>
      <div className="glass-panel" style={{
        maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: '0'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                Deck Checked Out!
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                Pull the physical cards from your collection.
              </p>
            </div>
            <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(((currentStepIndex) / steps.length) * 100)}% Complete</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${((currentStepIndex + (allPullsChecked ? 1 : 0)) / steps.length) * 100}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '300px' }}>
          
          {/* Step Context Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{currentStep.location_name}</h3>
              {currentStep.compartment_display && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{currentStep.compartment_display}</div>
              )}
            </div>
          </div>

          {/* Unassigned Pile Message */}
          {currentStep.id === 'unassigned' && (
            <div style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.25rem' }}>ℹ️</div>
              <div>These cards are in your <strong>Unassigned Pile</strong> (not stored in a Binder or Box yet), so there is no visual grid layout to show.</div>
            </div>
          )}

          {/* Visual Grid Context (If available) */}
          {currentStep.id !== 'unassigned' && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-glass)' }}>
              <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Compartment Layout</div>
              {loadingContext ? (
                <div className="spinner" style={{ margin: '2rem auto' }}></div>
              ) : compartmentData ? (
                <div style={{ pointerEvents: 'none' }}>
                  <CompartmentView
                    compartment={compartmentData}
                    cards={compartmentData.cards}
                    locationType={compartmentData.location?.type || 'Binder'}
                    sortOrder={compartmentData.location?.sort_order || 'custom'}
                    setsList={setsList}
                    highlightPositions={currentStep.pulls.map(p => Math.floor(p.position / 1000))}
                    focusEntryId={focusEntryId}
                  />
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Layout context unavailable</div>
              )}
            </div>
          )}

          {/* Cards to pull list */}
          <div>
            <h4 style={{ margin: '0 0 1rem 0', color: '#fff', fontSize: '0.95rem' }}>Cards to pull:</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentStep.pulls.map((pull, idx) => {
                const pullId = getPullId(pull);
                const isChecked = checkedCards.has(pullId);
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleCheck(pull)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '1rem', 
                      padding: '1rem', 
                      background: isChecked ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', 
                      border: isChecked ? '1px solid var(--accent-green)' : '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: isChecked ? 'none' : '2px solid var(--text-muted)',
                      background: isChecked ? 'var(--accent-green)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isChecked && <CheckCircle size={16} color="#000" />}
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: isChecked ? '#fff' : 'var(--text-primary)', fontSize: '1rem' }}>{pull.card_name}</strong>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{pull.set_name} • #{pull.number} {pull.position ? `• Slot ${Math.floor(pull.position / 1000)}` : ''}</div>
                      </div>
                      <div className="badge" style={{ background: isChecked ? 'var(--accent-green)' : 'var(--accent-blue)', color: isChecked ? '#000' : '#fff', fontSize: '0.9rem', padding: '0.25rem 0.5rem' }}>
                        Pull x{pull.take}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setCurrentStepIndex(i => Math.max(0, i - 1))}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleNext}
            style={{ 
              opacity: allPullsChecked ? 1 : 0.5,
              transform: allPullsChecked ? 'scale(1.05)' : 'none',
              boxShadow: allPullsChecked ? '0 0 15px rgba(59,130,246,0.5)' : 'none'
            }}
          >
            {currentStepIndex === steps.length - 1 ? 'Finish Checklist' : 'Next Location'} <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default CheckoutWizardModal;
