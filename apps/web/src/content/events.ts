// The event graph lives in the Atlas; the enterprise edition reads the same file so both
// editions agree on what an event is. (The root Dockerfile places the Atlas content beside
// this app at the same relative path.)
export * from "../../../atlas/src/content/events.ts";
