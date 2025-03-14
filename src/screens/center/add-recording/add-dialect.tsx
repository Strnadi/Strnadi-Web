import { useRecordingState } from "@/state/store";
import { useEffect, useMemo, useRef, useState } from "react";
import "@/styling/buttons.css";
import FFT from 'fft.js';
import { useDropzone } from 'react-dropzone';
import SpectrogramCanvas from '@/components/spectrogram/spectrogram-select';
import '@/styling/spectrogram.css';

/**
 * Main wrapper that shows:
 * - Title + "Uložit" button
 * - Dropzone (if no file selected)
 * - The spectrogram with draggable lines
 * - Playback controls + time readout
 * - Color-coded label toggles
 */
export default function SpectrogramApp() {
  const file = useRecordingState((state) => state.recordings![0].recording);

  // For demonstration, we’ll just store a dummy current time
  const [currentTime, setCurrentTime] = useState('00:04,23');

  // Example playback handlers
  const handlePlay = () => {
    // Implement your actual audio playback logic
    alert('Play clicked');
  };
  const handleStop = () => {
    alert('Stop clicked');
  };

  return (
    <div className="spectrogram-app">
      {/* Header */}
      <div className="spectrogram-header">
        <h1>Přidání dialektu</h1>
        <button className="save-btn">Uložit</button>
      </div>

      <>
        {/* The spectrogram canvas */}
        <SpectrogramCanvas file={file} />

        {/* Playback controls + time */}
        <div className="playback-controls">
          <button onClick={handlePlay}>▶︎</button>
          <button onClick={handleStop}>⏹</button>
          <span className="current-time">{currentTime}</span>
        </div>

        {/* Color-coded label toggles */}
        <div className="label-toggles">
          <button className="label-btn bc">BC</button>
          <button className="label-btn be">BE</button>
          <button className="label-btn blbh">BlBh</button>
          <button className="label-btn bhbi">BhBí</button>
          <button className="label-btn xb">XB</button>
          <button className="label-btn jine">Jiné</button>
          <button className="label-btn nevim">Nevím</button>
        </div>
      </>
    </div>
  );
}
