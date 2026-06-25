import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1pvj8S6MbQ_EIs5YuMUz917wFRV1t4Fw",
  authDomain: "myinvitationcard-405e1.firebaseapp.com",
  projectId: "myinvitationcard-405e1",
  storageBucket: "myinvitationcard-405e1.firebasestorage.app",
  messagingSenderId: "55444531950",
  appId: "1:55444531950:web:bbf1ea91e1330032b7e1ff"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);

export { auth, googleProvider, storage };