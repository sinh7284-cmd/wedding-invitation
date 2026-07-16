// 카카오 디벨로퍼스(https://developers.kakao.com)에서 발급받은 JavaScript 키
// (카카오맵 표시 + 카카오톡 공유 버튼에 함께 사용됩니다)
const KAKAO_JS_KEY = "d830304ea7198638d5dd2b4f80462923";

// 예식 일시 (한국 시간 기준 고정)
const WEDDING_AT = new Date("2026-10-10T12:30:00+09:00");

// 지도 좌표 / 장소명 (지도 표시 + 길안내 버튼용)
const VENUE = {
  name: "카이스트 노천극장",
  lat: 36.3707615,
  lng: 127.3579429
};

init();

// Photo/Sound 폴더에 파일을 추가/삭제한 뒤 deploy.bat을 실행하면
// assets/manifest.json이 다시 생성되어 이 목록이 자동으로 갱신됩니다.
async function init() {
  const manifest = await fetch("assets/manifest.json")
    .then((res) => res.json())
    .catch(() => ({ photos: [], bgm: [] }));

  renderGallery(manifest.photos);
  setupLightbox();
  setupCountdown();
  setupMapLinks();
  setupVenueMap();
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
    img.src = `assets/photos/${encodeURIComponent(file)}`;
    img.loading = "lazy";
    img.draggable = false;
    img.addEventListener("click", () => openLightbox(img.src));
    grid.appendChild(img);
  });
}

/* ---------- 라이트박스 (터치 확대: 최대 배율 제한) ---------- */

const LIGHTBOX_MAX_SCALE = 3;
const LIGHTBOX_DOUBLE_TAP_SCALE = 2;
let lbState = null;

function openLightbox(src) {
  const box = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  lbState = { scale: 1, x: 0, y: 0 };
  applyLightboxTransform();
  box.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").hidden = true;
  document.getElementById("lightbox-img").src = "";
  document.body.style.overflow = "";
  lbState = null;
}

function applyLightboxTransform() {
  const img = document.getElementById("lightbox-img");
  img.style.transform = `translate(${lbState.x}px, ${lbState.y}px) scale(${lbState.scale})`;
}

function clampLightboxPan() {
  // 확대 배율에 비례해 이동 가능한 범위를 제한 (이미지가 화면 밖으로 사라지지 않게)
  const img = document.getElementById("lightbox-img");
  const maxX = (img.clientWidth * (lbState.scale - 1)) / 2;
  const maxY = (img.clientHeight * (lbState.scale - 1)) / 2;
  lbState.x = Math.min(maxX, Math.max(-maxX, lbState.x));
  lbState.y = Math.min(maxY, Math.max(-maxY, lbState.y));
}

function setupLightbox() {
  const stage = document.getElementById("lightbox-stage");
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);

  let lastTap = 0;
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let panStart = null;

  stage.addEventListener("touchstart", (e) => {
    if (!lbState) return;
    if (e.touches.length === 2) {
      pinchStartDist = touchDistance(e.touches);
      pinchStartScale = lbState.scale;
    } else if (e.touches.length === 1) {
      panStart = {
        tx: e.touches[0].clientX,
        ty: e.touches[0].clientY,
        x: lbState.x,
        y: lbState.y
      };
    }
  }, { passive: true });

  stage.addEventListener("touchmove", (e) => {
    if (!lbState) return;
    e.preventDefault();
    if (e.touches.length === 2 && pinchStartDist > 0) {
      const ratio = touchDistance(e.touches) / pinchStartDist;
      // 최대 배율(LIGHTBOX_MAX_SCALE)을 넘지 않도록 제한
      lbState.scale = Math.min(LIGHTBOX_MAX_SCALE, Math.max(1, pinchStartScale * ratio));
      clampLightboxPan();
      applyLightboxTransform();
    } else if (e.touches.length === 1 && panStart && lbState.scale > 1) {
      lbState.x = panStart.x + (e.touches[0].clientX - panStart.tx);
      lbState.y = panStart.y + (e.touches[0].clientY - panStart.ty);
      clampLightboxPan();
      applyLightboxTransform();
    }
  }, { passive: false });

  stage.addEventListener("touchend", (e) => {
    if (!lbState) return;
    if (e.touches.length === 0) {
      pinchStartDist = 0;
      const now = Date.now();
      if (now - lastTap < 300 && !panMoved(e, panStart)) {
        // 더블탭: 1배 <-> 지정 배율 토글
        if (lbState.scale > 1) {
          lbState.scale = 1;
          lbState.x = 0;
          lbState.y = 0;
        } else {
          lbState.scale = LIGHTBOX_DOUBLE_TAP_SCALE;
        }
        applyLightboxTransform();
        lastTap = 0;
      } else {
        lastTap = now;
      }
      panStart = null;
    }
  });

  // 확대 안 된 상태에서 배경(이미지 밖) 클릭 시 닫기 + PC 마우스 지원
  stage.addEventListener("click", (e) => {
    if (e.target === stage && lbState && lbState.scale === 1) closeLightbox();
  });

  // PC: 더블클릭으로 확대/축소 토글
  stage.addEventListener("dblclick", () => {
    if (!lbState) return;
    if (lbState.scale > 1) {
      lbState.scale = 1;
      lbState.x = 0;
      lbState.y = 0;
    } else {
      lbState.scale = LIGHTBOX_DOUBLE_TAP_SCALE;
    }
    applyLightboxTransform();
  });
}

