import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router';

/**
 * A newly opened screen starts at the top. Without this, the browser keeps the scroll
 * position, so after Next on a long text the new title would be off-screen.
 * Going back (POP) is left alone, so the DM returns to where they were.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // Layout effect: runs before the screen is painted, so the old position never flashes.
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return null;
}
