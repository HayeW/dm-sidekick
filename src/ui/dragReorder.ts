import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, RefObject } from 'react';

/**
 * Where a dragged row lands (decision D21): the number of other rows whose middle lies above
 * the dragged row's middle. `middles` are the rows' middles before the drag, in list order.
 */
export function dropIndex(middles: number[], from: number, draggedMiddle: number): number {
  return middles.filter((middle, index) => index !== from && middle < draggedMiddle).length;
}

type Drag = {
  pointerId: number;
  id: string;
  from: number;
  /** The list's ids when the drag started; if the list changes, the drag is dropped. */
  ids: string;
  startY: number;
  dy: number;
  middles: number[];
  /** How far the other rows slide to make room: the dragged row's height plus the gap. */
  room: number;
};

/**
 * Drag to reorder a vertical list by a handle in each row (D21). The rows are the list's
 * children, one per id in `ids`. While dragging, the dragged row follows the finger and the
 * other rows slide aside; on release `onDrop` gets the row's id and new index. Nothing changes
 * until the release. If the list changes during a drag (e.g. ✕ tapped with another finger),
 * the drag is cancelled, as its positions no longer match the rows.
 */
export function useDragReorder(
  listRef: RefObject<HTMLElement | null>,
  ids: string[],
  onDrop: (id: string, to: number) => void,
) {
  const [state, setState] = useState<Drag | null>(null);
  // Pointer events can arrive before React re-renders, so the handlers read the latest drag here.
  const current = useRef<Drag | null>(null);
  const update = (next: Drag | null) => {
    current.current = next;
    setState(next);
  };
  const key = ids.join('\n');
  /** The drag, if it still belongs to the list as it is now. */
  const live = (candidate: Drag | null) => (candidate?.ids === key ? candidate : null);
  const drag = live(state);

  const to = drag ? dropIndex(drag.middles, drag.from, drag.middles[drag.from]! + drag.dy) : -1;
  const cancel = (event: PointerEvent<HTMLElement>) => {
    if (current.current?.pointerId === event.pointerId) update(null);
  };

  return {
    dragging: drag !== null,

    /** Pointer handlers for the drag handle of the row with this id at this index. */
    handleProps(id: string, index: number) {
      return {
        onPointerDown(event: PointerEvent<HTMLElement>) {
          if (live(current.current) || event.button !== 0 || !listRef.current) return;
          const rects = Array.from(listRef.current.children).map((row) =>
            row.getBoundingClientRect(),
          );
          const own = rects[index];
          if (!own) return;
          const next = rects[index + 1];
          const previous = rects[index - 1];
          const gap = next ? next.top - own.bottom : previous ? own.top - previous.bottom : 0;
          // Keep the pointer on the handle, also when the finger leaves it.
          event.currentTarget.setPointerCapture(event.pointerId);
          update({
            pointerId: event.pointerId,
            id,
            from: index,
            ids: key,
            startY: event.clientY,
            dy: 0,
            middles: rects.map((rect) => rect.top + rect.height / 2),
            room: own.height + gap,
          });
        },
        onPointerMove(event: PointerEvent<HTMLElement>) {
          const active = live(current.current);
          if (active?.pointerId !== event.pointerId) return;
          update({ ...active, dy: event.clientY - active.startY });
        },
        onPointerUp(event: PointerEvent<HTMLElement>) {
          if (current.current?.pointerId !== event.pointerId) return;
          const active = live(current.current);
          update(null);
          if (!active) return;
          const middle = active.middles[active.from]! + event.clientY - active.startY;
          const target = dropIndex(active.middles, active.from, middle);
          if (target !== active.from) onDrop(active.id, target);
        },
        onPointerCancel: cancel,
        // E.g. the handle left the page: without this the drag would never end.
        onLostPointerCapture: cancel,
      };
    },

    /** Whether this row is the one being dragged. */
    isDragged: (index: number) => drag?.from === index,

    /** Moves the dragged row with the finger, and the rows it passed out of its way. */
    rowStyle(index: number): CSSProperties | undefined {
      if (!drag) return undefined;
      let y = 0;
      if (index === drag.from) y = drag.dy;
      else if (drag.from < index && index <= to) y = -drag.room;
      else if (to <= index && index < drag.from) y = drag.room;
      return y === 0 ? undefined : { transform: `translateY(${y}px)` };
    },
  };
}
