import App from "./App.svelte";

const app = new App({
  target: document.body,
  hydrate: true
});

// const responseObserver = {
//   observe: (aSubject, aTopic, aData) => {
//     if (aTopic == "http-on-examine-response") {
//       let channel = aSubject.QueryInterface(Ci.nsIHttpChannel);

//       try {
//         // getResponseHeader will throw if the header isn't set
//         let hasXFO = channel.getResponseHeader("X-Frame-Options");
//         console.log("LOG: hasXFO", hasXFO);

//         if (hasXFO) {
//           // Header found, disable it
//           channel.setResponseHeader("X-Frame-Options", "", false);
//         }
//       } catch (e) {}
//     }
//   },

//   register: () => {
//     console.log(this);
//     this.addObserver(this, "http-on-examine-response", false);
//   }
// };

// responseObserver.register();

export default app;