function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function panMoved(e, panStart) {
  if (!panStart || !e.changedTouches || e.changedTouches.length === 0) return false;
  const dx = e.changedTouches[0].clientX - panStart.tx;
  const dy = e.changedTouches[0].clientY - panStart.ty;
  return Math.hypot(dx, dy) > 12;
}

/* ---------- D-day 카운트다운 / 경과 시간 ---------- */

function setupCountdown() {
  const label = document.getElementById("countdown-label");
  const note = document.getElementById("countdown-note");
  const el = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs")
  };

  function tick() {
    const now = new Date();
    let diff = WEDDING_AT - now;
    const passed = diff < 0;
    if (passed) diff = -diff;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000) % 24;
    const mins = Math.floor(diff / 60000) % 60;
    const secs = Math.floor(diff / 1000) % 60;

    el.days.textContent = days;
    el.hours.textContent = hours;
    el.mins.textContent = mins;
    el.secs.textContent = secs;

    if (passed) {
      label.textContent = "우리가 부부가 된 지";
      note.textContent = "2026년 10월 10일, 그날의 축복을 기억합니다";
    } else {
      label.textContent = "결혼식까지 남은 시간";
      note.textContent = `${days}일 뒤, 저희 두 사람이 부부가 됩니다`;
    }
  }

  tick();
  setInterval(tick, 1000);
}

/* ---------- 지도 ---------- */

function setupMapLinks() {
  const { name, lat, lng } = VENUE;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 카카오맵은 웹/모바일 모두 같은 https 링크로 동작
  document.getElementById("link-kakaomap").href =
    `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

  if (isMobile) {
    // tmap:// , nmap:// 은 앱 전용 스킴이라 모바일에서만 동작
    document.getElementById("link-tmap").href =
      `tmap://route?goalname=${encodeURIComponent(name)}&goalx=${lng}&goaly=${lat}`;
    document.getElementById("link-navermap").href =
      `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}`;
  } else {
    // PC: 티맵은 웹 버전이 없어 숨기고, 네이버지도는 웹 지도로 연결
    document.getElementById("link-tmap").hidden = true;
    document.getElementById("link-navermap").href =
      `https://map.naver.com/p/directions/-/${lng},${lat},${encodeURIComponent(name)}/-/transit`;
    document.getElementById("link-navermap").target = "_blank";
  }
}

// 카카오맵 SDK로 화면 안에 지도를 표시합니다. (JavaScript 키 필요)
function setupVenueMap() {
  const mapBox = document.getElementById("map");
  const placeholder = mapBox.querySelector(".venue-map-placeholder");

  if (KAKAO_JS_KEY === "REPLACE_ME") {
    placeholder.textContent = "지도가 곧 제공될 예정입니다. 아래 버튼으로 길안내를 이용해주세요.";
    return;
  }

  const script = document.createElement("script");
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
  script.onload = () => {
    kakao.maps.load(() => {
      const center = new kakao.maps.LatLng(VENUE.lat, VENUE.lng);
      const map = new kakao.maps.Map(mapBox, { center, level: 4 });
      const marker = new kakao.maps.Marker({ position: center });
      marker.setMap(map);
      const overlay = new kakao.maps.CustomOverlay({
        position: center,
        content: '<div style="padding:4px 10px;background:#fffdf7;border:1px solid #8aa87a;border-radius:999px;font-size:12px;color:#5b7355;transform:translateY(-40px);">카이스트 노천극장</div>'
      });
      overlay.setMap(map);
    });
  };
  script.onerror = () => {
    placeholder.textContent = "지도를 불러오지 못했습니다. 아래 버튼으로 길안내를 이용해주세요.";
  };
  document.head.appendChild(script);
}

/* ---------- 확대 방지 (본문) ---------- */

// 본문에서의 핀치줌 / 더블탭줌 / 롱프레스 저장(컨텍스트 메뉴)을 차단합니다.
// 사진 확대는 라이트박스 안에서만 (최대 배율 제한과 함께) 허용됩니다.
// 안드로이드 하드웨어 버튼 조합(볼륨-전원)으로 찍는 스크린샷은 OS 레벨 동작이라
// 웹페이지에서는 감지도 차단도 불가능합니다.
function setupZoomPrevention() {
  const inLightbox = (target) => target.closest && target.closest("#lightbox");

  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1 && !inLightbox(e.target)) e.preventDefault();
    },
    { passive: false }
  );

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      if (inLightbox(e.target)) return;
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "IMG") e.preventDefault();
  });

  document.addEventListener("gesturestart", (e) => {
    if (!inLightbox(e.target)) e.preventDefault();
  });
}

/* ---------- 배경음악 ---------- */

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

/* ---------- 방명록 ---------- */

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

/* ---------- 입장코드 게이트 ---------- */

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

/* ---------- 카카오톡 공유 ---------- */

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
