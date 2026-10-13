import { Link } from 'react-router';
import styles from './ListRow.module.css';

type Props = {
  title: string;
  /** Second line, muted; cut off after one line. */
  detail: string;
} & (
  | { to: string; replace?: boolean; onClick?: never; disabled?: never }
  | { onClick: () => void; to?: never; disabled?: never }
  /** Shown in its place but not tappable, e.g. Combat without an active combat (D27). */
  | { disabled: true; to?: never; onClick?: never }
);

/** A large, one-tap row with a title, a detail line and a ›: Quick Access items and lists. */
export default function ListRow(props: Props) {
  const content = (
    <>
      <span className={styles.text}>
        <span className={styles.title}>{props.title}</span>
        <span className={styles.detail}>{props.detail}</span>
      </span>
      <span className={styles.chevron} aria-hidden="true">
        ›
      </span>
    </>
  );
  if (props.to !== undefined) {
    return (
      <Link to={props.to} replace={props.replace} className={styles.row}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={styles.row} disabled={props.disabled} onClick={props.onClick}>
      {content}
    </button>
  );
}
