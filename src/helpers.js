import axios from "axios";

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
export const debounce = (func, wait, immediate) => {
  let timeout;

  return () => {
    let context = this,
      args = arguments;

    let later = () => {
      timeout = null;

      if (!immediate) func.apply(context, args);
    };

    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
};

export const apiCall = async (url, params) => {
  try {
    const { data } = await axios({ method: "GET", url, params });

    return data;
  } catch (error) {
    throw new Error(error);
  }
};

export const createID = Math.random()
  .toString(36)
  .substring(7);

export const LESSONS = "lessons";
