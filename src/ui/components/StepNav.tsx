import { Link } from 'react-router';
import styles from './StepNav.module.css';

type Props = {
  /** Accessible name of the bar, e.g. "Scenes". */
  label: string;
  /** URL of the previous item; undefined disables the button. */
  previousTo: string | undefined;
  /** URL of the next item; undefined disables the button. */
  nextTo: string | undefined;
  /**
   * Replace the history entry instead of adding one. Descriptions replace (D11), so Back
   * returns to the scene in one tap; scenes add entries, so back goes scene by scene (D12).
   */
  replace: boolean;
  /** Router state to carry along to the previous/next item. */
  state?: unknown;
};

/** Fixed bottom bar with ◀ Previous / Next ▶ in thumb reach (DC-015, DC-016, D11). */
export default function StepNav({ label, previousTo, nextTo, replace, state }: Props) {
  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <nav className={styles.bar} aria-label={label}>
        <div className={styles.inner}>
          <Step to={previousTo} replace={replace} state={state}>
            ◀ Previous
          </Step>
          <Step to={nextTo} replace={replace} state={state}>
            Next ▶
          </Step>
        </div>
      </nav>
    </>
  );
}

type StepProps = {
  to: string | undefined;
  replace: boolean;
  state: unknown;
  children: string;
};

/** A link when there is somewhere to go, otherwise a disabled button (D9). */
function Step({ to, replace, state, children }: StepProps) {
  if (!to) {
    return (
      <button type="button" className={styles.step} disabled>
        {children}
      </button>
    );
  }
  return (
    <Link to={to} replace={replace} state={state} className={styles.step}>
      {children}
    </Link>
  );
}
