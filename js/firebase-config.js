// Firebase 콘솔(https://console.firebase.google.com) > 프로젝트 설정 > 일반 탭에서
// "SDK 설정 및 구성" 값을 그대로 복사해서 아래에 붙여넣으세요.
const firebaseConfig = {
  apiKey: "AIzaSyAQ40wyUHFn_KkeF8Km_B8TQxIigeM-Fcg",
  authDomain: "wedding-25767.firebaseapp.com",
  projectId: "wedding-25767",
  storageBucket: "wedding-25767.firebasestorage.app",
  messagingSenderId: "859658192958",
  appId: "1:859658192958:web:d2a8ccef05495faf91a96f"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
