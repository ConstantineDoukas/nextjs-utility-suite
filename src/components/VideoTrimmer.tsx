'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
// import type { FFmpeg } from '@ffmpeg/ffmpeg'; // This line is removed to resolve a build-time resolution error.

// --- HELPER FUNCTIONS ---

/**
 * A more specific error finder for trimming.
 */
const findRealError = (logMessages: string[]): string | null => {
  if (logMessages.some((msg) => msg.includes('Invalid data found when processing input'))) {
    return 'The video file appears to be corrupted or in an unsupported format.';
  }
  return null; // No specific error found
};

/**
 * Formats seconds into a MM:SS.ms string.
 */
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds - (minutes * 60 + seconds)) * 100);

  const pad = (num: number, length = 2) => String(num).padStart(length, '0');

  return `${pad(minutes)}:${pad(seconds)}.${pad(milliseconds)}`;
};


// --- MAIN TRIMMER COMPONENT ---

export default function VideoTrimmer() {
  // --- STATE ---
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading trimmer assets...');
  
  // State for our Blob URLs
  const [coreURL, setCoreURL] = useState<string | null>(null);
  const [wasmURL, setWasmURL] = useState<string | null>(null);

  // Refs
  const ffmpegRef = useRef<any | null>(null);
  const logMessagesRef = useRef<string[]>([]);

  // --- NEW STATE FOR TRIMMER ---
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  
  // --- FFMPEG LOADING (Same as before) ---
  useEffect(() => {
    const loadFFmpegUtils = async () => {
      try {
        const { toBlobURL } = await import('@ffmpeg/util');
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

  const loadFFmpeg = async () => {
    if (!coreURL || !wasmURL) {
      setMessage('FFmpeg assets not ready. Please wait a moment.');
      return;
    }

    setMessage('Loading FFmpeg core...');

    // --- FIX: Moved import and setup INSIDE the try/catch block ---
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');

      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
      }
      const ffmpeg = ffmpegRef.current;
      
      logMessagesRef.current = [];

      ffmpeg.on('log', ({ message, type }) => {
        logMessagesRef.current.push(message);
        if (type === 'fferr') {
          console.error('--- FFMPEG ERROR ---:', message);
        } else {
          // console.log('FFMPEG LOG:', message);
        }
      });

      ffmpeg.on('progress', ({ progress }) => {
        // We clamp progress at 1 because -c copy can sometimes report > 1
        const clampedProgress = Math.min(1, progress);
        setProgress(Math.round(clampedProgress * 100));
      });
      // --- END OF MOVED CODE ---

      await ffmpeg.load({ coreURL, wasmURL });
      setFfmpegReady(true);
      setMessage('FFmpeg loaded. Ready to trim.');
    } catch (e) {
      console.error("Error loading ffmpeg:", e);
      setMessage("Error loading FFMpeg. See console for details.");
    }
  };


  // --- NEW/UPDATED FUNCTIONS ---

  /**
   * Handles the file selection and creates a video preview URL.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setOutputUrl(null); // Reset any previous conversion
      setProgress(0);
      
      // Revoke old URL to prevent memory leaks
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      // Create a new URL for the video tag
      const url = URL.createObjectURL(file);
      setVideoSrc(url);

      setMessage('File selected. Adjust the timeline to set trim times.');
    }
  };

  /**
   * Reads video metadata to get its duration.
   */
  const handleVideoLoaded = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const duration = e.currentTarget.duration;
    setVideoDuration(duration);
    setEndTime(duration); // Set default end time to full duration
    setStartTime(0);      // Set default start time to 0
  };

  /**
   * Performs the trim using FFmpeg.
   */
  const trimVideo = async () => {
    if (!videoFile) {
      setMessage('Please select a video file first.');
      return;
    }
    if (startTime >= endTime) {
      setMessage('Error: Start time must be before end time.');
      return;
    }

    setIsConverting(true);
    setMessage('Trimming file... (This is fast!)');
    setProgress(0);
    
    logMessagesRef.current = [];

    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      setMessage('FFmpeg not loaded. Please click "Load FFmpeg" again.');
      setIsConverting(false);
      return;
    }

    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    try {
      // Read the file and write it to FFmpeg's virtual file system
      const fileData = await videoFile.arrayBuffer();
      const data = new Uint8Array(fileData);
      await ffmpeg.writeFile(inputFileName, data);

      // --- THE NEW TRIM COMMAND ---
      // We use -c copy for a "stream copy" which is EXTREMELY fast.
      // It doesn't re-encode the video, just cuts it.
      await ffmpeg.exec([
        '-i',
        inputFileName,
        '-ss',             // Start time flag
        startTime.toString(),
        '-to',             // End time flag
        endTime.toString(),
        '-c',              // Codec flag
        'copy',            // 'copy' codec
        outputFileName,
      ]);
      // --- END NEW COMMAND ---
      
      const outputData = await ffmpeg.readFile(outputFileName);

      // Create a new Blob from the output data
      // We still use .slice() to fix the SharedArrayBuffer issue
      const blob = new Blob([outputData.slice()], { type: 'video/mp4' });

      // Create a URL for the new Blob
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setIsConverting(false);
      setMessage('Trim complete! You can now download the video.');
      
      // Clean up virtual files
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

    } catch (e) {
      setIsConverting(false);
      const realError = findRealError(logMessagesRef.current);
      
      if (realError) {
        setMessage(realError);
      } else {
        setMessage("Trim failed. See console for details.");
        console.error("An unknown conversion error occurred:", e);
      }
    }
  };

  // --- RENDER ---
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

          {/* --- NEW VIDEO PREVIEW & TRIMMER UI --- */}
          {videoSrc && (
            <div className="my-4 space-y-4">
              <video
                src={videoSrc}
                controls
                className="w-full rounded-lg shadow-inner bg-gray-800"
                onLoadedMetadata={handleVideoLoaded}
              />
              {/* Render the visual timeline component */}
              <TrimmerTimeline
                duration={videoDuration}
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            </div>
          )}
          {/* --- END NEW UI --- */}


          <button
            onClick={trimVideo}
            disabled={!videoFile || isConverting}
            className="w-full px-6 py-3 font-semibold text-white bg-green-600 rounded-lg 
                       hover:bg-green-700 transition duration-300
                       disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isConverting ? `Trimming... ${progress}%` : '2. Trim Video'}
          </button>
        </>
      )}

      {/* 3. Progress and Status */}
      {isConverting && (
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full" // Removed transition for smoother progress
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      <p className="text-center text-gray-400 text-sm h-5">{message}</p>

      {/* 4. Download Link */}
      {outputUrl && (
        <div className="text-center">
          <a
            href={outputUrl}
            download="trimmed.mp4"
            className="inline-block w-full px-6 py-3 font-semibold text-center text-white bg-purple-600 rounded-lg 
                       hover:bg-purple-700 transition duration-300"
          >
            3. Download Trimmed MP4
          </a>
        </div>
      )}
    </div>
  );
}


