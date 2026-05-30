import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, FileAudio, FileText, Phone, UploadCloud, AlertTriangle, ShieldCheck, Activity, Square, Trash2 } from 'lucide-react';

const AnalyzePanel = ({ onAnalyze, loading, phone, setPhone, loadingMessage }) => {
  const [activeTab, setActiveTab] = useState('text');
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  
  // Voice Recording states & refs
  const [voiceState, setVoiceState] = useState('idle'); // idle | recording | recorded | uploading | complete
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Handle tab switching cleanup
  React.useEffect(() => {
    if (activeTab !== 'voice') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [activeTab]);

  // Handle parent loading transition for upload completion logging and state progression
  React.useEffect(() => {
    if (!loading && voiceState === 'uploading') {
      console.log('[Voice Analysis] upload completed');
      setVoiceState('complete');
    }
  }, [loading, voiceState]);

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    console.log('[Voice Analysis] requesting microphone access');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Voice Analysis] microphone access granted');
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        console.log(`[Voice Analysis] blob created successfully. Size: ${audioBlob.size} bytes`);
        
        if (audioBlob.size === 0) {
          console.error('[Voice Analysis] recorded blob is empty');
          setError('Recording failed');
          setVoiceState('idle');
          return;
        }

        setVoiceBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setVoiceState('recorded');
      };

      mediaRecorder.start(200);
      console.log('[Voice Analysis] recording started');
      setVoiceState('recording');
    } catch (err) {
      console.error('[Voice Analysis] recording failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied');
      } else {
        setError('Recording failed');
      }
      setVoiceState('idle');
    }
  };

  const stopRecording = () => {
    console.log('[Voice Analysis] stopping recording');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    console.log('[Voice Analysis] recording stopped');
  };

  const cancelRecording = () => {
    console.log('[Voice Analysis] cancelling recording');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setVoiceBlob(null);
    setAudioUrl('');
    audioChunksRef.current = [];
    setError(null);
    setVoiceState('idle');
    console.log('[Voice Analysis] recording cancelled and state reset');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAudioFile(e.dataTransfer.files[0]);
    }
  };

  const getExtensionFromMime = (mimeType) => {
    if (!mimeType) return 'wav';
    const type = mimeType.split(';')[0].toLowerCase();
    if (type.includes('webm')) return 'webm';
    if (type.includes('ogg')) return 'ogg';
    if (type.includes('mp4')) return 'mp4';
    if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
    if (type.includes('wav')) return 'wav';
    if (type.includes('m4a')) return 'm4a';
    const parts = type.split('/');
    if (parts.length > 1) {
      return parts[1];
    }
    return 'wav';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'voice') {
      if (!voiceBlob) {
        setError('No audio recorded');
        console.error('[Voice Analysis] scan attempted with no audio recorded');
        return;
      }
      console.log('[Voice Analysis] upload started');
      setVoiceState('uploading');
      
      const ext = getExtensionFromMime(voiceBlob.type);
      const file = new File([voiceBlob], `recording.${ext}`, { type: voiceBlob.type || `audio/${ext}` });
      console.log(`[Voice Analysis] packaging file recording.${ext} with type: ${file.type}`);
      onAnalyze({ type: 'voice', phone, audioFile: file });
    } else {
      onAnalyze({ type: activeTab, phone, text, audioFile });
    }
  };

  const tabs = [
    { id: 'text', icon: FileText, label: 'Text' },
    { id: 'number', icon: Phone, label: 'Number' },
    { id: 'audio', icon: FileAudio, label: 'Audio' },
    { id: 'voice', icon: Mic, label: 'Voice' },
  ];

  return (
    <div className="glass-card p-6 md:p-8 w-full max-w-4xl mx-auto relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 text-accent">
          <Activity className="w-6 h-6 animate-pulse-slow" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Threat Analysis Console</h2>
          <p className="text-sm text-gray-400">Initialize deep neural scan on suspect communication</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-surface/50 p-1 rounded-xl border border-gray-800 mb-8 relative z-10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 relative ${
              activeTab === tab.id 
                ? 'text-white' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary/20 border border-primary/50 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <tab.icon className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? 'text-primary' : ''}`} />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
        {/* Phone Number Input (always visible for context) */}
        <div className="relative group">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Identifier (Phone Number)</label>
          <div className="absolute inset-y-0 left-0 pl-4 pt-7 flex items-center pointer-events-none">
            <Phone className="w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            id="target-phone-input"
            type="text"
            value={phone}
            disabled={loading}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-black/40 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="+1 555-0199 or +91 999..."
            required
          />
        </div>

        {/* Dynamic Content based on Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'text' && (
            <motion.div
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative group"
            >
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message Transcript</label>
              <textarea
                value={text}
                disabled={loading}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all shadow-inner resize-none h-32 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Paste the suspected spam message here for semantic analysis..."
              />
            </motion.div>
          )}

          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Audio Payload</label>
              <div 
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 ${
                  isDragging ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'border-gray-700 bg-black/20 hover:border-gray-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="fileUpload" 
                  className="hidden" 
                  accept="audio/*"
                  onChange={(e) => {
                    if(e.target.files && e.target.files[0]) setAudioFile(e.target.files[0]);
                  }}
                />
                
                {!audioFile ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
                      <UploadCloud className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-300 font-medium mb-1">Drag and drop audio file here</p>
                    <p className="text-gray-500 text-sm mb-4">WAV, MP3 up to 10MB</p>
                    <label htmlFor="fileUpload" className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm font-medium hover:bg-gray-700 cursor-pointer transition-colors">
                      Browse Files
                    </label>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <FileAudio className="w-8 h-8 text-primary animate-pulse-slow" />
                    </div>
                    <p className="text-primary font-medium mb-1">{audioFile.name}</p>
                    <p className="text-gray-500 text-sm mb-4">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button 
                      type="button" 
                      onClick={() => setAudioFile(null)}
                      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 cursor-pointer transition-colors"
                    >
                      Remove File
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-8"
            >
              {/* Voice State Visualizer */}
              <div className="relative mb-8">
                <button 
                  type="button"
                  disabled={voiceState === 'uploading'}
                  onClick={voiceState === 'idle' ? startRecording : undefined}
                  className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                    voiceState === 'recording' 
                      ? 'bg-danger/20 border-2 border-danger shadow-[0_0_50px_rgba(239,68,68,0.4)]' 
                      : voiceState === 'recorded'
                      ? 'bg-success/20 border-2 border-success shadow-[0_0_50px_rgba(16,185,129,0.3)]'
                      : voiceState === 'uploading'
                      ? 'bg-primary/20 border-2 border-primary animate-pulse'
                      : 'bg-surface border-2 border-gray-700 hover:border-primary hover:bg-primary/5'
                  }`}
                >
                  {voiceState === 'recording' && (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-danger animate-ping opacity-20"></div>
                      <div className="absolute inset-[-20px] rounded-full border border-danger animate-pulse opacity-10"></div>
                    </>
                  )}
                  {voiceState === 'uploading' && (
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-spin border-t-transparent opacity-80"></div>
                  )}
                  <Mic className={`w-12 h-12 ${
                    voiceState === 'recording' ? 'text-danger' : 
                    voiceState === 'recorded' ? 'text-success' :
                    voiceState === 'uploading' ? 'text-primary' :
                    'text-gray-400'
                  }`} />
                </button>
              </div>

              {/* Status Message */}
              <p className={`font-medium tracking-wide mb-6 ${
                voiceState === 'recording' ? 'text-danger animate-pulse' : 
                voiceState === 'recorded' ? 'text-success' :
                voiceState === 'uploading' ? 'text-primary animate-pulse' :
                'text-gray-400'
              }`}>
                {voiceState === 'idle' && 'Click Start Recording to intercept audio feed'}
                {voiceState === 'recording' && 'Intercepting audio feed...'}
                {voiceState === 'recorded' && 'Audio payload successfully intercepted.'}
                {voiceState === 'uploading' && 'Uploading transmission to Neural Threat Core...'}
                {voiceState === 'complete' && 'Scan complete! Threat Analysis report ready.'}
              </p>

              {/* Audio Preview Card */}
              {voiceState === 'recorded' && audioUrl && (
                <div className="w-full max-w-md bg-black/40 border border-gray-800 rounded-xl p-4 mb-6 shadow-inner flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Intercepted Transmission</span>
                  <audio src={audioUrl} controls className="w-full accent-primary" />
                </div>
              )}

              {/* Error Message Box */}
              {error && (
                <div className="w-full max-w-md bg-danger/10 border border-danger/35 text-danger rounded-xl p-4 mb-6 flex items-start gap-3 shadow-lg">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-sm">System Warning</span>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Controls Row */}
              <div className="flex flex-wrap justify-center gap-4">
                {voiceState === 'idle' && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-5 py-2.5 rounded-lg bg-primary/10 border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/20 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  >
                    <Mic className="w-4.5 h-4.5" /> Start Recording
                  </button>
                )}

                {voiceState === 'recording' && (
                  <>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-5 py-2.5 rounded-lg bg-danger/20 border border-danger/50 text-danger text-sm font-semibold hover:bg-danger/30 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                      <Square className="w-4 h-4 fill-danger" /> Stop Recording
                    </button>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-5 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4.5 h-4.5" /> Cancel Recording
                    </button>
                  </>
                )}

                {(voiceState === 'recorded' || voiceState === 'complete') && (
                  <>
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={loading}
                      className="px-5 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Mic className="w-4.5 h-4.5" /> Start Recording
                    </button>
                    <button
                      type="button"
                      onClick={cancelRecording}
                      disabled={loading}
                      className="px-5 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm font-semibold hover:bg-danger/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-4.5 h-4.5" /> Cancel Recording
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="neon-button neon-button-primary w-full md:w-auto min-w-[200px] flex justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingMessage || 'Processing...'}
              </span>
            ) : 'Execute Scan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnalyzePanel;
