import { useState, type FormEvent } from 'react';

interface Props {
  loading: boolean;
  onSubmit: (username: string, token: string) => void;
}

export function SearchBar({ loading, onSubmit }: Props) {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (username.trim()) onSubmit(username, token.trim());
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
        <button className="btn-primary" type="submit" disabled={loading || !username.trim()}>
          {loading ? 'Painting…' : 'Generate'}
        </button>
      </div>

      <details className="token-details">
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
            token, commit-scape scrapes your public profile page through a third-party CORS proxy,
            which is approximate and can break.
          </p>
        </div>
      </details>
    </form>
  );
}
