
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
import { U as axios } from './vendor-50685dc6.js';

/**
 * @description Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds.
 *
 * @param {function} fn The function to be executed
 * @param {number} [wait] The time after which the function should be executed. Defaults to 300ms
 * @returns {fn} The debounced function
 */
function debounce(callback, wait = 300) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, args), wait);
  };
}

const apiCall = async (url, params, method = "GET") => {
  try {
    const { data } = await axios({ method, url, params });

    return data;
  } catch (error) {
    throw new Error(error);
  }
};

const createID = () => Math.random().toString(36).substring(7);

const LESSONS = "lessons";
const ARROW_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABmJLR0QA/wD/AP+gvaeTAAABnUlEQVRoge3ZzUqVQRzH8U/iRbQweiCigjBcJEVBh6QwDILASNy2aNUtdAVeRVfRsstoEUgUKIEW5kvvLR6VGXmac44554wwX5jFMH+e+X2fd2aoVLJwJtNxp/Am6F/INE92GvwJWnYmRjHJKKgipVFFSqOKlEYVKY0qUhpVpDSqSGlUkdKoIqVRRUqjipTGMCKTWMG5TFmm8TLTsQ+ZwCvtYtuq/iuHjeEW6Gbwab925bghB2FeHOw9LibqG4OL3MBmUPsDV/8vbprn+BVMuJaYsDGYyG18Ceq+4fHJxE3zTCyzjmsddY3+InewJZZ4dLJx0yxpL/9BgA3MHqlppEXmsROMb+N+nrhpnuB7EOQzbgbjjX+LLGA3GPuKubxx0zzE3pFAd/fHGt0ii+ITsIXeSNL24YH47G7jnm6Rp+JbclP7xiqGnvih3cMLscgyfgb9DVwfQ9a+9MQyv8UiYT/12i6CW+JvQlf7gEvjCjgMs9rbpkti1SnbFA3/mw7aO5wfZ6jjcgUftRJvtdvVp5bLeI2z4w5SqVQq5fEXMTOSwvhqgGAAAAAASUVORK5CYII=";

async function updateLesson(lesson) {
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
const getArtists = artists =>
  artists?.map(artist => artist.name).join(", ") || "John Doe";

async function authenticateSpotify() {
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
          Authorization: `Basic ${btoa("aca42c0dc02c41989527bbd4735022b9" + ":" + "4e5a491e12284f2690bd5bad7f5a4181")}`,
        },
      }
    );

    return credentials;
  } catch (err) {
    console.error(err);
  }
}

export { ARROW_SRC as A, LESSONS as L, authenticateSpotify as a, apiCall as b, createID as c, debounce as d, getArtists as g, updateLesson as u };
//# sourceMappingURL=helpers-518c23d6.js.map
