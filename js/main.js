// 카카오 디벨로퍼스(https://developers.kakao.com)에서 발급받은 JavaScript 키
// (카카오맵 표시 + 카카오톡 공유 버튼에 함께 사용됩니다)
const KAKAO_JS_KEY = "d830304ea7198638d5dd2b4f80462923";

// 예식 일시 (한국 시간 기준 고정)
const WEDDING_AT = new Date("2026-10-10T12:30:00+09:00");
const WEDDING_YEAR = 2026;
const WEDDING_MONTH = 10;  // 10월
const WEDDING_DAY = 10;

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
    .catch(() => ({ hero: null, photos: [], videos: [], bgm: [] }));

  setupLeaves();
  renderCalendar();
  renderCarousel(manifest.photos, manifest.videos || []);
  setupLightbox();
  setupCountdown();
  setupMapLinks();
  setupVenueMap();
  setupZoomPrevention();
  setupBgmPlaylist(manifest.bgm);
  setupAccountCopy();
  setupRsvp();
  setupGuestbook();
  setupEntryGate();
  setupKakaoShare();
}

/* ---------- 낙엽 파티클 (히어로) ---------- */

// 가을 낙엽(단풍·은행잎)이 메인 사진 위로 흩날리는 캔버스 애니메이션
function setupLeaves() {
  const canvas = document.getElementById("leaves-canvas");
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  const COLORS = ["#c96f4a", "#d98e4a", "#e3b23c", "#b3552f", "#dfa552"];
  const COUNT = 16;
  let leaves = [];
  let running = true;

  function resize() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function newLeaf(fromTop) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    return {
      x: Math.random() * w,
      y: fromTop ? -20 : Math.random() * h,
      size: 7 + Math.random() * 9,
      speedY: 0.5 + Math.random() * 0.9,
      swayAmp: 28 + Math.random() * 40,
      swayFreq: 0.4 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.5 ? "maple" : "ginkgo",
      t: Math.random() * 100
    };
  }

  function drawLeaf(l) {
    ctx.save();
    ctx.translate(l.x + Math.sin(l.t * l.swayFreq + l.phase) * l.swayAmp * 0.4, l.y);
    ctx.rotate(l.rot);
    ctx.fillStyle = l.color;
    ctx.globalAlpha = 0.86;
    const s = l.size;
    ctx.beginPath();
    if (l.shape === "ginkgo") {
      // 은행잎: 부채꼴
      ctx.moveTo(0, s * 0.6);
      ctx.quadraticCurveTo(-s, s * 0.1, -s * 0.55, -s * 0.55);
      ctx.quadraticCurveTo(0, -s * 0.15, s * 0.55, -s * 0.55);
      ctx.quadraticCurveTo(s, s * 0.1, 0, s * 0.6);
    } else {
      // 단풍잎: 뾰족한 잎 여러 갈래를 단순화한 별 모양
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const outer = s;
        const inner = s * 0.45;
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.lineTo(Math.cos(a + Math.PI / 5) * inner, Math.sin(a + Math.PI / 5) * inner);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }

  let ticking = false;

  function tick() {
    if (!running) {
      ticking = false;
      return;
    }
    ticking = true;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    leaves.forEach((l) => {
      l.t += 0.016;
      l.y += l.speedY;
      l.rot += l.rotSpeed;
      if (l.y > canvas.clientHeight + 24) Object.assign(l, newLeaf(true));
      drawLeaf(l);
    });
    requestAnimationFrame(tick);
  }

  function start() {
    running = true;
    if (!ticking) tick();
  }

  function refresh() {
    const wasEmpty = canvas.width === 0;
    resize();
    if (wasEmpty && canvas.width > 0) {
      leaves = Array.from({ length: COUNT }, () => newLeaf(false));
    }
    start();
  }

  resize();
  leaves = Array.from({ length: COUNT }, () => newLeaf(false));
  // 입장 게이트 때문에 본문이 숨겨진 상태(크기 0)로 초기화될 수 있다.
  // unlock() 시점에 resize 이벤트가 발생되므로 그때 실제 크기로 다시 계산한다.
  addEventListener("resize", refresh);

  // 히어로가 화면 밖으로 스크롤되면 애니메이션 정지 (배터리 절약)
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      start();
    } else {
      running = false;
    }
  }).observe(document.getElementById("hero"));

  start();
}

/* ---------- 달력 ---------- */

