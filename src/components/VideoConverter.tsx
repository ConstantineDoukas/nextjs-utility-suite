'use client';

import { useState, useRef, useEffect } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';

const findRealError = (logMessages: string[]): string | null => {
  if (logMessages.some((msg) => msg.includes('does not contain any stream'))) {
    return 'This video file does not have an audio track to convert.';
  }
  return null; // No specific error found
};

export default function VideoConverter() {
  // State variables
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading converter assets...');

  // State for our Blob URLs
  const [coreURL, setCoreURL] = useState<string | null>(null);
  const [wasmURL, setWasmURL] = useState<string | null>(null);

  // Ref to store the FFmpeg instance
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Ref to store log messages
  const logMessagesRef = useRef<string[]>([]);

  // This useEffect hook runs ONLY on the client, after the page loads.
  useEffect(() => {
    const loadFFmpegUtils = async () => {
      try {
        const { toBlobURL } = await import('@ffmpeg/util');
        // We are using the 'umd' versions
        const core = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
        const wasm = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm');
        setCoreURL(core);
        setWasmURL(wasm);
        setMessage('Click "Load FFmpeg" to start');
      } catch (e) {
        console.error("Error loading ffmpeg utils:", e);
        setMessage("Error: Could not load FFMpeg assets.");
      }
    };
    loadFFmpegUtils();
  }, []);

  // Function to load FFmpeg
  const loadFFmpeg = async () => {
    if (!coreURL || !wasmURL) {
      setMessage('FFmpeg assets not ready. Please wait a moment.');
      return;
    }

    setMessage('Loading FFmpeg core...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');

    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    
    // Clear logs when loading
    logMessagesRef.current = [];

    // Log handler now stores messages
    ffmpeg.on('log', ({ message, type }) => {
      logMessagesRef.current.push(message); // Store all messages
      
      // Still log to console for debugging
      if (type === 'fferr') {
        console.error('--- FFMPEG ERROR ---:', message);
      } else {
        console.log('FFMPEG LOG:', message);
      }
    });

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    try {
      await ffmpeg.load({
        coreURL: coreURL,
        wasmURL: wasmURL,
      });

      setFfmpegReady(true);
      setMessage('FFmpeg loaded. Ready to convert.');
    } catch (e) {
      console.error("Error loading ffmpeg:", e);
      setMessage("Error loading FFMpeg. See console for details.");
    }
  };

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setMp3Url(null); // Reset any previous conversion
      setProgress(0);
      setMessage('File selected. Click "Convert" to start.'); // Give user feedback
    }
  };

  // Function to perform the conversion
  const convertToMp3 = async () => {
    if (!videoFile) {
      setMessage('Please select a video file first.');
      return;
    }
    setIsConverting(true);
    setMessage('Converting file...');
    setProgress(0);
    
    // Clear logs for this conversion run
    logMessagesRef.current = [];

    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      setMessage('FFmpeg not loaded. Please click "Load FFmpeg" again.');
      setIsConverting(false);
      return;
    }

    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp3';

    try {
      // Read the file
      const fileData = await videoFile.arrayBuffer();
      const data = new Uint8Array(fileData);
      
      // Write the file to FFmpeg's virtual file system
      await ffmpeg.writeFile(inputFileName, data);

      // Run the FFmpeg command
      await ffmpeg.exec([
        '-i',
        inputFileName,
        '-vn',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-b:a',
        '192k',
        outputFileName,
      ]);
      
      const outputData = await ffmpeg.readFile(outputFileName);

      const blob = new Blob([outputData], { type: 'audio/mp3' });
      setMp3Url(URL.createObjectURL(blob));
      
      setIsConverting(false);
      setMessage('Conversion complete! You can now download the MP3.');
      
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

    } catch (e) {
      // ERROR HANDLING
      setIsConverting(false);
      
      // Now we search for the *real* error
      const realError = findRealError(logMessagesRef.current);
      
      if (realError) {
        // We found a specific, friendly error!
        setMessage(realError);
      } else {
        // We didn't find a known error, so show a generic one
        setMessage("Conversion failed. See console for details.");
        console.error("An unknown conversion error occurred:", e);
      }
      //
    }
  };

  // --- Render the component (NO CHANGES BELOW) ---
  return (
    <div className="w-full max-w-lg p-8 space-y-6 bg-gray-900 rounded-xl shadow-lg text-white">
      {/* 1. Load Button */}
      {!ffmpegReady && (
        <div className="text-center">
          <p className="mb-4">{message}</p>
          <button
            onClick={loadFFmpeg}
            disabled={!coreURL || !wasmURL}
            className="w-full px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-300
                       disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Load FFmpeg
          </button>
        </div>
      )}

      {/* 2. Upload and Convert Area */}
      {ffmpegReady && (
        <>
          <div className="space-y-2">
            <label
              htmlFor="file-upload"
              className="block text-sm font-medium text-gray-300"
            >
              1. Upload your MP4 file
            </label>
            <input
              id="file-upload"
              type="file"
              accept="video/mp4"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold 
                file:bg-blue-600 file:text-white
                hover:file:bg-blue-700 transition"
            />
          </div>
          <button
            onClick={convertToMp3}
            disabled={!videoFile || isConverting}
            className="w-full px-6 py-3 font-semibold text-white bg-green-600 rounded-lg 
                       hover:bg-green-700 transition duration-300
                       disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isConverting ? `Converting... ${progress}%` : '2. Convert to MP3'}
          </button>
        </>
      )}

      {/* 3. Progress and Status */}
      {isConverting && (
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      <p className="text-center text-gray-400 text-sm h-5">{message}</p>

      {/* 4. Download Link */}
      {mp3Url && (
        <div className="text-center">
          <a
            href={mp3Url}
            download="converted.mp3"
            className="inline-block w-full px-6 py-3 font-semibold text-center text-white bg-purple-600 rounded-lg 
                       hover:bg-purple-700 transition duration-300"
          >
            3. Download MP3
          </a>
        </div>
      )}
    </div>
  );
}