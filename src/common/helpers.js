import axios from "axios";

/**
 * @description Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds.
 *
 * @param {function} fn The function to be executed
 * @param {number} [wait] The time after which the function should be executed. Defaults to 300ms
 * @returns {fn} The debounced function
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

export const LESSONS = "lessons";
export const ARROW_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAABnUlEQVRoge3ZzUqVQRzH8U/iRbQweiCigjBcJEVBh6QwDILASNy2aNUtdAVeRVfRsstoEUgUKIEW5kvvLR6VGXmac44554wwX5jFMH+e+X2fd2aoVLJwJtNxp/Am6F/INE92GvwJWnYmRjHJKKgipVFFSqOKlEYVKY0qUhpVpDSqSGlUkdKoIqVRRUqjipTGMCKTWMG5TFmm8TLTsQ+ZwCvtYtuq/iuHjeEW6Gbwab925bghB2FeHOw9LibqG4OL3MBmUPsDV/8vbprn+BVMuJaYsDGYyG18Ceq+4fHJxE3zTCyzjmsddY3+InewJZZ4dLJx0yxpL/9BgA3MHqlppEXmsROMb+N+nrhpnuB7EOQzbgbjjX+LLGA3GPuKubxx0zzE3pFAd/fHGt0ii+ITsIXeSNL24YH47G7jnm6Rp+JbclP7xiqGnvih3cMLscgyfgb9DVwfQ9a+9MQyv8UiYT/12i6CW+JvQlf7gEvjCjgMs9rbpkti1SnbFA3/mw7aO5wfZ6jjcgUftRJvtdvVp5bLeI2z4w5SqVQq5fEXMTOSwvhqgGAAAAAASUVORK5CYII=";

export async function updateLesson(lesson) {
  try {
    const stringifiedLessons = localStorage.getItem(LESSONS);
    const lessons = JSON.parse(stringifiedLessons);

    const newLessons = lessons.filter(item => item.id != lesson.id);
    await localStorage.setItem(LESSONS, JSON.stringify([...newLessons, lesson]));
  } catch (error) {
    console.error(error);
  }
}

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
          Authorization: `Basic ${btoa(SPOTIFY_ID + ":" + SPOTIFY_SECRET)}`,
        },
      }
    );

    return credentials;
  } catch (err) {
    console.error(err);
  }
}