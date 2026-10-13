import { Link, useLocation } from 'react-router';
import styles from './TopBar.module.css';

/** Router state for the Quick Access screen: the path of the screen that opened it. */
export type QuickAccessState = { quickFrom: string };

type Props = {
  /**
   * The back control on the left: a link (e.g. to the campaign list or the combat's scene),
   * or a button for screens that go back in history, like a description (D11).
   */
  back: { to: string } | { onClick: () => void };
  /** Text of the back control, after the ‹. */
  backLabel: string;
  /** The campaign whose Quick Access the button on the right opens. */
  campaignId: string;
};

/**
 * Top of every screen inside a campaign: the back control on the left, the Quick Access
 * button on the right (DC-020, decision D22). Opening Quick Access adds a history entry, so
 * the phone's Back closes it again (D23). It is told which screen opened it, so an item that
 * leads back to that screen can simply close Quick Access.
 */
export default function TopBar({ back, backLabel, campaignId }: Props) {
  const { pathname } = useLocation();
  const label = `‹ ${backLabel}`;
  return (
    <div className={styles.bar}>
      {'to' in back ? (
        <Link to={back.to} className={styles.back}>
          {label}
        </Link>
      ) : (
        <button type="button" className={styles.back} onClick={back.onClick}>
          {label}
        </button>
      )}
      <Link
        to={`/c/${campaignId}/quick`}
        state={{ quickFrom: pathname } satisfies QuickAccessState}
        className={styles.quick}
      >
        Quick
      </Link>
    </div>
  );
}
