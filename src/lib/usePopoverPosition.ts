import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

interface PopoverPosition {
  top: number;
  left: number;
  direction: 'up' | 'down';
}

interface UsePopoverPositionProps<T extends HTMLElement = HTMLElement> {
  anchorRef: RefObject<T>;
  isOpen: boolean;
  popoverHeight?: number;
  gapPx?: number;
}

export function usePopoverPosition<T extends HTMLElement = HTMLElement>({
  anchorRef,
  isOpen,
  popoverHeight = 200,
  gapPx = 8,
}: UsePopoverPositionProps<T>): PopoverPosition | null {
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      if (!anchorRef.current) return;

      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Space available above and below
      const spaceBelow = viewportHeight - (rect.bottom + gapPx);
      const spaceAbove = rect.top - gapPx;

      // Decide direction: prefer down if space available, otherwise up
      const shouldOpenUp = spaceBelow < popoverHeight && spaceAbove >= popoverHeight;
      const direction: 'up' | 'down' = shouldOpenUp ? 'up' : 'down';

      // Calculate top position (for fixed positioning, use viewport coordinates)
      const top =
        direction === 'down'
          ? rect.bottom + gapPx
          : rect.top - popoverHeight - gapPx;

      // Calculate left position (right-aligned to anchor, with screen boundary clamp)
      let left = rect.right - 160; // Assume ~160px popover width, right-aligned to button
      const viewportWidth = window.innerWidth;
      const minLeft = 8; // Minimum margin from left edge
      const maxLeft = viewportWidth - 168; // 160 + 8px margin on right

      left = Math.max(minLeft, Math.min(left, maxLeft));

      setPosition({ top, left, direction });
    };

    updatePosition();

    // Recalculate on scroll/resize
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, anchorRef, popoverHeight, gapPx]);

  return position;
}
