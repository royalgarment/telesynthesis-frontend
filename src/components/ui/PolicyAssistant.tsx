import { useState, useEffect, useRef } from "react";
import { TooltipComponent } from "@syncfusion/ej2-react-popups";
import "./PolicyAssistant.css";

interface AiResponse {
  policy_name: string;
  response: string;
  disclaimer_said: boolean;
  disclaimer_agreed: boolean;
}

interface PolicyData {
  id: number;
  name: string;
  color_code: string;
  requires_disclaimer: boolean;
  description: string;
  disclaimer: string | null;
}

export default function PolicyAssistant() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [policyContext, setPolicyContext] = useState<string | null>(null);
  const [policyDescription, setPolicyDescription] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [disclaimerSaid, setDisclaimerSaid] = useState<boolean>(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState<boolean>(false);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [sessionId] = useState(`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const eventSourceRef = useRef<EventSource | null>(null); // Track SSE connection

  useEffect(() => {
    console.log("🔄 Setting up SSE...");
    const source = new EventSource(`http://localhost:5000/events?session_id=${sessionId}`);
    eventSourceRef.current = source;

    source.onopen = () => console.log("🟢 SSE connected for session:", sessionId);

    source.onerror = (error) => console.error("🔴 SSE error:", error);

    source.addEventListener("recording_started", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { status: string };
      console.log("🎙️ Received recording_started:", data.status);
      setRecording(true);
    });

    source.addEventListener("recording_stopped", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { status: string };
      console.log("🛑 Received recording_stopped:", data.status);
      setRecording(false);
    });

    source.addEventListener("transcript_update", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { transcript: string };
      console.log("📜 Received transcript_update:", data.transcript);
      setTranscript((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
    });

    source.addEventListener("policy_update", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { policy: PolicyData | null };
      console.log("📘 Received policy_update:", data);
      if (data.policy) {
        setPolicyContext(data.policy.name);
        setPolicyDescription(data.policy.description);
        setDisclaimer(data.policy.disclaimer);
        setDisclaimerSaid(false);
        setDisclaimerAgreed(false);
      } else {
        setPolicyContext(null);
        setPolicyDescription(null);
        setDisclaimer(null);
        setDisclaimerSaid(false);
        setDisclaimerAgreed(false);
      }
      setClarificationQuestion(null);
    });

    source.addEventListener("ai_response", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as AiResponse;
      console.log("🤖 Received ai_response:", data);
      setPolicyContext(data.policy_name === "general" ? null : data.policy_name);
      setDisclaimerSaid(data.disclaimer_said);
      setDisclaimerAgreed(data.disclaimer_agreed);
    });

    source.addEventListener("clarification_needed", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { question: string };
      console.log("🟡 Received clarification_needed:", data.question);
      setClarificationQuestion(data.question);
    });

    source.addEventListener("error", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { error: string };
      console.error("🚨 Received error:", data.error);
      setRecording(false);
    });

    return () => {
      console.log("🚫 Closing SSE connection...");
      source.close();
      eventSourceRef.current = null;
    };
  }, [sessionId]); // Only run once per sessionId

  const startRecording = async () => {
    console.log("🎙️ Starting recording loop...");
    try {
      const response = await fetch("http://localhost:5000/start_recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      if (response.ok) console.log("Start response:", data);
      else console.error("Start error:", data.error);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const stopRecording = async () => {
    console.log("🛑 Stopping recording loop...");
    try {
      const response = await fetch("http://localhost:5000/stop_recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      if (response.ok) console.log("Stop response:", data);
      else console.error("Stop error:", data.error);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  console.log("🎥 Rendering with Transcript:", transcript);
  console.log("📜 Clarification Question:", clarificationQuestion);
  console.log("📘 Policy Context:", policyContext);

  return (
    <div className="policy-assistant-container">
      <header className="policy-header">
        <h1>Telesynthesis Telemarketer Helper</h1>
      </header>
      <main className="policy-main">
        <section className="policy-section">
          <h2>Transcription</h2>
          <p>{transcript || "Awaiting your voice, mate!"}</p>
        </section>

        <section className="policy-section">
          <h2>Clarifying Question</h2>
          <p>{clarificationQuestion || "All clear for now!"}</p>
        </section>

        {policyContext && (
          <section className="policy-section">
            <h2>Active Policy</h2>
            <p className="policy-name">{policyContext}</p>
            <div className="policy-details">
              <h3>Policy Details</h3>
              <p>{policyDescription}</p>
            </div>
          </section>
        )}

        {disclaimer && (
          <section
            className="policy-section disclaimer-section"
            style={{
              backgroundColor: disclaimerAgreed
                ? "rgba(34, 197, 94, 0.2)"
                : disclaimerSaid
                ? "rgba(234, 179, 8, 0.2)"
                : "rgba(59, 130, 246, 0.2)",
            }}
          >
            <h2>Disclaimer</h2>
            <TooltipComponent content={disclaimer} position="BottomCenter">
              <p className="disclaimer-text">
                {disclaimer.length > 100
                  ? `${disclaimer.slice(0, 100)}... (Hover for full text)`
                  : disclaimer}
              </p>
            </TooltipComponent>
          </section>
        )}

        <button
          onClick={recording ? stopRecording : startRecording}
          className={`record-button ${recording ? "stop" : "start"}`}
        >
          {recording ? "Stop Recording" : "Start Recording"}
        </button>
      </main>
    </div>
  );
}