import { useEffect, useState, type FormEvent } from 'react';

interface Props {
  loading: boolean;
  /** true after a failed token-less attempt — opens the token section */
  suggestToken: boolean;
  onSubmit: (username: string, token: string) => void;
}

export function SearchBar({ loading, suggestToken, onSubmit }: Props) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (suggestToken) setOpen(true);
  }, [suggestToken]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim()) {
      setHint('Type a GitHub username first.');
      return;
    }
    setHint(null);
    onSubmit(username, token.trim());
  };

  return (
    <form className="search" onSubmit={handleSubmit}>
      <div className="search-row">
        <input
          className="search-input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="github username"
          aria-label="GitHub username"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Painting…' : 'Generate'}
        </button>
      </div>
      {hint && <p className="field-hint">{hint}</p>}

      <details
        className="token-details"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary>
          Add a token for exact data <span className="summary-hint">optional</span>
        </summary>
        <div className="token-body">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_…"
            aria-label="GitHub personal access token"
            autoComplete="off"
            spellCheck={false}
          />
          <p>
            A{' '}
            <a href="https://github.com/settings/tokens/new?description=commit-scape" target="_blank" rel="noreferrer">
              classic token with no scopes
            </a>{' '}
            is enough to read public contributions. It is only ever sent to{' '}
            <code>api.github.com</code> from this tab — never stored, never proxied. Without a
            token, commit-scape reads your public calendar through third-party mirrors, which can
            be slow or rate-limited.
          </p>
        </div>
      </details>
    </form>
  );
}
