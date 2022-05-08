import { writable } from "svelte/store";

export const spotifyToken = writable();

export const db = writable(
  window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB || { onerror: null }
);
