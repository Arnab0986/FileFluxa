import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Headphones,
  Volume2,
  Scissors,
  ShieldCheck,
  AlertCircle,
  AudioLines,
  Clock3,
} from 'lucide-react';
import {
  FileDropZone,
  FileQueue,
  ProcessingMachine,
  ResultPanel,
} from '../components/ProcessingComponents';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const safeBaseName = (name = 'audio') => {
  const withoutExtension = name.replace(/\.[^.]+$/, '');
  return (
    withoutExtension.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 100) ||
    'audio'
  );
};

const SUPPORTED_AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|aiff|aif)$/i;

export function AudioLab() {
  const [files, setFiles] = useState([]);
  const [action, setAction] = useState('trim');
  const [startTime, setStartTime] = useState('0');
  const [endTime, setEndTime] = useState('10');
  const [volume, setVolume] = useState(100);
  const [outputFormat, setOutputFormat] = useState('original');
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const clearResult = () => {
    setResult((previous) => {
      if (previous?.url) URL.revokeObjectURL(previous.url);
      return null;
    });
    setStatus('idle');
    setProgress(0);
    setMessage('');
    setError('');
  };

  const handleFiles = (selected) => {
    const file = selected.find(
      (item) =>
        item.type?.startsWith('audio/') ||
        SUPPORTED_AUDIO_EXTENSIONS.test(item.name || ''),
    );

    if (!file) {
      setError(
        'Choose a supported audio file: MP3, WAV, M4A, AAC, OGG, FLAC, WebM, or AIFF.',
      );
      return;
    }

    clearResult();
    setFiles([file]);
    setDuration(null);
    setStartTime('0');
    setEndTime('10');
    setError('');

    const audio = new Audio();
    const objectUrl = URL.createObjectURL(file);
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
        setEndTime(String(Math.max(0.1, Math.round(audio.duration * 10) / 10)));
      }
      URL.revokeObjectURL(objectUrl);
    };

    audio.onerror = () => URL.revokeObjectURL(objectUrl);
    audio.src = objectUrl;
  };

  const handleProcess = async () => {
    if (!files.length || status === 'processing') return;

    const file = files[0];
    const start = Number(startTime);
    const end = Number(endTime);

    if (
      action === 'trim' &&
      (!Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end <= start ||
        (duration !== null && end > duration + 0.001))
    ) {
      setError(
        `Enter a valid time range between 0 and ${
          duration === null ? 'the audio duration' : `${duration.toFixed(2)} seconds`
        }. End time must be greater than start time.`,
      );
      setStatus('failed');
      return;
    }

    if (!Number.isFinite(volume) || volume < 0 || volume > 200) {
      setError('Volume must be between 0% and 200%.');
      setStatus('failed');
      return;
    }

    setStatus('processing');
    setProgress(10);
    setMessage('Preparing audio upload…');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', action);
      formData.append('outputFormat', outputFormat);
      formData.append('startTime', String(startTime));
      formData.append('endTime', String(endTime));
      formData.append('volume', String(volume));

      const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

      setProgress(20);
      setMessage('Uploading audio to the FileFluxa API…');

      const response = await fetch(`${apiBase}/api/audio/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let details = 'Audio processing failed.';
        try {
          const data = await response.json();
          details = data.error || details;
        } catch {
          // The server may return a non-JSON error response.
        }
        throw new Error(details);
      }

      setProgress(85);
      setMessage('Receiving processed audio…');

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error('The server returned an empty audio file.');
      }

      const disposition = response.headers.get('content-disposition') || '';
      const encodedFilename = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plainFilename = disposition.match(/filename="([^"]+)"/i);
      const responseFilename = encodedFilename
        ? decodeURIComponent(encodedFilename[1])
        : plainFilename?.[1];

      const originalExtension = file.name.includes('.')
        ? file.name.split('.').pop().toLowerCase()
        : 'mp3';
      const outputExtension =
        outputFormat === 'original' ? originalExtension : outputFormat;
      const suffix = action === 'trim' ? 'trimmed' : 'volume-adjusted';

      const output = {
        name:
          responseFilename ||
          `${safeBaseName(file.name)}_${suffix}.${outputExtension}`,
        size: blob.size,
        url: URL.createObjectURL(blob),
        blob,
      };

      setResult(output);
      setStatus('completed');
      setProgress(100);
      setMessage(`Processing completed. Output: ${output.name}`);
    } catch (err) {
      console.error('Audio Lab processing failed:', err);
      setStatus('failed');
      setProgress(0);
      setMessage('');
      setError(
        err?.message ||
          'Audio processing failed. Check the API connection and confirm the audio file is valid.',
      );
    }
  };

  const options = [
    {
      id: 'trim',
      title: 'Trim audio',
      description: 'Keep a selected time range',
      Icon: Scissors,
    },
    {
      id: 'volume',
      title: 'Adjust volume',
      description: 'Change loudness without trimming',
      Icon: Volume2,
    },
  ];

  return (
    <div className="space-y-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="mb-2 flex items-center gap-3 text-cyan-700">
          <Headphones className="h-7 w-7" />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Audio Lab
          </h1>
        </div>

        <p className="max-w-2xl text-sm text-slate-600">
          Trim audio or adjust volume using the FFmpeg processing engine. Export
          as MP3, WAV, WebM/Opus, or the original input format where supported.
        </p>

        <div className="flex items-center gap-2 text-xs text-amber-700">
          <ShieldCheck className="h-4 w-4" />
          Audio is uploaded to the configured API and removed from temporary
          server storage after processing.
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <FileDropZone
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.webm,.aiff,.aif"
              multiple={false}
              onFilesSelected={handleFiles}
            />
          </div>

          <FileQueue
            files={files}
            onRemove={() => {
              setFiles([]);
              setDuration(null);
              clearResult();
            }}
            onClear={() => {
              setFiles([]);
              setDuration(null);
              clearResult();
            }}
          />

          {files.length > 0 && (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="rounded-lg bg-cyan-50 p-3 text-cyan-700">
                <AudioLines className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {files[0].name}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                  <Clock3 className="h-3.5 w-3.5" />
                  {duration === null ? 'Reading duration…' : formatTime(duration)}
                  {' · '}
                  {(files[0].size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label
              className="mb-2 block text-sm font-semibold text-slate-700"
              htmlFor="audio-output-format"
            >
              Output format
            </label>
            <select
              id="audio-output-format"
              value={outputFormat}
              onChange={(event) => {
                setOutputFormat(event.target.value);
                clearResult();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-400"
            >
              <option value="original">Original format — keep input format</option>
              <option value="mp3">MP3 — 192 kbps</option>
              <option value="wav">WAV — PCM</option>
              <option value="webm">WebM — Opus</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Edited audio is re-encoded. Original format means the same file
              extension/container where the server supports it, not a byte-for-byte
              copy of the input.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-rose-500/30 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <ProcessingMachine status={status} progress={progress} message={message} />

          {files.length > 0 && status !== 'processing' && (
            <button
              onClick={handleProcess}
              className="w-full rounded-xl bg-cyan-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-700"
            >
              {status === 'completed' ? 'Process again' : 'Process audio'}
            </button>
          )}

          <ResultPanel
            result={result}
            onDownload={() => {
              if (!result?.url) return;
              const link = document.createElement('a');
              link.href = result.url;
              link.download = result.name;
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
          />
        </section>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-bold text-slate-900">Audio settings</h2>

          <div className="space-y-3">
            {options.map(({ id, title, description, Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setAction(id);
                  clearResult();
                }}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  action === id
                    ? 'border-cyan-300 bg-cyan-50'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span
                  className={`rounded-lg p-2 ${
                    action === id
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span
                    className={`block text-sm font-semibold ${
                      action === id ? 'text-cyan-800' : 'text-slate-900'
                    }`}
                  >
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {description}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {action === 'trim' && (
            <div className="space-y-4 border-t border-slate-200 pt-4">
              <label className="block space-y-2 text-sm text-slate-700">
                Start time (seconds)
                <input
                  type="number"
                  min="0"
                  max={duration ?? undefined}
                  step="0.1"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-400"
                />
              </label>
              <label className="block space-y-2 text-sm text-slate-700">
                End time (seconds)
                <input
                  type="number"
                  min="0.1"
                  max={duration ?? undefined}
                  step="0.1"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none focus:border-cyan-400"
                />
              </label>
              <p className="text-xs leading-5 text-slate-500">
                The server exports only the selected time range.
              </p>
            </div>
          )}

          {action === 'volume' && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-700">
                <label htmlFor="audio-volume">Output volume</label>
                <span className="font-semibold tabular-nums text-cyan-700">
                  {volume}%
                </span>
              </div>
              <input
                id="audio-volume"
                type="range"
                min="0"
                max="200"
                step="5"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Mute (0%)</span>
                <span>Original (100%)</span>
                <span>200%</span>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Volume adjustment processes the full track. Higher settings may
                cause clipping if the original audio is already loud.
              </p>
            </div>
          )}

          <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            Powered by your configured FileFluxa API and FFmpeg. The API must be
            running for processing to work.
          </p>
        </aside>
      </div>
    </div>
  );
}
