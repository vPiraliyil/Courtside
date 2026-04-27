import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/Navbar';

function StatusBadge({ status }) {
  const styles = {
    live:      'bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40',
    scheduled: 'bg-white/10 text-white/60 border border-white/20',
    finished:  'bg-white/5 text-white/40 border border-white/10',
  };
  const labels = { live: 'Live', scheduled: 'Scheduled', finished: 'Final' };
  return (
    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ${styles[status] || styles.scheduled}`}>
      {labels[status] || status}
    </span>
  );
}

function GameCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-5 w-24 bg-white/10 rounded" />
          <div className="h-3 w-3 bg-white/10 rounded" />
          <div className="h-5 w-24 bg-white/10 rounded" />
        </div>
        <div className="h-5 w-16 bg-white/10 rounded-full flex-shrink-0" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-4 w-16 bg-white/10 rounded" />
        <div className="h-7 w-24 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}

function RoomCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 w-32 bg-white/10 rounded" />
        <div className="h-5 w-16 bg-white/10 rounded-full flex-shrink-0" />
      </div>
      <div className="mt-2 h-4 w-48 bg-white/10 rounded" />
    </div>
  );
}

function formatTime(startsAt) {
  return new Date(startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CreateRoomModal({ game, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { data } = await api.post('/rooms', { gameId: game.id, name: name.trim() });
      onCreated(data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room');
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1629] border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-1">Create a Room</h3>
        <p className="text-white/40 text-sm mb-6">
          {game.away_team} @ {game.home_team}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-white/60 mb-2" htmlFor="room-name">Room name</label>
            <input
              id="room-name"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Night Picks"
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60 focus:border-[#00ff87]/50 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/10 text-white py-2 rounded-lg hover:bg-white/15 active:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="flex-1 bg-[#00ff87] text-[#0a0f1e] font-semibold py-2 rounded-lg hover:bg-[#00e87a] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState(null);
  const [myRooms, setMyRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [modalGame, setModalGame] = useState(null);

  useEffect(() => {
    document.title = 'Courtside — Dashboard';
  }, []);

  useEffect(() => {
    api.get('/games')
      .then((res) => setGames(res.data))
      .catch(() => setGamesError("Couldn't load today's games. Try again in a moment."))
      .finally(() => setGamesLoading(false));

    api.get('/rooms/my')
      .then((res) => setMyRooms(res.data))
      .catch(() => setRoomsError("Couldn't load your rooms."))
      .finally(() => setRoomsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-10">

        {/* My Rooms */}
        {(roomsLoading || roomsError || myRooms.length > 0) && (
          <section>
            <h2 className="text-2xl font-bold mb-4">My Rooms</h2>
            {roomsLoading && (
              <div className="flex flex-col gap-3">
                {[1, 2].map((i) => <RoomCardSkeleton key={i} />)}
              </div>
            )}
            {roomsError && !roomsLoading && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                {roomsError}
              </div>
            )}
            {!roomsLoading && !roomsError && (
              <div className="flex flex-col gap-3">
                {myRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/[0.08] active:bg-white/10 transition-colors w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold truncate">{room.name}</span>
                      <StatusBadge status={room.game_status} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-sm text-white/40 truncate">
                      <span className="truncate">{room.away_team} @ {room.home_team}</span>
                      <span>·</span>
                      <span className="whitespace-nowrap">{room.member_count} {room.member_count === 1 ? 'member' : 'members'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Today's Games */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Today's Games</h2>

          {gamesLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => <GameCardSkeleton key={i} />)}
            </div>
          )}

          {gamesError && !gamesLoading && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {gamesError}
            </div>
          )}

          {!gamesLoading && !gamesError && games.length === 0 && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center text-white/50">
              <span className="text-5xl mb-4" aria-hidden>🏀</span>
              <p className="text-lg font-medium text-white">No NBA games scheduled today.</p>
              <p className="text-sm mt-1 text-white/40">Check back tomorrow.</p>
            </div>
          )}

          {!gamesLoading && !gamesError && games.length > 0 && (
            <div className="flex flex-col gap-3">
              {games.map((game) => (
                <div key={game.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <span className="font-semibold truncate">{game.away_team}</span>
                      <span className="text-white/40 text-sm">@</span>
                      <span className="font-semibold truncate">{game.home_team}</span>
                      {game.status !== 'scheduled' && (
                        <span className="text-white/60 text-sm font-mono whitespace-nowrap">
                          {game.away_score} – {game.home_score}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={game.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-white/40 text-sm">
                      {game.status === 'scheduled' ? formatTime(game.starts_at) : ' '}
                    </span>
                    {game.status === 'scheduled' && (
                      <button
                        onClick={() => setModalGame(game)}
                        className="bg-[#00ff87] text-[#0a0f1e] text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#00e87a] active:scale-[0.97] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87]/60"
                      >
                        Create Room
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {modalGame && (
        <CreateRoomModal
          game={modalGame}
          onClose={() => setModalGame(null)}
          onCreated={(roomId) => {
            api.get('/rooms/my').then((res) => setMyRooms(res.data));
            navigate(`/rooms/${roomId}`);
          }}
        />
      )}
    </div>
  );
}
