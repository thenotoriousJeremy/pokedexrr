import { useState, useRef, useEffect } from 'react';

// Long-press-to-arm multi-select + bulk actions over collection entries. Shared
// by CollectionList and the scanner's recent-scans strip so both get the same
// UX and hit the same /api/collection/bulk endpoint. onChanged({ ids, action,
// value }) runs after a successful bulk action; the caller refreshes its own
// data (refetch, or prune a local list). Selection is cleared before onChanged,
// so the acted-on ids are passed along.
export function useMultiSelect({ showToast, onChanged }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkMoveTarget, setBulkMoveTarget] = useState('');

  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);
  const pointerStart = useRef(null);

  useEffect(() => () => clearTimeout(longPressTimer.current), []);

  const toggleSelect = (entryId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId); else next.add(entryId);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelectMode = () => { setSelectMode(false); clearSelection(); setBulkMoveTarget(''); };

  // --- Long-press handlers (mouse + touch via pointer events) ---
  const beginPress = (e, entryId) => {
    longPressFired.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelectMode(true);
      setSelectedIds(prev => new Set(prev).add(entryId));
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
    onContextMenu: (e) => e.preventDefault(), // suppress mobile long-press image popup
  });

  // Runs one bulk action against every selected entry via the bulk endpoint.
  const runBulk = async (action, value, confirmMsg) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { showToast('No cards selected.'); return; }
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      const res = await fetch('/api/collection/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_ids: ids, action, value })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || 'Done.');
        clearSelection();
        onChanged && onChanged({ ids, action, value });
      } else {
        showToast(data.error || 'Bulk action failed.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error performing bulk action.');
    }
  };

  return {
    selectMode, setSelectMode, selectedIds, setSelectedIds, toggleSelect, clearSelection, exitSelectMode,
    bulkMoveTarget, setBulkMoveTarget, pressHandlers, longPressFired, runBulk,
  };
}
