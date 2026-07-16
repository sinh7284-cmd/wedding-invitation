// 카카오 디벨로퍼스(https://developers.kakao.com)에서 발급받은 JavaScript 키
const KAKAO_JS_KEY = "REPLACE_ME";

// 지도 좌표 / 장소명 (오시는 길 버튼용)
const VENUE = {
  name: "OO웨딩홀",
  lat: 37.5665,
  lng: 126.9780
};

init();

// Photo/Sound 폴더에 파일을 추가/삭제한 뒤 update-media.bat을 실행하면
// assets/manifest.json이 다시 생성되어 이 목록이 자동으로 갱신됩니다.
async function init() {
  const manifest = await fetch("assets/manifest.json")
    .then((res) => res.json())
    .catch(() => ({ photos: [], bgm: [] }));

  renderGallery(manifest.photos);
  setupMapLinks();
  setupZoomPrevention();
  setupBgmPlaylist(manifest.bgm);
  setupGuestbook();
  setupEntryGate();
  setupKakaoShare();
}

function renderGallery(photoFiles) {
  const grid = document.getElementById("gallery-grid");
  photoFiles.forEach((file) => {
    const img = document.createElement("img");
    img.src = `Photo/${encodeURIComponent(file)}`;
    img.loading = "lazy";
    img.draggable = false;
    grid.appendChild(img);
  });
}

function setupMapLinks() {
  const { name, lat, lng } = VENUE;
  document.getElementById("link-tmap").href =
    `tmap://route?goalname=${encodeURIComponent(name)}&goalx=${lng}&goaly=${lat}`;
  document.getElementById("link-kakaomap").href =
    `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
  document.getElementById("link-navermap").href =
    `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}`;
}

// 핀치줌 / 더블탭줌 / 롱프레스 저장(컨텍스트 메뉴)을 차단합니다.
// 안드로이드 하드웨어 버튼 조합(볼륨-전원)으로 찍는 스크린샷은 OS 레벨 동작이라
// 웹페이지에서는 감지도 차단도 불가능합니다.
function setupZoomPrevention() {
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });

  document.addEventListener("gesturestart", (e) => e.preventDefault());
}

// 여러 곡을 순서대로 재생하다가 마지막 곡이 끝나면 첫 곡으로 돌아가
// 재생목록 전체를 무한 반복합니다.
function setupBgmPlaylist(bgmFiles) {
  const bgm = document.getElementById("bgm");
  const btn = document.getElementById("bgm-toggle");

  if (!bgmFiles || bgmFiles.length === 0) {
    btn.hidden = true;
    return;
  }

  let trackIndex = 0;
  let playing = false;

  loadTrack(trackIndex);

  bgm.addEventListener("ended", () => {
    trackIndex = (trackIndex + 1) % bgmFiles.length;
    loadTrack(trackIndex);
    bgm.play().catch(() => {});
  });

  btn.addEventListener("click", () => {
    if (playing) {
      bgm.pause();
      btn.textContent = "🔇";
    } else {
      bgm.play().catch(() => {});
      btn.textContent = "🔊";
    }
    playing = !playing;
  });

  function loadTrack(index) {
    bgm.src = `Sound/${encodeURIComponent(bgmFiles[index])}`;
  }
}

function setupGuestbook() {
  const list = document.getElementById("guestbook-list");
  const form = document.getElementById("guestbook-form");

  db.collection("messages")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      list.innerHTML = "";
      snapshot.forEach((doc) => {
        const { name, message } = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `<div class="g-name">${escapeHtml(name)}</div><div class="g-message">${escapeHtml(message)}</div>`;
        list.appendChild(li);
      });
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("guestbook-name").value.trim();
    const message = document.getElementById("guestbook-message").value.trim();
    if (!name || !message) return;

    await db.collection("messages").add({
      name,
      message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    form.reset();
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// config/settings 문서의 entryCodeEnabled 값에 따라 입장코드 게이트를 보여줍니다.
// admin.html에서 관리자가 이 값을 토글할 수 있습니다.
function setupEntryGate() {
  const gate = document.getElementById("entry-gate");
  const input = document.getElementById("entry-code-input");
  const submitBtn = document.getElementById("entry-code-submit");
  const errorMsg = document.getElementById("entry-code-error");

  db.collection("config")
    .doc("settings")
    .get()
    .then((doc) => {
      const data = doc.exists ? doc.data() : { entryCodeEnabled: false };

      if (!data.entryCodeEnabled || sessionStorage.getItem("entryUnlocked") === "1") {
        unlock();
        return;
      }

      gate.hidden = false;
      submitBtn.addEventListener("click", () => {
        if (input.value === data.entryCode) {
          sessionStorage.setItem("entryUnlocked", "1");
          gate.hidden = true;
          unlock();
        } else {
          errorMsg.hidden = false;
        }
      });
    })
    .catch(() => {
      // config 문서가 없거나 오류가 나면 안전하게 그냥 공개
      unlock();
    });

  function unlock() {
    document.body.classList.remove("gate-locked");
  }
}

function setupKakaoShare() {
  const btn = document.getElementById("kakao-share-btn");
  if (!window.Kakao || KAKAO_JS_KEY === "REPLACE_ME") {
    btn.hidden = true;
    return;
  }
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY);

  btn.addEventListener("click", () => {
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: document.title,
        description: document.querySelector('meta[name="description"]').content,
        imageUrl: document.querySelector('meta[property="og:image"]').content,
        link: {
          mobileWebUrl: location.href,
          webUrl: location.href
        }
      }
    });
  });
}
