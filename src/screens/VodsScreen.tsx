import React, { useState, useEffect, useCallback } from 'react';
import { Play, Star, Film, Tv, Clock } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { VodMovie, VodSeries } from '../types/dispatcharr';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SearchField, LoadingBox, EmptyBox } from '../components/common/FormControls';

export const VodsScreen: React.FC = () => {
  const { vodMoviesEnabled, vodSeriesEnabled, openPlayer } = useSession();
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>(vodMoviesEnabled ? 'movies' : 'series');

  const [movies, setMovies] = useState<VodMovie[]>([]);
  const [series, setSeries] = useState<VodSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selectedMovie, setSelectedMovie] = useState<VodMovie | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<VodSeries | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? { search } : undefined;
      if (activeTab === 'movies') {
        const data = await api.get('/api/vod/movies/', q);
        setMovies(Array.isArray(data) ? data : []);
      } else {
        const data = await api.get('/api/vod/series/', q);
        setSeries(Array.isArray(data) ? data : []);
      }
    } catch {
      if (activeTab === 'movies') setMovies([]);
      else setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">VOD Library</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeTab === 'movies' ? 'On-demand movies with metadata and artwork' : 'TV series seasons & episodes on demand'}
          </p>
        </div>

        <div className="flex items-center bg-zinc-800 p-1 rounded-lg border border-zinc-700">
          {vodMoviesEnabled && (
            <button
              onClick={() => setActiveTab('movies')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'movies' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Movies
            </button>
          )}
          {vodSeriesEnabled && (
            <button
              onClick={() => setActiveTab('series')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'series' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              TV Series
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={activeTab === 'movies' ? 'Search movies by title...' : 'Search TV series...'}
        className="max-w-md"
      />

      {/* Grid */}
      {loading ? (
        <LoadingBox message="Loading VOD catalog..." />
      ) : activeTab === 'movies' ? (
        movies.length === 0 ? (
          <EmptyBox message="No movies found" submessage="Sync VOD content from Xtream Codes playlists in M3U & EPG Manager." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map((m) => {
              const title = m.title || m.name || 'Movie';
              const poster = m.poster_path || m.cover || m.logo_url;
              const rating = m.rating || m.vote_average;

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMovie(m)}
                  className="group relative flex flex-col bg-zinc-800 border border-zinc-700/70 hover:border-teal-500/50 rounded-xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1 shadow-md"
                >
                  <div className="aspect-[2/3] w-full bg-zinc-900 relative overflow-hidden">
                    {poster ? (
                      <img src={poster} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Film className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <button className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg">
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Play
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <h4 className="font-semibold text-xs text-zinc-100 truncate">{title}</h4>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                      <span>{m.year || m.release_date?.slice(0, 4) || '—'}</span>
                      {rating && rating > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 font-medium">
                          <Star className="w-3 h-3 fill-current" />
                          {rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Series Grid */
        series.length === 0 ? (
          <EmptyBox message="No TV series found" submessage="Sync series catalog from Xtream accounts in M3U & EPG Manager." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {series.map((s) => {
              const title = s.title || s.name || 'Series';
              const poster = s.poster_path || s.cover;
              const rating = s.rating;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSeries(s)}
                  className="group relative flex flex-col bg-zinc-800 border border-zinc-700/70 hover:border-teal-500/50 rounded-xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1 shadow-md"
                >
                  <div className="aspect-[2/3] w-full bg-zinc-900 relative overflow-hidden">
                    {poster ? (
                      <img src={poster} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Tv className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h4 className="font-semibold text-xs text-zinc-100 truncate">{title}</h4>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                      <span>{s.year || s.release_date?.slice(0, 4) || '—'}</span>
                      {s.seasons_count && (
                        <span className="text-teal-400">{s.seasons_count} season{s.seasons_count === 1 ? '' : 's'}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Movie Details Modal */}
      {selectedMovie && (
        <Modal
          isOpen={!!selectedMovie}
          onClose={() => setSelectedMovie(null)}
          title={selectedMovie.title || selectedMovie.name || 'Movie'}
          maxWidth="md"
          actions={
            <button
              onClick={() => {
                const streamUrl = selectedMovie.stream_url || `/proxy/vod/stream/${selectedMovie.id}`;
                openPlayer(streamUrl, selectedMovie.title || 'Movie', false);
                setSelectedMovie(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Play Movie
            </button>
          }
        >
          <div className="flex gap-4">
            <div className="w-28 aspect-[2/3] rounded-lg bg-zinc-900 shrink-0 overflow-hidden border border-zinc-700">
              <img
                src={selectedMovie.poster_path || selectedMovie.cover || selectedMovie.logo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{selectedMovie.year || selectedMovie.release_date?.slice(0, 4)}</span>
                {selectedMovie.duration && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedMovie.duration} min
                    </span>
                  </>
                )}
                {selectedMovie.rating && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      {selectedMovie.rating.toFixed(1)}
                    </span>
                  </>
                )}
              </div>

              <div className="text-xs text-zinc-300 leading-relaxed pt-2">
                {selectedMovie.overview || selectedMovie.plot || 'No synopsis provided.'}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Series Details Modal */}
      {selectedSeries && (
        <Modal
          isOpen={!!selectedSeries}
          onClose={() => setSelectedSeries(null)}
          title={selectedSeries.title || selectedSeries.name || 'Series'}
          maxWidth="md"
        >
          <div className="flex gap-4">
            <div className="w-28 aspect-[2/3] rounded-lg bg-zinc-900 shrink-0 overflow-hidden border border-zinc-700">
              <img src={selectedSeries.poster_path || selectedSeries.cover} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span>{selectedSeries.year}</span>
                {selectedSeries.seasons_count && (
                  <>
                    <span>•</span>
                    <span className="text-teal-400">{selectedSeries.seasons_count} Seasons</span>
                  </>
                )}
                {selectedSeries.episodes_count && (
                  <>
                    <span>•</span>
                    <span>{selectedSeries.episodes_count} Episodes</span>
                  </>
                )}
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed pt-2">
                {selectedSeries.overview || selectedSeries.plot || 'No overview provided.'}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