function renderCalendar() {
  const box = document.getElementById("calendar");
  const first = new Date(WEDDING_YEAR, WEDDING_MONTH - 1, 1);
  const daysInMonth = new Date(WEDDING_YEAR, WEDDING_MONTH, 0).getDate();
  const startDow = first.getDay();

  let html = `<p class="calendar-month">${WEDDING_YEAR}년 ${WEDDING_MONTH}월</p><table><thead><tr>`;
  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  dows.forEach((d, i) => {
    html += `<th class="${i === 0 ? "sun" : ""}">${d}</th>`;
  });
  html += "</tr></thead><tbody><tr>";

  for (let i = 0; i < startDow; i++) html += "<td></td>";
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = (startDow + day - 1) % 7;
    if (dow === 0 && day !== 1) html += "</tr><tr>";
    const cls = [day === WEDDING_DAY ? "wedding-day" : "", dow === 0 ? "sun" : ""].join(" ").trim();
    html += `<td class="${cls}">${day}</td>`;
  }
  html += `</tr></tbody></table><p class="calendar-note">10월 10일 토요일 낮 12시 30분</p>`;
  box.innerHTML = html;
}

/* ---------- 갤러리 (스와이프 캐러셀: 사진 + 영상) ---------- */

function renderCarousel(photoFiles, videoFiles) {
  const carousel = document.getElementById("carousel");
  const dotsBox = document.getElementById("carousel-dots");
  const slides = [];

  photoFiles.forEach((file) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    const img = document.createElement("img");
    img.src = `assets/photos/${encodeURIComponent(file)}`;
    img.loading = "lazy";
    img.draggable = false;
    img.addEventListener("click", () => openLightbox(img.src));
    slide.appendChild(img);
    slides.push(slide);
  });

  videoFiles.forEach((file) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    const video = document.createElement("video");
    video.src = `Photo/video/${encodeURIComponent(file)}`;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    slide.appendChild(video);
    slides.push(slide);
  });

  slides.forEach((s) => carousel.appendChild(s));

  // 인디케이터 점
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dotsBox.appendChild(dot);
  });

  carousel.addEventListener("scroll", () => {
    // 슬라이드 간격(gap)을 포함한 실제 스냅 간격으로 현재 인덱스 계산
    const stride = slides.length > 1
      ? slides[1].offsetLeft - slides[0].offsetLeft
      : carousel.clientWidth;
    const idx = Math.round(carousel.scrollLeft / stride);
    [...dotsBox.children].forEach((d, i) => d.classList.toggle("active", i === idx));
    // 슬라이드가 넘어가면 재생 중이던 영상 일시정지
    carousel.querySelectorAll("video").forEach((v) => {
      const slideIdx = slides.findIndex((s) => s.contains(v));
      if (slideIdx !== idx && !v.paused) v.pause();
    });
  }, { passive: true });
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
      placeholder.remove();
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
    if (e.target.tagName === "IMG" || e.target.tagName === "VIDEO") e.preventDefault();
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

/* ---------- 계좌번호 복사 ---------- */

function setupAccountCopy() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const number = btn.parentElement.querySelector(".account-number").dataset.copy;
      try {
        await navigator.clipboard.writeText(number);
        const orig = btn.textContent;
        btn.textContent = "복사됨!";
        setTimeout(() => { btn.textContent = orig; }, 1500);
      } catch {
        prompt("아래 계좌번호를 길게 눌러 복사하세요", number);
      }
    });
  });
}

/* ---------- 참석여부 (RSVP) ---------- */

function setupRsvp() {
  const form = document.getElementById("rsvp-form");
  const done = document.getElementById("rsvp-done");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("rsvp-name").value.trim();
    if (!name) return;

    const side = form.querySelector('input[name="rsvp-side"]:checked').value;
    const attend = form.querySelector('input[name="rsvp-attend"]:checked').value;
    const count = parseInt(document.getElementById("rsvp-count").value, 10);

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await db.collection("rsvp").add({
        name,
        side,
        attend,
        count,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      form.reset();
      done.hidden = false;
      setTimeout(() => { done.hidden = true; }, 4000);
    } finally {
      btn.disabled = false;
    }
  });
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
    // 숨겨진 상태에서 크기 0으로 초기화된 요소들(낙엽 캔버스, 지도)의 재계산 유도
    window.dispatchEvent(new Event("resize"));
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
