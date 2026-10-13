import { useLocation, useNavigate } from 'react-router';

/** Marks a fallback entry: it replaced a directly opened screen, so it is the first one too. */
type BackState = { openedDirectly?: boolean };

/**
 * Back for screens reached from somewhere in the app (Quick Access and the screens it leads
 * to): the same as the phone's Back. Opened directly (a link in a new tab), there is nothing
 * to go back to, so it replaces this screen with `fallbackTo` instead of leaving the app.
 * That fallback is still the first entry, so its own back falls back again.
 */
export function useBack(fallbackTo: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const openedDirectly =
    location.key === 'default' || (location.state as BackState | null)?.openedDirectly === true;
  return {
    openedDirectly,
    back() {
      if (openedDirectly) {
        navigate(fallbackTo, {
          replace: true,
          state: { openedDirectly: true } satisfies BackState,
        });
      } else navigate(-1);
    },
  };
}