// --- SUB-COMPONENT: The Visual Timeline ---
// We keep this in the same file to make it easy to manage.

interface TrimmerTimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
}

function TrimmerTimeline({
  duration,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TrimmerTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

  // Convert times to percentages for CSS
  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;

  // Calculate new time from a mouse event
  const calculateTimeFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
    if (!timelineRef.current) return 0;

    const timeline = timelineRef.current;
    const rect = timeline.getBoundingClientRect();
    
    let clientX: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const newX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return newX * duration;
  }, [duration]);


  // Effect to handle dragging
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingHandle) return;

      const newTime = calculateTimeFromEvent(e);

      if (draggingHandle === 'start') {
        // Prevent start handle from crossing end handle
        onStartTimeChange(Math.min(newTime, endTime - 0.1)); // 0.1s min duration
      } else if (draggingHandle === 'end') {
        // Prevent end handle from crossing start handle
        onEndTimeChange(Math.max(newTime, startTime + 0.1));
      }
    };

    const handleStop = () => {
      setDraggingHandle(null);
    };

    // Add global listeners
    if (draggingHandle) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleStop);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleStop);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleStop);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleStop);
    };
  }, [draggingHandle, endTime, startTime, onStartTimeChange, onEndTimeChange, calculateTimeFromEvent]);


  return (
    <div className="space-y-3 pt-2">
      {/* 1. The Timeline */}
      <div
        ref={timelineRef}
        className="relative w-full h-3 bg-gray-700 rounded-full cursor-pointer"
        onMouseDown={(e) => {
          // Allow clicking on the track to move the nearest handle
          const newTime = calculateTimeFromEvent(e.nativeEvent);
          if (Math.abs(newTime - startTime) < Math.abs(newTime - endTime)) {
            onStartTimeChange(Math.min(newTime, endTime - 0.1));
          } else {
            onEndTimeChange(Math.max(newTime, startTime + 0.1));
          }
        }}
      >
        {/* Selected Range */}
        <div
          className="absolute h-full bg-blue-600 rounded-full"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        ></div>

        {/* Start Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-blue-500 cursor-ew-resize"
          style={{ left: `${startPercent}%` }}
          onMouseDown={(e) => {
            e.stopPropagation(); // Prevent track click
            setDraggingHandle('start');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setDraggingHandle('start');
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-1 h-3 bg-gray-500 rounded-full"></div>
          </div>
        </div>

        {/* End Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-blue-500 cursor-ew-resize"
          style={{ left: `${endPercent}%` }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingHandle('end');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setDraggingHandle('start');
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-1 h-3 bg-gray-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* 2. The Time Displays */}
      <div className="flex justify-between text-sm font-mono">
        <span className="text-white bg-gray-800 px-2 py-1 rounded">
          Start: {formatTime(startTime)}
        </span>
        <span className="text-white bg-gray-800 px-2 py-1 rounded">
          End: {formatTime(endTime)}
        </span>
      </div>
    </div>
  );
}

