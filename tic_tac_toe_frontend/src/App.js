import React, { useState, useEffect } from 'react';
import './App.css';

// -- API endpoint base (configure this as appropriate for backend) --
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

// Helper: fetch with JSON body and error handling
const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'API Error');
  }
  return await response.json();
};

// ------ UI Components ------

/**
 * GameBoard
 * Renders the Tic Tac Toe 3x3 grid and handles move clicks.
 */
function GameBoard({ board, disabled, onPlay, highlight }) {
  return (
    <div className="ttt-board">
      {board.map((cell, idx) => (
        <button
          key={idx}
          className={`ttt-cell ${
            highlight && highlight.includes(idx) ? 'ttt-highlight' : ''
          }`}
          disabled={disabled || !!cell}
          onClick={() => onPlay && onPlay(idx)}
          aria-label={`Play at position ${idx + 1} (${cell || 'empty'})`}
        >
          {cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
        </button>
      ))}
    </div>
  );
}

/**
 * GameResult
 * Shows animated result (win/draw) and replay button.
 */
function GameResult({ result, winner, onReplay, winLine }) {
  if (!result) return null;
  return (
    <div className="result-overlay">
      <div className="result-card">
        {result === 'draw' ? (
          <>
            <span className="result-text">🤝 Draw!</span>
          </>
        ) : (
          <>
            <span className="result-text animate-pop">
              {winner === 'X' ? '❌' : '⭕'} Wins!
            </span>
            {winLine && (
              <div className="winline-announce">
                Winning line: {winLine.map((i) => i + 1).join(', ')}
              </div>
            )}
          </>
        )}
        <button className="btn btn-large" onClick={onReplay}>New Game</button>
      </div>
    </div>
  );
}

/**
 * MatchHistory
 * Shows player's past games, clickable to view each.
 */
function MatchHistory({ history, currentGameId, onSelectGame }) {
  return (
    <aside className="history-sidebar">
      <h3>Match History</h3>
      {history.length === 0 ? (
        <div>No history yet</div>
      ) : (
        <ul className="history-list">
          {history.map((game) => (
            <li key={game.id}>
              <button
                className={`history-item${game.id === currentGameId ? ' selected' : ''}`}
                onClick={() => onSelectGame(game.id)}
              >
                Game #{game.id} — 
                {game.winner 
                  ? (game.winner === 'draw' ? 'Draw' : `Winner: ${game.winner}`) 
                  : 'In progress'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

/**
 * AuthForm
 * Displays login/signup UI.
 */
function AuthForm({ onAuth, error, loading }) {
  const [username, setUsername] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username) onAuth(username.trim(), isSignup);
  };

  return (
    <div className="auth-form">
      <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          className="auth-input"
          placeholder="Username"
          value={username}
          autoFocus
          onChange={e => setUsername(e.target.value)}
          disabled={loading}
        />
        <button className="btn btn-large" type="submit" disabled={loading || !username}>
          {isSignup ? 'Create Account' : 'Login'}
        </button>
      </form>
      <button className="btn-link" onClick={() => setIsSignup(x => !x)} disabled={loading}>
        {isSignup ? 'Already have an account? Login' : 'Need an account? Sign Up'}
      </button>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}

// ------ Main App ------

// Initial board state (9 cells)
const emptyBoard = Array(9).fill(null);
// All possible win lines (as board cell indexes)
const WIN_LINES = [
  [0,1,2], [3,4,5], [6,7,8], // rows
  [0,3,6], [1,4,7], [2,5,8], // cols
  [0,4,8], [2,4,6],          // diag
];

// --- App Root ---
function App() {
  // ---- State ----
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);      // { id, username }
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [gameId, setGameId] = useState(null);
  const [game, setGame] = useState(null);  // {id, board, next, winner, ...}
  const [playing, setPlaying] = useState(false);
  const [board, setBoard] = useState([...emptyBoard]);
  const [winLine, setWinLine] = useState(null);

  const [fetching, setFetching] = useState(false);
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState(null); // 'X' | 'O' | 'draw'
  const [history, setHistory] = useState([]);

  // ---- Effects ----

  // Theme toggle effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On mount: try to load user (from localStorage)
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('ttt-user'));
    if (u) setUser(u);
  }, []);

  // On login: fetch history
  useEffect(() => {
    if (user) fetchMatchHistory();
  }, [user]);

  // On gameId load: fetch game state
  useEffect(() => {
    if (gameId) fetchGame(gameId);
  }, [gameId]);

  // --- API helpers ---

  // Authenticate (fake for demo; adapt for real backend!)
  const handleAuth = async (username, signup = false) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      // For demo, backend must expose /users/login and /users/signup
      // We'll just simulate user w/ username mapped to id=hash(username).
      let route = signup ? '/users/signup' : '/users/login';
      let res;
      try {
        res = await apiFetch(`${API_BASE}${route}`, {
          method: 'POST',
          body: JSON.stringify({ username }),
        });
      } catch {
        // If backend doesn't support auth, just use username as id
        res = { id: username, username };
      }
      setUser(res);
      localStorage.setItem('ttt-user', JSON.stringify(res));
    } catch (e) {
      setAuthError(e.message || 'Auth error');
    }
    setAuthLoading(false);
  };

  // Start a new game
  const startNewGame = async () => {
    setMsg('Creating game...');
    setFetching(true);
    try {
      // POST /games w/ user as player_x
      const res = await apiFetch(`${API_BASE}/games`, {
        method: 'POST',
        body: JSON.stringify({ player: user?.id || user?.username }),
      });
      setGameId(res.id);
      setBoard(res.state && Array.isArray(res.state) ? res.state : [...emptyBoard]);
      setPlaying(true);
      setResult(null);
      setWinLine(null);
    } catch (e) {
      setMsg('Failed to create game: ' + e.message);
    }
    setFetching(false);
  };

  // Join/resume an existing game
  const joinGame = async (id) => {
    setMsg('Joining game...');
    setFetching(true);
    try {
      const res = await apiFetch(`${API_BASE}/games/${id}`);
      setGameId(res.id);
      setBoard(res.state && Array.isArray(res.state) ? res.state : [...emptyBoard]);
      setGame(res);
      setPlaying(true);
      setResult(null);
      setWinLine(null);
    } catch (e) {
      setMsg('Could not join: ' + e.message);
    }
    setFetching(false);
  };

  // Make move: POST /games/{game_id}/move
  const playMove = async (cellIdx) => {
    if (!gameId || !user) return;
    setMsg('');
    setFetching(true);
    try {
      const res = await apiFetch(`${API_BASE}/games/${gameId}/move`, {
        method: 'POST',
        body: JSON.stringify({ player: user?.id || user?.username, move_index: cellIdx }),
      });
      setBoard(res.state && Array.isArray(res.state) ? res.state : [...emptyBoard]);
      setGame(res);
      if (res.winner) {
        setResult(res.winner === 'draw' ? 'draw' : res.winner);
        setWinLine(res.win_line || getWinLine(res.state));
        setPlaying(false);
      }
    } catch (e) {
      setMsg('Move failed: ' + e.message);
    }
    setFetching(false);
  };

  // Fetch game state (GET /games/{id})
  const fetchGame = async (id) => {
    setMsg('Loading game...');
    setFetching(true);
    try {
      const res = await apiFetch(`${API_BASE}/games/${id}`);
      setGame(res);
      setBoard(res.state && Array.isArray(res.state) ? res.state : [...emptyBoard]);
      setResult(res.winner ? (res.winner === 'draw' ? 'draw' : res.winner) : null);
      setWinLine(res.win_line || getWinLine(res.state));
      setPlaying(!res.winner);
    } catch (e) {
      setMsg('Load failed: ' + e.message);
    }
    setFetching(false);
  };

  // Fetch match history (GET /users/{user_id}/games)
  const fetchMatchHistory = async () => {
    setMsg('Loading match history...');
    try {
      // For demo: assume id is username if id not found
      const userId = user?.id || user?.username;
      const res = await apiFetch(`${API_BASE}/users/${userId}/games`);
      setHistory(res.games || res || []);
    } catch (e) {
      setMsg('Failed to load history: ' + e.message);
      setHistory([]);
    }
  };

  // Helpers for win/draw
  function getWinLine(board) {
    for (let line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return [a, b, c];
      }
    }
    return null;
  }

  function currentTurnVal() {
    if (!game) return '';
    return game.next === 'X'
      ? '❌ (X)'
      : game.next === 'O'
      ? '⭕ (O)'
      : '';
  }

  // -- Navigation: for simplicity we use state; add react-router as needed --

  if (!user) {
    return (
      <div className="App">
        <header className="App-header">
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <h1>Tic Tac Toe Online</h1>
          <div className="subtitle">Sign up or log in to play</div>
          <AuthForm onAuth={handleAuth} error={authError} loading={authLoading} />
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <div className="navbar">
          <div className="title">Tic Tac Toe Online</div>
          <div className="user-info">
            Logged in as <b>{user.username}</b>
            <button
              className="btn btn-small"
              onClick={() => {
                setUser(null);
                localStorage.removeItem('ttt-user');
              }}
              style={{marginLeft: 12}}
            >Logout</button>
          </div>
        </div>
      </header>
      <div className="container">
        {/* Match history sidebar */}
        <MatchHistory
          history={history}
          currentGameId={gameId}
          onSelectGame={joinGame}
        />

        {/* Main game section */}
        <main className="main-game">
          <div className="game-header">
            <span className="game-label">
              {gameId ? `Game #${gameId}` : 'Start a new game'}
            </span>
            <button className="btn btn-large" onClick={startNewGame} disabled={fetching}>
              + New Game
            </button>
          </div>
          <div className="game-state-ui">
            {/* Board */}
            <GameBoard
              board={board}
              disabled={!playing || fetching || !!result}
              onPlay={playing ? playMove : null}
              highlight={winLine}
            />
            <div className="game-info">
              {msg && <div className="game-message">{msg}</div>}
              <div>
                {result ? (
                  <>
                    <span className="status-icon">{result === 'draw' ? '🤝' : result === 'X' ? '❌' : '⭕'}</span>
                  </>
                ) : game ? (
                  !game.winner && playing && <span>Next: {currentTurnVal()}</span>
                ) : null}
              </div>
              {game && (
                <div>
                  {game.winner
                    ? (game.winner === 'draw'
                        ? <span>Result: 🤝 Draw</span>
                        : <span>Winner: {game.winner === 'X' ? '❌ (X)' : '⭕ (O)'}</span>)
                    : (
                      <span>
                        {
                          playing
                            ? (game.next === (user?.mark || 'X')
                                ? 'Your turn!'
                                : 'Waiting...')
                            : ''
                        }
                      </span>
                    )}
                </div>
              )}
            </div>
          </div>
          {/* Result overlay */}
          <GameResult
            result={result}
            winner={result !== 'draw' ? result : null}
            winLine={winLine}
            onReplay={startNewGame}
          />
        </main>
      </div>
      <footer className="footer">
        <span>
          &copy; {new Date().getFullYear()} - Online Tic Tac Toe &middot;{' '}
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="App-link"
          >Source</a>
        </span>
      </footer>
    </div>
  );
}

export default App;

// ---------------------
//      CSS (App.css)
// ---------------------
// Please ensure the following styles are appended to online-tic-tac-toe-78b5a1d1/tic_tac_toe_frontend/src/App.css:
//
// /* Tic Tac Toe additions */
// .ttt-board {
//   display: grid;
//   grid-template-columns: repeat(3, 64px);
//   grid-gap: 8px;
//   background: var(--bg-secondary);
//   padding: 16px;
//   border-radius: 16px;
//   box-shadow: 0 3px 11px rgba(0,0,0,0.12);
//   margin: 0 auto;
// }
// .ttt-cell {
//   width: 64px;
//   height: 64px;
//   font-size: 2rem;
//   background: var(--bg-primary);
//   border: 2px solid var(--border-color);
//   border-radius: 10px;
//   cursor: pointer;
//   transition: background 0.2s, transform 0.08s;
// }
// .ttt-cell:disabled {
//   opacity: 0.7;
//   cursor: not-allowed;
// }
// .ttt-cell.ttt-highlight {
//   background-color: #E6FAF2;
//   border-color: #16b37b;
//   font-weight: 600;
//   animation: tttpop 0.2s;
// }
// @keyframes tttpop { from { transform: scale(1); } to { transform: scale(1.08);} }
// .winline-announce { font-size: 0.86em; color: #16b37b; margin-top: 10px; }
// .result-overlay {
//   position: absolute;
//   left: 0; top: 0; width: 100%; height: 100%;
//   background: rgba(30,30,30,0.78);
//   color: #fff;
//   z-index: 20;
//   display: flex; align-items: center; justify-content: center;
// }
// .result-card {
//   background: #222;
//   border-radius: 18px;
//   padding: 38px 28px;
//   min-width: 280px;
//   display: flex; flex-direction: column; align-items: center;
//   box-shadow: 0 7px 18px rgba(0,0,0,0.26);
// }
// .result-text { font-size: 2.1rem; margin-bottom: 16px; font-weight: 700; }
// .animate-pop { animation: tttpop 0.3s; }
// .history-sidebar {
//   min-width: 180px; padding: 18px 8px 18px 24px;
//   background: var(--bg-secondary);
//   border-radius: 10px; margin-right: 18px;
//   box-shadow: 0 1px 5px rgba(0,0,0,0.06);
//   max-height: 340px; overflow-y: auto;
// }
// .history-list { list-style: none; padding: 0; margin: 0; }
// .history-item {
//   display: block; width: 100%;
//   background: none; border: none;
//   padding: 7px 12px; margin: 2px 0; text-align: left; font-size: 1em;
//   cursor: pointer; border-radius: 6px;
//   transition: background 0.17s;
// }
// .history-item.selected, .history-item:hover {
//   background: #ecf7ff; color: #1976d2;
// }
// .main-game { position: relative; }
// .game-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
// .game-label { font-size: 1.2em; }
// .game-info { margin-top: 16px; min-height: 44px; }
// .btn, .btn-large {
//   background: var(--button-bg); color: var(--button-text);
//   border: none; border-radius: 8px; padding: 8px 18px; margin-top: 10px;
//   font-weight: 600; cursor: pointer; font-size: 1em; transition: background 0.2s; 
// }
// .btn-large { font-size: 1.16em; padding: 11px 22px; }
// .btn-small { padding: 7px 11px; font-size: 0.99em; }
// .btn:hover { background: #1976d2; }
// .btn-link { background: none; border: none; color: var(--text-secondary); cursor: pointer; margin: 12px 0 0 0; }
// .footer { padding: 20px 0; margin-top: 24px; color: var(--text-secondary); font-size: 0.96em; }
// .auth-form { background: var(--bg-secondary); border-radius: 16px; padding: 28px 22px; max-width: 320px; margin: 0 auto; box-shadow: 0 1px 8px rgba(0,0,0,0.05); }
// .auth-input { font-size: 1em; padding: 8px 13px; border-radius: 7px; border: 1px solid #cfd7de; margin-bottom: 10px; width: 90%; }
// .auth-error { color: #f50057; font-size: 1em; margin-top: 8px; }
// .navbar { display: flex; width: 100vw; justify-content: space-between; align-items: center; background: none; margin-bottom: 20px; }
// .title { font-weight: 900; font-size: 2.22em; letter-spacing: -2px; color: #444; }
// .user-info { font-size: 1.05em; color: #1976d2; display: flex; align-items: center; }
// .container { display: flex; justify-content: flex-start; padding: 10px 0; align-items: flex-start; }
// .game-state-ui { display: flex; flex-direction: column; align-items: center; position: relative; }

// /* Responsive */
// @media (max-width: 800px) {
//   .container { flex-direction: column; padding: 0; }
//   .history-sidebar { min-width: unset; max-width: 99vw; margin-bottom: 16px; margin-right: 0; }
//   .main-game { width: 100%; }
// }
// @media (max-width: 500px) {
//   .main-game, .game-header, .ttt-board { font-size: 2vw; }
//   .title { font-size: 1.5em; }
// }
