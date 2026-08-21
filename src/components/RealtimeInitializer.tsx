"use client";

// LBC API does not expose a realtime transport yet. Data hooks use bounded
// polling until the API provides websocket or server-sent-event endpoints.
export default function RealtimeInitializer() {
  return null;
}
