import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  RotateCw,
  Clock,
  Radio,
  Tv,
  Disc3,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { Channel, EpgProgram } from '../types/dispatcharr';
import { Fmt } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { SearchField, LoadingBox, EmptyBox } from '../components/common/FormControls';

export const GuideScreen: React.FC = () => {
  const { channelGroups, openPlayer, canManageDvr } = useSession();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [programs, setPrograms] = useState<Record<string, EpgProgram>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  // Selected program modal
  const [selectedProgram, setSelectedProgram] = useState<{ program: EpgProgram; channel: Channel } | null>(null);
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);

  const fetchGuideData = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, any> = { enabled: true };
      if (search) q.search = search;
      if (selectedGroup !== null) q.channel_group = selectedGroup;

      const channelList: Channel[] = await api.get('/api/channels/channels/', q);
      setChannels(Array.isArray(channelList) ? channelList : []);

      const uuids = channelList.map((c) => c.uuid || String(c.id));
      if (uuids.length > 0) {
        const progs = await api.post('/api/epg/current-programs/', { channel_uuids: uuids });
        setPrograms(progs || {});
      }
    } catch {
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup]);

  useEffect(() => {
    fetchGuideData();
  }, [fetchGuideData]);

  const handleRecordProgram = async (channel: Channel, program: EpgProgram) => {
    try {
      await api.post('/api/channels/recordings/', {
        channel_id: channel.id,
        title: program.title,
        start_time: program.start_time,
        end_time: program.end_time,
      });
      setRecordSuccess(`Scheduled recording for "${program.title}"`);
      setTimeout(() => setRecordSuccess(null), 4000);
      setSelectedProgram(null);
    } catch (err: any) {
      alert(err.message || 'Failed to schedule recording');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {recordSuccess && (
        <div className="flex items-center gap-2 p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{recordSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">TV Guide (EPG)</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Now Playing & Electronic Broadcast Program Schedules</p>
        </div>

        <button
          onClick={fetchGuideData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs border border-zinc-700 transition"
        >
          <RotateCw className="w-3.5 h-3.5 text-teal-400" />
          Refresh Guide
        </button>
      </div>

      {/* Search & Groups */}
      <div className="space-y-3">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search TV guide by channel or program name..."
          className="max-w-md"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
              selectedGroup === null
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-medium'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            All Groups
          </button>
          {channelGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
              className={`px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                selectedGroup === g.id
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-medium'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Listing */}
      {loading ? (
        <LoadingBox message="Loading electronic program guide..." />
      ) : channels.length === 0 ? (
        <EmptyBox message="No programs found" submessage="Make sure channels are enabled and EPG sources are mapped." />
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => {
            const prog = programs[ch.uuid || ''] || programs[String(ch.id)];

            // Calculate progress of currently on-air program
            let progress = 0;
            if (prog) {
              const start = new Date(prog.start_time).getTime();
              const end = new Date(prog.end_time).getTime();
              const now = Date.now();
              if (end > start) {
                progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
              }
            }

            return (
              <div
                key={ch.id}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition shadow-xs gap-4"
              >
                {/* Channel Column */}
                <div className="flex items-center gap-3 w-full sm:w-60 shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center p-1">
                    {ch.logo_url ? (
                      <img src={ch.logo_url} alt={ch.name} className="w-full h-full object-contain" />
                    ) : (
                      <Tv className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {ch.channel_number && (
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-900 text-teal-400 border border-zinc-700">
                          {ch.channel_number}
                        </span>
                      )}
                      <h4 className="font-semibold text-sm text-zinc-100 truncate">{ch.name}</h4>
                    </div>
                    {ch.channel_group_name && (
                      <span className="text-[10px] text-zinc-400 mt-0.5 inline-block">{ch.channel_group_name}</span>
                    )}
                  </div>
                </div>

                {/* Program Schedule & Info */}
                <div
                  onClick={() => prog && setSelectedProgram({ program: prog, channel: ch })}
                  className={`flex-1 min-w-0 p-3 rounded-lg border border-zinc-700/50 bg-zinc-900/60 transition ${
                    prog ? 'cursor-pointer hover:border-zinc-600' : ''
                  }`}
                >
                  {prog ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
                          <h5 className="font-semibold text-sm text-zinc-100 truncate">{prog.title}</h5>
                        </div>
                        {prog.category && <Badge color="blue">{prog.category}</Badge>}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-teal-400" />
                        <span>
                          {Fmt.time(prog.start_time)} – {Fmt.time(prog.end_time)}
                        </span>
                      </div>

                      {/* Elapsed progress bar */}
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {prog.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-1 leading-relaxed">{prog.description}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic py-2">No guide information available for this channel</div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <button
                    onClick={() => openPlayer(`/proxy/ts/stream/${ch.uuid || ch.id}`, ch.name, true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Watch
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Program Details & Recording Dialog */}
      {selectedProgram && (
        <Modal
          isOpen={!!selectedProgram}
          onClose={() => setSelectedProgram(null)}
          title={selectedProgram.program.title}
          subtitle={`Airing on ${selectedProgram.channel.name}`}
          maxWidth="md"
          actions={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  openPlayer(
                    `/proxy/ts/stream/${selectedProgram.channel.uuid || selectedProgram.channel.id}`,
                    selectedProgram.channel.name,
                    true
                  );
                  setSelectedProgram(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition"
              >
                <Play className="w-3.5 h-3.5" />
                Tune Channel
              </button>

              {canManageDvr && (
                <button
                  type="button"
                  onClick={() => handleRecordProgram(selectedProgram.channel, selectedProgram.program)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition shadow-xs"
                >
                  <Disc3 className="w-3.5 h-3.5" />
                  Record Broadcast (DVR)
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-teal-400">
              <Calendar className="w-4 h-4" />
              <span>
                {Fmt.date(selectedProgram.program.start_time)} • {Fmt.time(selectedProgram.program.start_time)} –{' '}
                {Fmt.time(selectedProgram.program.end_time)}
              </span>
            </div>

            {selectedProgram.program.category && (
              <div>
                <Badge color="blue">{selectedProgram.program.category}</Badge>
              </div>
            )}

            {selectedProgram.program.description && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Synopsis</span>
                <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-700/60">
                  {selectedProgram.program.description}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
