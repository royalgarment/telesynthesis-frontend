import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { TooltipComponent } from "@syncfusion/ej2-react-popups";
import useAudioRecorder from "../hooks/useAudioRecorder";

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

const socket: Socket = io("http://localhost:5000", {
    transports: ["websocket"],
    withCredentials: true,
});

export default function PolicyAssistant() {
    const { recording, startRecording, stopRecording } = useAudioRecorder((text: string) => {
        socket.emit("transcript_update", { transcript: text });
    }, socket);

    const [transcript, setTranscript] = useState<string>("");
    const [policyContext, setPolicyContext] = useState<string | null>(null);
    const [policyColor, setPolicyColor] = useState<string>("#ffffff");
    const [policyDescription, setPolicyDescription] = useState<string | null>(null);
    const [disclaimer, setDisclaimer] = useState<string | null>(null);
    const [disclaimerSaid, setDisclaimerSaid] = useState<boolean>(false);
    const [disclaimerAgreed, setDisclaimerAgreed] = useState<boolean>(false);
    const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);

    useEffect(() => {
        socket.on("transcript_update", (data: { transcript: string }) => {
            console.log("Received transcript:", data.transcript);
            setTranscript(data.transcript);
        });

        socket.on("policy_update", (data: { policy: PolicyData | null }) => {
            if (data.policy) {
                setPolicyContext(data.policy.name);
                setPolicyColor(data.policy.color_code);
                setPolicyDescription(data.policy.description);
                setDisclaimer(data.policy.disclaimer);
                setDisclaimerSaid(false); // Reset to false for policy color
                setDisclaimerAgreed(false); // Reset to false for policy color
            } else {
                setPolicyContext(null);
                setPolicyColor("#ffffff");
                setPolicyDescription(null);
                setDisclaimer(null);
                setDisclaimerSaid(false);
                setDisclaimerAgreed(false);
            }
            setClarificationQuestion(null);
        });

        socket.on("ai_response", (data: AiResponse) => {
            console.log("Received AI response:", data);
            setPolicyContext(data.policy_name === "general" ? null : data.policy_name);
            setDisclaimerSaid(data.disclaimer_said);
            setDisclaimerAgreed(data.disclaimer_agreed);
            // Do not overwrite disclaimer here; it’s set in policy_update
        });

        socket.on("clarification_needed", (data: { question: string }) => {
            console.log("Clarification needed:", data.question);
            setClarificationQuestion(data.question);
        });

        return () => {
            socket.off("transcript_update");
            socket.off("policy_update");
            socket.off("ai_response");
            socket.off("clarification_needed");
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
            <header className="w-full max-w-4xl bg-blue-600 text-white p-4 rounded-t-lg shadow-md">
                <h1 className="text-2xl font-bold text-center">Telesynthesis Telemarketer Helper</h1>
            </header>
            <main className="w-full max-w-4xl bg-white rounded-b-lg shadow-md p-6 flex flex-col gap-6">
                <section className="border rounded-lg p-4 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Transcription</h2>
                    <p className="text-gray-700 mt-2 pl-2">{transcript || "No transcription yet"}</p>
                </section>

                <section className="border rounded-lg p-4 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Clarifying Question</h2>
                    <p className="text-gray-700 mt-2 pl-2">{clarificationQuestion || "None at this time"}</p>
                </section>

                {policyContext && (
                    <section className="border rounded-lg p-4 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-800">Active Policy</h2>
                        <p className="text-gray-700 mt-2 pl-2">{policyContext}</p>
                        <div className="mt-2">
                            <h3 className="text-md font-medium text-gray-700 pl-2">Policy Description</h3>
                            <p className="text-gray-600 mt-1 pl-2">{policyDescription}</p>
                        </div>
                    </section>
                )}

                {disclaimer && (
                    <section
                        className="border rounded-lg p-4"
                        style={{
                            backgroundColor: disclaimerAgreed ? "#ccffcc" : disclaimerSaid ? "#ffffcc" : policyColor,
                        }}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Disclaimer</h2>
                        <TooltipComponent content={disclaimer} position="BottomCenter">
                            <p className="text-gray-700 mt-2 pl-2">{disclaimer}</p>
                        </TooltipComponent>
                    </section>
                )}

                <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`mt-4 py-2 px-6 rounded-lg text-white font-semibold transition-colors duration-200 ${
                        recording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                    }`}
                >
                    {recording ? "Stop Recording" : "Start Recording"}
                </button>
            </main>
        </div>
    );
}