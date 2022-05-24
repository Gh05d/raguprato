import axios from "axios";
import { get } from "svelte/store";
import { db } from "./stores";

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds.
 *
 * @param {function} fn - The function to be executed
 * @param {number} [wait] - The time after which the function should be executed. Defaults to 300ms
 * @returns {fn} - The debounced function
 */
export function debounce(callback, wait = 300) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, args), wait);
  };
}

export const apiCall = async (url, params, method = "GET") => {
  try {
    const { data } = await axios({ method, url, params });

    return data;
  } catch (error) {
    throw new Error(error);
  }
};

export const createID = () => Math.random().toString(36).substring(7);

/**
 * Takes an array of artists and concats their names
 * @param {Object[]} artists
 *
 * @returns {string} Names separated by commas
 */
export const getArtists = artists =>
  artists?.map(artist => artist.name).join(", ") || "John Doe";

export async function authenticateSpotify() {
  try {
    // Needed as content-type means that the server expects tuples
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");

    const credentials = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(
            `${process.env.SPOTIFY_ID}:${process.env.SPOTIFY_SECRET}`
          )}`,
        },
      }
    );

    return credentials;
  } catch (err) {
    console.error(err);
  }
}

/**
 * Creates a promise to update the database
 * @function
 * @exports
 *
 * @param {string} query - The operation to perform
 * @param {(string|object)} [params]
 * @param {string} [type=readonly] - Like readonly (default), readwrite, ...
 */
export function transaction(query, params = null, type = "readonly") {
  return new Promise((resolve, reject) => {
    const database = get(db);

    const transaction = database.transaction(["lessons"], type);
    const objectStore = transaction.objectStore("lessons");
    const request = objectStore[query](params);

    request.onerror = event => {
      reject(Error(event?.target?.error || "Something bad happened"));
    };

    request.onsuccess = () => resolve(request.result);
  });
}

// Keys
export const ARROW_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAABnUlEQVRoge3ZzUqVQRzH8U/iRbQweiCigjBcJEVBh6QwDILASNy2aNUtdAVeRVfRsstoEUgUKIEW5kvvLR6VGXmac44554wwX5jFMH+e+X2fd2aoVLJwJtNxp/Am6F/INE92GvwJWnYmRjHJKKgipVFFSqOKlEYVKY0qUhpVpDSqSGlUkdKoIqVRRUqjipTGMCKTWMG5TFmm8TLTsQ+ZwCvtYtuq/iuHjeEW6Gbwab925bghB2FeHOw9LibqG4OL3MBmUPsDV/8vbprn+BVMuJaYsDGYyG18Ceq+4fHJxE3zTCyzjmsddY3+InewJZZ4dLJx0yxpL/9BgA3MHqlppEXmsROMb+N+nrhpnuB7EOQzbgbjjX+LLGA3GPuKubxx0zzE3pFAd/fHGt0ii+ITsIXeSNL24YH47G7jnm6Rp+JbclP7xiqGnvih3cMLscgyfgb9DVwfQ9a+9MQyv8UiYT/12i6CW+JvQlf7gEvjCjgMs9rbpkti1SnbFA3/mw7aO5wfZ6jjcgUftRJvtdvVp5bLeI2z4w5SqVQq5fEXMTOSwvhqgGAAAAAASUVORK5CYII=";
export const DB_NAME = "RagupratoDatabase";
export const DB_VERSION = 1;

export const chords = {
  A: {
    fingers: [
      [2, 2, "3"],
      [3, 2, "2"],
      [4, 2, "1"],
      [6, "x"],
    ],
    barre: null,
  },
  Am: {
    fingers: [
      [2, 1, "3"],
      [3, 2, "2"],
      [4, 2, "1"],
      [6, "x"],
    ],
    barre: null,
  },
  B: {
    fingers: [
      [2, 4, "3"],
      [3, 4, "3"],
      [4, 4, "3"],
    ],
    barre: {
      fromString: 6,
      toString: 1,
      fret: 2,
      text: "1",
    },
  },
  Bm: {
    fingers: [
      [2, 3, "2"],
      [3, 4, "4"],
      [4, 4, "3"],
      [6, "x"],
    ],
    barre: {
      fromString: 5,
      toString: 1,
      fret: 2,
      text: "1",
    },
  },
  C: {
    fingers: [
      [2, 1, "1"],
      [4, 2, "2"],
      [5, 3, "3"],
      [6, "x"],
    ],
    barre: null,
  },
  Cm: {
    fingers: [
      [2, 2, "2"],
      [3, 3, "4"],
      [4, 3, "3"],
      [6, "x"],
    ],
    barre: {
      fromString: 5,
      toString: 1,
      fret: 1,
      text: "1",
    },
    position: 3,
  },
  D: {
    fingers: [
      [1, 2, "2"],
      [2, 3, "3"],
      [3, 2, "1"],
      [5, "x"],
      [6, "x"],
    ],
    barre: null,
  },
  Dm: {
    fingers: [
      [1, 1, "1"],
      [2, 3, "3"],
      [3, 2, "2"],
      [5, "x"],
      [6, "x"],
    ],
    barre: null,
  },
  E: {
    fingers: [
      [3, 1, "3"],
      [4, 2, "2"],
      [5, 2, "1"],
    ],
    barre: null,
  },
  Em: {
    fingers: [
      [4, 2, "2"],
      [5, 2, "1"],
    ],
    barre: null,
  },
  F: {
    fingers: [
      [3, 2, "2"],
      [4, 3, "3"],
      [5, 3, "4"],
    ],
    barre: {
      fromString: 6,
      toString: 1,
      fret: 1,
      text: "1",
    },
  },
  Fm: {
    fingers: [
      [4, 3, "3"],
      [5, 3, "4"],
    ],
    barre: {
      fromString: 6,
      toString: 1,
      fret: 1,
      text: "1",
    },
  },
  G: {
    fingers: [
      [1, 3, "4"],
      [2, 3, "3"],
      [5, 2, "1"],
      [6, 3, "2"],
    ],
    barre: null,
  },
  Gm: {
    fingers: [
      [4, 3, "3"],
      [5, 3, "4"],
    ],
    barre: {
      fromString: 6,
      toString: 1,
      fret: 1,
      text: "1",
    },
    position: 3,
  },
};
