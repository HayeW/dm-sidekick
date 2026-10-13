import { Link } from 'react-router';
import styles from './TopBar.module.css';

type Props = {
  /** Where the back link on the left goes, e.g. the campaign list or the combat's scene. */
  backTo: string;
  /** Text of the back link, after the ‹. */
  backLabel: string;
  /** The campaign whose Quick Access the button on the right opens. */
  campaignId: string;
};

/**
 * Top of every screen inside a campaign: the back link on the left, the Quick Access button
 * on the right (DC-020, decision D22). Opening Quick Access adds a history entry, so the
 * phone's Back closes it again (D23).
 */
export default function TopBar({ backTo, backLabel, campaignId }: Props) {
  return (
    <div className={styles.bar}>
      <Link to={backTo} className={styles.back}>
        ‹ {backLabel}
      </Link>
      <Link to={`/c/${campaignId}/quick`} className={styles.quick}>
        Quick
      </Link>
    </div>
  );
}
