import { useEffect, useState, useRef } from "react";
import { Socket } from "socket.io-client";

export default function useAudioRecorder(
  sendTranscript: (text: string) => void,
  socket: Socket
) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function setupRecorder() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            console.log("Sending audio chunk of size:", event.data.size);
            socket.emit("audio_chunk", event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          console.log("MediaRecorder stopped.");
        };
      } catch (error) {
        console.error("Microphone access error:", error);
      }
    }

    setupRecorder();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [socket]);

  const startRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "inactive"
    ) {
      mediaRecorderRef.current.start(2000); // Increased from 500ms to 2000ms
      setRecording(true);
      console.log("Recording started...");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      console.log("Recording stopped...");
    }
  };

  return { recording, startRecording, stopRecording };
}
