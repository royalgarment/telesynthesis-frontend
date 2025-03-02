import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { TooltipComponent } from "@syncfusion/ej2-react-popups";
import useAudioRecorder from "../hooks/useAudioRecorder";

interface AiResponse {
    policy_name: string;
    response: string;
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
    const [aiResponse, setAiResponse] = useState<string>("");
    const [policyContext, setPolicyContext] = useState<string | null>(null);
    const [policyColor, setPolicyColor] = useState<string>("#ffffff");
    const [disclaimer, setDisclaimer] = useState<string | null>(null);
    const [requiresDisclaimer, setRequiresDisclaimer] = useState<boolean>(false);

    useEffect(() => {
        socket.on("transcript_update", (data: { transcript: string }) => {
            console.log("Received transcript:", data.transcript);
            setTranscript((prev) => prev + " " + data.transcript);
        });

        socket.on("policy_update", (data: { policy: { id: number; name: string; color_code: string; requires_disclaimer: boolean } | null }) => {
            if (data.policy) {
                setPolicyContext(data.policy.name);
                setPolicyColor(data.policy.color_code);
                setRequiresDisclaimer(data.policy.requires_disclaimer);
            } else {
                setPolicyContext(null);
                setPolicyColor("#ffffff");
                setRequiresDisclaimer(false);
            }
            setDisclaimer(null);
            setAiResponse("");
        });

        socket.on("ai_response", (data: AiResponse) => {
            console.log("Received AI response:", data);
            setAiResponse(data.response);
            setPolicyContext(data.policy_name === "general" ? null : data.policy_name); // Update policyContext
            if (data.disclaimer && requiresDisclaimer) {
                setDisclaimer(data.disclaimer);
            } else {
                setDisclaimer(null);
            }
        });

        return () => {
            socket.off("transcript_update");
            socket.off("policy_update");
            socket.off("ai_response");
        };
    }, [requiresDisclaimer]); // Dependency to re-evaluate disclaimer logic

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4"
            style={{ backgroundColor: policyColor }}
        >
            <div className="w-full max-w-3xl shadow-lg border rounded-lg p-6 bg-white">
                <h2 className="text-xl font-bold text-center">AI Policy Assistant</h2>
                {policyContext && (
                    <p className="text-center text-gray-600 mt-2">
                        <strong>Active Policy:</strong> {policyContext}
                    </p>
                )}
                <button
                    onClick={recording ? stopRecording : startRecording}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
                >
                    {recording ? "Stop Recording" : "Start Recording"}
                </button>
                <div className="mt-4 p-4 bg-gray-100 rounded">
                    <p className="text-gray-700">
                        <strong>Transcript:</strong> {transcript}
                    </p>
                </div>
                {aiResponse && (
                    <div className="mt-4 p-4 border rounded shadow-sm">
                        <h3 className="text-lg font-semibold">AI Response</h3>
                        <p className="text-gray-800">{aiResponse}</p>
                    </div>
                )}
                {disclaimer && requiresDisclaimer && (
                    <div className="mt-4 p-4 bg-yellow-100 rounded">
                        <p className="text-red-500 font-semibold">Disclaimer:</p>
                        <TooltipComponent content={disclaimer} position="BottomCenter">
                            <p className="text-gray-700">{disclaimer}</p>
                        </TooltipComponent>
                    </div>
                )}
            </div>
        </div>
    );
}