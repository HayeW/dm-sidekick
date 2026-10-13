import { Link } from 'react-router';
import { useBack } from '../useBack';
import ListRow from './ListRow';
import TopBar from './TopBar';
import styles from './EntityScreens.module.css';

// The list and detail screens for campaign NPCs, locations and notes (DC-021, D24, D25).
// They are reached from Quick Access or a scene tile, so their back goes back in history.

type ListProps = {
  campaignId: string;
  heading: string;
  items: { id: string; title: string; detail: string; to: string }[];
  /** Shown when the campaign has none, e.g. "No NPCs in this campaign yet." */
  empty: string;
};

/** A campaign's NPCs, locations or notes, in campaign order; one tap opens one. */
export function EntityList({ campaignId, heading, items, empty }: ListProps) {
  // Opened directly, back goes to the campaign, which shows the current scene (DC-003).
  const { back } = useBack(`/c/${campaignId}`);
  return (
    <main className="page">
      <TopBar back={{ onClick: back }} backLabel="Back" campaignId={campaignId} />
      <h1>{heading}</h1>
      {items.length === 0 ? (
        <p className={styles.empty}>{empty}</p>
      ) : (
        <ul className={styles.items} aria-label={heading}>
          {items.map((item) => (
            <li key={item.id}>
              <ListRow to={item.to} title={item.title} detail={item.detail} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

type DetailProps = {
  campaignId: string;
  heading: string;
  text: string;
  /** Where back goes when the screen was opened directly: its list. */
  fallbackTo: string;
};

/** One NPC, location or note: its name and full text, readable at arm's length. */
export function EntityDetail({ campaignId, heading, text, fallbackTo }: DetailProps) {
  const { back } = useBack(fallbackTo);
  return (
    <main className="page">
      <TopBar back={{ onClick: back }} backLabel="Back" campaignId={campaignId} />
      <h1>{heading}</h1>
      <p className={styles.text}>{text}</p>
    </main>
  );
}

/** For an unknown campaign or entity: what was not found, and a way out. */
export function EntityNotFound({
  heading,
  to,
  label,
}: {
  heading: string;
  to: string;
  label: string;
}) {
  return (
    <main className="page">
      <h1>{heading}</h1>
      <Link to={to}>{label}</Link>
    </main>
  );
}
