import React, { useState, useRef, useEffect, memo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, Clock, Download, Maximize2, Minimize2, CheckCircle2, FileText } from 'lucide-react';

// Компонент "Живой градиент"
const FluidBackground = memo(({ colors, isFullscreen }) => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050505] transition-colors duration-1000">
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px] animate-pulse transition-colors duration-1000"
        style={{ backgroundColor: colors[0], animationDuration: '8s' }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[130px] animate-pulse transition-colors duration-1000"
        style={{ backgroundColor: colors[1], animationDuration: '12s' }}
      />
      <div 
        className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full opacity-25 blur-[110px] animate-pulse transition-colors duration-1000"
        style={{ backgroundColor: colors[2], animationDuration: '10s' }}
      />
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-3xl transition-opacity duration-1000 ${isFullscreen ? 'opacity-60' : 'opacity-20'}`} />
    </div>
  );
});

const App = () => {
  const [track, setTrack] = useState({
    title: "Выберите файл",
    artist: "Ваше устройство",
    audioUrl: null,
    cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&auto=format&fit=crop",
    lyrics: []
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rawText, setRawText] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [palette, setPalette] = useState(['#4f46e5', '#9333ea', '#db2777']);
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const lrcInputRef = useRef(null);
  const scrollRef = useRef(null);
  const fullscreenScrollRef = useRef(null);

  // Динамическая палитра на основе названия
  useEffect(() => {
    const hash = track.title.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      `hsl(${hash % 360}, 70%, 50%)`,
      `hsl(${(hash + 120) % 360}, 70%, 40%)`,
      `hsl(${(hash + 240) % 360}, 60%, 30%)`
    ];
    setPalette(colors);
  }, [track.title]);

  const handlePrepareLyrics = () => {
    const lines = rawText.split('\n')
      .filter(line => line.trim() !== "" && !line.startsWith('['))
      .map(text => ({ time: null, text: text.trim() }));
    setTrack(prev => ({ ...prev, lyrics: lines }));
    setIsEditing(false);
  };

  const syncLine = (index) => {
    if (!isPlaying) return;
    const newLyrics = [...track.lyrics];
    newLyrics[index].time = audioRef.current.currentTime;
    setTrack(prev => ({ ...prev, lyrics: newLyrics }));
  };

  const onTimeUpdate = () => {
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    const index = track.lyrics.reduce((acc, lyric, i) => {
      if (lyric.time !== null && time >= lyric.time) return i;
      return acc;
    }, -1);
    if (index !== currentLyricIndex) setCurrentLyricIndex(index);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTrack(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ""),
        audioUrl: URL.createObjectURL(file),
        lyrics: []
      }));
      setIsEditing(true);
      setIsPlaying(false);
    }
  };

  const handleLrcChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const lines = content.split('\n');
      const parsedLyrics = [];
      lines.forEach(line => {
        const timeMatch = line.match(/\[(\d+):(\d+)\.(\d+)\]/);
        if (timeMatch) {
          const min = parseInt(timeMatch[1]);
          const sec = parseInt(timeMatch[2]);
          const ms = parseInt(timeMatch[3]);
          const time = min * 60 + sec + ms / 100;
          const text = line.replace(/\[.*\]/, "").trim();
          if (text) parsedLyrics.push({ time, text });
        } else {
          const text = line.replace(/\[.*\]/, "").trim();
          if (text && !line.includes(':')) {
            parsedLyrics.push({ time: null, text });
          }
        }
      });
      if (parsedLyrics.length > 0) {
        setTrack(prev => ({ ...prev, lyrics: parsedLyrics }));
        setRawText(parsedLyrics.map(l => l.text).join('\n'));
        setIsEditing(false);
      }
    };
    reader.readAsText(file);
  };

  const formatTime = (time) => {
    if (time === null) return "--:--";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Улучшенный расчет размера шрифта для полноэкранного режима
  // Используем clamp для плавности и предотвращения обрезания
  const getFontSizeClass = (text) => {
    const len = text.length;
    if (len < 15) return "text-6xl md:text-8xl lg:text-9xl";
    if (len < 30) return "text-5xl md:text-7xl lg:text-8xl";
    if (len < 50) return "text-4xl md:text-6xl lg:text-7xl";
    if (len < 80) return "text-3xl md:text-5xl lg:text-6xl";
    return "text-2xl md:text-4xl lg:text-5xl";
  };

  const allSynced = track.lyrics.length > 0 && track.lyrics.every(l => l.time !== null);

  useEffect(() => {
    const target = isFullscreen ? fullscreenScrollRef.current : scrollRef.current;
    const suffix = isFullscreen ? '-fs' : '';
    const activeLyric = document.getElementById(`lyric-${currentLyricIndex}${suffix}`);
    if (activeLyric && target) {
      activeLyric.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLyricIndex, isFullscreen]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-4 md:p-10 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <FluidBackground colors={palette} isFullscreen={isFullscreen} />

      {/* Основной интерфейс (скрывается в полноэкранном режиме) */}
      {!isFullscreen && (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10 animate-in fade-in duration-700">
          
          {/* Панель Плеера */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[3rem] backdrop-blur-md shadow-2xl relative overflow-hidden group">
              <div className="aspect-square mb-10 overflow-hidden rounded-3xl shadow-2xl relative bg-neutral-900">
                <img 
                  src={track.cover} 
                  className={`w-full h-full object-cover transition-transform duration-[10s] ease-linear ${isPlaying ? 'scale-110' : 'scale-100'}`} 
                  alt="cover" 
                />
              </div>
              
              <div className="mb-10 text-center lg:text-left">
                <h1 className="text-3xl font-black tracking-tight mb-2 truncate">{track.title}</h1>
                <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] opacity-60">
                  {track.artist}
                </p>
              </div>

              <div className="space-y-8">
                <div className="w-full space-y-3">
                  <div className="relative h-1 w-full bg-white/10 rounded-full">
                    <div className="absolute h-full bg-white rounded-full transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                    <input 
                      type="range" min="0" max={duration || 0} step="0.1" value={currentTime}
                      onChange={(e) => audioRef.current.currentTime = e.target.value}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-white/30 tracking-widest">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-10">
                  <SkipBack size={28} className="text-white/20 hover:text-white transition-all cursor-pointer" />
                  <button 
                    onClick={() => {
                      if (!track.audioUrl) return fileInputRef.current.click();
                      isPlaying ? audioRef.current.pause() : audioRef.current.play();
                      setIsPlaying(!isPlaying);
                    }} 
                    className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-xl"
                  >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>
                  <SkipForward size={28} className="text-white/20 hover:text-white transition-all cursor-pointer" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => fileInputRef.current.click()}
                className="flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest text-white/60"
              >
                <Upload size={16} /> Аудио
              </button>
              <button 
                onClick={() => lrcInputRef.current.click()}
                className="flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all font-bold text-[10px] uppercase tracking-widest text-white/60"
              >
                <FileText size={16} /> .LRC
              </button>
              
              {allSynced && (
                <button 
                  onClick={() => setIsFullscreen(true)}
                  className="col-span-2 flex items-center justify-center gap-3 py-5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all font-black text-[11px] uppercase tracking-[0.2em] text-white shadow-lg shadow-indigo-500/20"
                >
                  <Maximize2 size={18} /> Режим погружения
                </button>
              )}
            </div>
          </div>

          {/* Панель Текста */}
          <div className="lg:col-span-7 bg-white/[0.02] border border-white/10 rounded-[3rem] backdrop-blur-md flex flex-col overflow-hidden shadow-2xl h-[700px] relative">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <Clock size={16} className={isPlaying ? "text-indigo-400 animate-pulse" : "text-white/20"} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Lyrics Engine</span>
              </div>
              <div className="flex items-center gap-2">
                {allSynced && !isEditing && (
                  <button onClick={() => {
                    const content = track.lyrics.map(l => `[${formatTime(l.time).replace(':', '.')}]${l.text}`).join('\n');
                    const blob = new Blob([content], {type: 'text/plain'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `${track.title}.lrc`; a.click();
                  }} className="p-2 text-white/40 hover:text-white transition-colors">
                    <Download size={18} />
                  </button>
                )}
                <button 
                  onClick={() => isEditing ? handlePrepareLyrics() : setIsEditing(true)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    isEditing ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isEditing ? 'Готово' : 'Правка'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 no-scrollbar relative" ref={scrollRef}>
              {isEditing ? (
                <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Вставьте текст песни (без временных меток)..."
                  className="w-full h-full bg-transparent border-none text-2xl font-bold focus:outline-none resize-none placeholder:text-white/5 leading-relaxed"
                />
              ) : (
                <div className="space-y-10 pb-64">
                  {track.lyrics.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
                      <FileText size={40} className="mb-4" />
                      <p className="font-bold">Текст пуст</p>
                    </div>
                  )}
                  {track.lyrics.map((line, index) => (
                    <div 
                      key={index}
                      id={`lyric-${index}`}
                      onClick={() => syncLine(index)}
                      className={`cursor-pointer transition-all duration-700 ease-out flex items-start gap-6 group/line ${currentLyricIndex === index ? 'translate-x-2' : ''}`}
                    >
                      <div className="flex flex-col items-center pt-2 min-w-[40px]">
                        <span className={`text-[9px] font-black tracking-tighter transition-colors ${line.time !== null ? 'text-indigo-400' : 'text-white/10 group-hover/line:text-white/30'}`}>
                          {line.time !== null ? formatTime(line.time) : '--:--'}
                        </span>
                        {line.time !== null && <CheckCircle2 size={10} className="text-indigo-500 mt-1" />}
                      </div>
                      <p className={`text-2xl md:text-3xl font-black leading-tight tracking-tight transition-all duration-700 whitespace-pre-wrap ${
                        currentLyricIndex === index ? 'text-white opacity-100 scale-105 origin-left' : 'text-white/10 opacity-20 scale-95 blur-[0.5px]'
                      }`}>
                        {line.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Полноэкранный слой (Оверлей) */}
      <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden group/fs transition-all duration-700 ${isFullscreen ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-20'}`}>
        <FluidBackground colors={palette} isFullscreen={true} />
        
        {/* Кнопка выхода */}
        <button 
          onClick={() => setIsFullscreen(false)}
          className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 rounded-full transition-all opacity-0 group-hover/fs:opacity-100 text-white z-[110] backdrop-blur-xl border border-white/10"
        >
          <Minimize2 size={32} />
        </button>

        <div 
          ref={fullscreenScrollRef}
          className="w-full max-w-7xl h-screen overflow-y-auto no-scrollbar flex flex-col space-y-24 md:space-y-40 pt-[40vh] pb-[45vh]"
        >
          {track.lyrics.map((line, index) => (
            <div 
              key={index}
              id={`lyric-${index}-fs`}
              className={`transition-all duration-1000 ease-out text-center px-4 w-full flex justify-center ${
                currentLyricIndex === index 
                ? 'scale-100 opacity-100 blur-0 translate-y-0' 
                : 'scale-90 opacity-10 blur-xl translate-y-10'
              }`}
            >
              <p className={`font-black leading-[1.15] tracking-tighter whitespace-pre-wrap break-words max-w-[95%] transition-all duration-1000 ${
                currentLyricIndex === index ? 'text-white' : 'text-white/20'
              } ${getFontSizeClass(line.text)}`}>
                {line.text}
              </p>
            </div>
          ))}
        </div>

        {/* Нижний прогресс-бар в полноэкранном режиме */}
        <div className="absolute bottom-12 left-12 right-12 flex flex-col items-center gap-5 opacity-0 group-hover/fs:opacity-100 transition-all duration-500 z-[110]">
           <div className="w-full max-w-3xl h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-md">
              <div className="h-full bg-white/80 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${(currentTime/(duration || 1))*100}%` }} />
           </div>
           <div className="flex flex-col items-center">
             <p className="text-white font-black text-xs uppercase tracking-[0.4em] mb-1">{track.title}</p>
             <p className="text-white/40 font-bold text-[9px] uppercase tracking-[0.2em]">{track.artist}</p>
           </div>
        </div>
      </div>

      {/* Скрытые инпуты */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
      <input type="file" ref={lrcInputRef} onChange={handleLrcChange} accept=".lrc" className="hidden" />

      <audio 
        ref={audioRef}
        src={track.audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        input[type='range']::-webkit-slider-thumb { appearance: none; width: 0; height: 0; }
        
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.15); opacity: 0.35; }
        }
        .animate-pulse { animation: pulse-slow 10s infinite ease-in-out; }

        /* Плавное появление элементов */
        .animate-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;