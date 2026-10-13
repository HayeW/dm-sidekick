import { useNavigate } from 'react-router';

/** Stands in for the browser's / phone's back button. */
export default function BrowserBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Browser back
    </button>
  );
}
