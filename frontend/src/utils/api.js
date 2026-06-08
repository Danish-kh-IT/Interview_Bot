import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

export const startInterview = async (jobTitle, experienceLevel) => {
  const { data } = await api.post("/start-interview", {
    job_title: jobTitle,
    experience_level: experienceLevel,
  });
  return data;
};

export const generateQuestions = async (sessionId) => {
  const { data } = await api.post(`/generate-questions/${sessionId}`);
  return data;
};

export const getFirstQuestion = async (sessionId) => {
  const { data } = await api.get(`/get-first-question/${sessionId}`);
  return data;
};

export const submitAnswer = async (sessionId, audioBlob, retrySame = false) => {
  // Validate blob before submission
  console.log(
    "[submitAnswer] Blob size:",
    audioBlob.size,
    "type:",
    audioBlob.type,
  );

  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("Audio blob is empty - no data was recorded");
  }

  if (audioBlob.size < 500) {
    throw new Error(
      `Audio too short (${audioBlob.size} bytes) - please speak clearly`,
    );
  }

  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("retry_same", retrySame ? "true" : "false");

  // Prefer WAV (recorded via Web Audio API); keep fallbacks for older blobs
  let filename = "audio.wav";
  if (audioBlob.type.includes("webm")) {
    filename = "audio.webm";
  } else if (audioBlob.type.includes("mp4")) {
    filename = "audio.mp4";
  } else if (audioBlob.type.includes("ogg")) {
    filename = "audio.ogg";
  }

  formData.append("audio", audioBlob, filename);
  console.log(
    "[submitAnswer] Submitting audio as:",
    filename,
    "type:",
    audioBlob.type,
  );
  if (!audioBlob.type.includes("wav") && !audioBlob.type.includes("webm")) {
    console.warn("[submitAnswer] Unexpected audio type — hard-refresh the page (Ctrl+Shift+R)");
  }

  const { data } = await api.post("/submit-answer", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const getEvaluation = async (sessionId) => {
  const { data } = await api.get(`/evaluation/${sessionId}`);
  return data;
};

export const advanceQuestion = async (sessionId) => {
  const { data } = await api.post(`/advance-question/${sessionId}`);
  return data;
};

export const endInterview = async (sessionId) => {
  const { data } = await api.post(`/end-interview/${sessionId}`);
  return data;
};
