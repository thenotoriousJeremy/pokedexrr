import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus } from 'lucide-react';

// Sortable item wrapper
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.5rem',
    borderRadius: '4px',
    marginBottom: '4px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
        <GripVertical size={16} color="var(--text-muted)" />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {children}
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Alphabetical (Name)' },
  { value: 'price', label: 'Price / Value' },
  { value: 'set', label: 'Set & Number' },
  { value: 'printing', label: 'Foil / Printing' },
  { value: 'type', label: 'Type' },
  { value: 'color', label: 'Color Identity' },
  { value: 'cmc', label: 'Mana Value (CMC)' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'language', label: 'Language' },
  { value: 'added_at', label: 'Date Added' },
  { value: 'entry_id', label: 'Entry Order' }
];

export function SortBuilder({ value, onChange }) {
  const items = Array.isArray(value) ? value : [];
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  const addCriteria = () => {
    onChange([...items, { id: Date.now().toString(), by: 'name', dir: 'asc' }]);
  };

  const updateCriteria = (id, updates) => {
    onChange(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeCriteria = (id) => {
    onChange(items.filter(i => i.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Sort Priority List</label>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Top rule applies first, falling back to subsequent rules on ties.</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              <select
                className="select-control"
                style={{ flex: 1, padding: '0.2rem' }}
                value={item.by}
                onChange={(e) => updateCriteria(item.id, { by: e.target.value })}
              >
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select
                className="select-control"
                style={{ width: '80px', padding: '0.2rem' }}
                value={item.dir}
                onChange={(e) => updateCriteria(item.id, { dir: e.target.value })}
              >
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.2rem', minWidth: 'auto' }}
                onClick={() => removeCriteria(item.id)}
              >
                <X size={14} />
              </button>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={addCriteria}>
        <Plus size={14} style={{ marginRight: '4px' }} /> Add Sort Rule
      </button>
    </div>
  );
}

const FILTER_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'supertype', label: 'Supertype' },
  { value: 'types', label: 'Types' },
  { value: 'subtypes', label: 'Subtypes' },
  { value: 'color_identity', label: 'Color Identity' },
  { value: 'cmc', label: 'Mana Value (CMC)' },
  { value: 'set_name', label: 'Set Name' },
  { value: 'set_id', label: 'Set Code' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'printing', label: 'Printing' }
];

const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: '>=', label: 'Greater/Eq' },
  { value: '<=', label: 'Less/Eq' },
  { value: 'exists', label: 'Exists' }
];

const KNOWN_OPTIONS = {
  supertype: ['Pokémon', 'Trainer', 'Energy', 'Basic', 'Legendary', 'Snow', 'World', 'Vanguard', 'Plane', 'Scheme', 'Phenomenon', 'Ongoing'],
  types: ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Fairy', 'Dragon', 'Colorless', 'White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Artifact', 'Creature', 'Enchantment', 'Instant', 'Sorcery', 'Planeswalker', 'Land', 'Battle', 'Tribal'],
  printing: ['Normal', 'Holofoil', 'Reverse Holofoil', '1st Edition', 'Promo'],
  rarity: ['Common', 'Uncommon', 'Rare', 'Mythic', 'Special', 'Bonus', 'Promo', 'Rare Holo', 'Rare Ultra', 'Rare Secret', 'Amazing Rare', 'Radiant Rare', 'Illustration Rare', 'Special Illustration Rare', 'Hyper Rare', 'Classic Collection'],
  color_identity: ['W', 'U', 'B', 'R', 'G', 'Colorless']
};

export function FilterBuilder({ value, onChange, setsList = [] }) {
  const rules = Array.isArray(value) ? value : [];

  const addRule = () => {
    onChange([...rules, { id: Date.now().toString(), action: 'exclude', field: 'types', operator: 'equals', value: '' }]);
  };

  const updateRule = (id, updates) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id) => {
    onChange(rules.filter(r => r.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Filing Rules (Allow/Deny List)</label>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Defines which cards are allowed in this container.</span>
      
      {rules.length === 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
          No rules set. Any matching game card is allowed.
        </div>
      )}

      {rules.map((rule) => {
        let options = KNOWN_OPTIONS[rule.field] || [];
        if (rule.field === 'set_name') options = setsList.map(s => s.name);
        if (rule.field === 'set_id') options = setsList.map(s => s.id);
        
        return (
          <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.1)', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
            <select
              className="select-control"
              style={{ width: '80px', padding: '0.2rem', color: rule.action === 'exclude' ? 'var(--accent-red)' : 'var(--accent-green)' }}
              value={rule.action}
              onChange={(e) => updateRule(rule.id, { action: e.target.value })}
            >
              <option value="exclude">Exclude</option>
              <option value="include">Require</option>
            </select>
            <select
              className="select-control"
              style={{ flex: 1, minWidth: '100px', padding: '0.2rem' }}
              value={rule.field}
              onChange={(e) => updateRule(rule.id, { field: e.target.value })}
            >
              {FILTER_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select
              className="select-control"
              style={{ width: '90px', padding: '0.2rem' }}
              value={rule.operator}
              onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
            >
              {FILTER_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {rule.operator !== 'exists' && (
              <>
                <input
                  className="input-control"
                  style={{ flex: 1, minWidth: '100px', padding: '0.2rem' }}
                  placeholder="Value"
                  list={`opts-${rule.id}`}
                  value={rule.value || ''}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                />
                {options.length > 0 && (
                  <datalist id={`opts-${rule.id}`}>
                    {options.map(opt => <option key={opt} value={opt} />)}
                  </datalist>
                )}
              </>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.2rem', minWidth: 'auto' }}
              onClick={() => removeRule(rule.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={addRule}>
        <Plus size={14} style={{ marginRight: '4px' }} /> Add Rule
      </button>
    </div>
  );
}
