// 카카오 디벨로퍼스(https://developers.kakao.com)에서 발급받은 JavaScript 키
// (카카오맵 표시 + 카카오톡 공유 버튼에 함께 사용됩니다)
const KAKAO_JS_KEY = "d830304ea7198638d5dd2b4f80462923";

// 아래 값들은 content.json이 로드되면 그 내용으로 덮어써집니다.
// (문구/계좌/연락처 수정은 content.json에서 하세요)
let WEDDING_AT = new Date("2026-10-10T12:30:00+09:00");
let WEDDING_YEAR = 2026;
let WEDDING_MONTH = 10;
let WEDDING_DAY = 10;
let VENUE = {
  name: "카이스트 노천극장",
  lat: 36.3707615,
  lng: 127.3579429
};

init();

// Photo/Sound 폴더에 파일을 추가/삭제하거나 content.json의 문구를 고친 뒤
// deploy.bat을 실행하면 사이트에 반영됩니다.
async function init() {
  const [manifest, content] = await Promise.all([
    fetch("assets/manifest.json")
      .then((res) => res.json())
      .catch(() => ({ hero: null, photos: [], videos: [], bgm: [] })),
    fetch("content.json")
      .then((res) => res.json())
      .catch(() => null)
  ]);

  if (content) applyContent(content);

  pinHeroHeight();
  setupHeroMedia(manifest);
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
  setupSectionNav();
}

/* ---------- content.json 내용 적용 ---------- */

function applyContent(c) {
  // 예식 일시 / 장소
  if (c["예식일시"]) {
    WEDDING_AT = new Date(c["예식일시"]);
    const m = c["예식일시"].match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      WEDDING_YEAR = parseInt(m[1], 10);
      WEDDING_MONTH = parseInt(m[2], 10);
      WEDDING_DAY = parseInt(m[3], 10);
    }
  }
  if (c["장소명"]) VENUE.name = c["장소명"];
  if (c["지도위도"]) VENUE.lat = c["지도위도"];
  if (c["지도경도"]) VENUE.lng = c["지도경도"];

  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el && text) el.textContent = text;
  };

  // 히어로
  const heroNames = document.querySelector(".hero-names");
  if (heroNames && c["신랑이름"] && c["신부이름"]) {
    heroNames.innerHTML = `${escapeHtml(c["신랑이름"])} <span class="amp">그리고</span> ${escapeHtml(c["신부이름"])}`;
  }
  setText(".hero-date", c["예식일시문구"]);
  setText(".hero-venue", c["장소명"]);

  // 인사말
  if (Array.isArray(c["인사말"])) {
    document.querySelector(".greeting-text").innerHTML =
      c["인사말"].map((line) => (line === "" ? "" : escapeHtml(line))).join("<br>");
  }
  const parents = document.querySelector(".greeting-parents");
  if (parents && c["신랑혼주"] && c["신부혼주"]) {
    parents.innerHTML =
      `<span class="parents-line">${escapeHtml(c["신랑혼주"])}<small>의 아들</small><strong>${escapeHtml(c["신랑끝자"] || c["신랑이름"])}</strong></span>` +
      `<span class="parents-line">${escapeHtml(c["신부혼주"])}<small>의 딸</small><strong>${escapeHtml(c["신부끝자"] || c["신부이름"])}</strong></span>`;
  }

  // 섹션 제목
  const titleMap = {
    greeting: "인사말", countdown: "우리의날", gallery: "갤러리", location: "오시는길",
    gift: "마음전하실곳", contacts: "연락처", rsvp: "참석여부", guestbook: "축하메시지"
  };
  const titles = c["섹션제목"] || {};
  Object.entries(titleMap).forEach(([sectionId, key]) => {
    const h2 = document.querySelector(`#${sectionId} .section-title`);
    if (h2 && titles[key]) h2.textContent = titles[key];
  });

  // 오시는 길
  const addr = document.querySelector(".location-address");
  if (addr && c["장소명"] && c["주소"]) {
    addr.innerHTML = `${escapeHtml(c["장소명"])}<br>${escapeHtml(c["주소"])}`;
  }

  // 마음 전하실 곳
  if (c["계좌안내문구"]) {
    document.querySelector(".gift-desc").innerHTML =
      c["계좌안내문구"].split("\n").map(escapeHtml).join("<br>");
  }
  if (c["계좌번호"]) renderAccounts(c["계좌번호"]);

  // 연락처
  if (c["연락처"]) renderContacts(c["연락처"]);

  // 참석여부 안내
  if (c["참석여부안내"]) {
    document.querySelector(".rsvp-desc").innerHTML =
      c["참석여부안내"].split("\n").map(escapeHtml).join("<br>");
  }

  // 하단 문구
  setText(".footer-note", c["하단문구"]);
}

function renderAccounts(accounts) {
  const groups = document.querySelectorAll("#gift .account-group");
  const sides = ["신랑측", "신부측"];
  groups.forEach((group, i) => {
    const side = sides[i];
    const rows = accounts[side];
    if (!rows) return;
    group.querySelector("summary").textContent = `${side} 계좌번호`;
    const ul = group.querySelector(".account-list");
    ul.innerHTML = "";
    rows.forEach((row) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<div class="account-info"><small>${escapeHtml(row["관계"])}</small>` +
        `<span class="account-holder">${escapeHtml(row["이름"])}</span>` +
        `<span class="account-number">${escapeHtml(row["계좌"])}</span></div>` +
        `<button class="copy-btn" type="button">복사</button>`;
      ul.appendChild(li);
    });
  });
}

function renderContacts(contacts) {
  const targets = {
    "신랑측": document.getElementById("contact-list-groom"),
    "신부측": document.getElementById("contact-list-bride")
  };
  Object.entries(targets).forEach(([side, ul]) => {
    const rows = contacts[side];
    if (!ul || !rows) return;
    ul.innerHTML = "";
    rows.forEach((row) => {
      const digits = (row["전화"] || "").replace(/[^0-9]/g, "");
      const li = document.createElement("li");
      li.innerHTML =
        `<div class="contact-info"><small>${escapeHtml(row["관계"])}</small>` +
        `<span class="contact-name">${escapeHtml(row["이름"])}</span></div>` +
        `<div class="contact-btns">` +
        `<a class="contact-btn call" href="tel:${digits}" aria-label="전화 걸기">📞</a>` +
        `<a class="contact-btn sms" href="sms:${digits}" aria-label="문자 보내기">✉️</a>` +
        `</div>`;
      ul.appendChild(li);
    });
  });
}

/* ---------- 하단 바로가기 내비게이션 ---------- */

function setupSectionNav() {
  const nav = document.getElementById("section-nav");
  const links = [...nav.querySelectorAll("a")];
  const sections = links.map((a) => document.querySelector(a.getAttribute("href")));

  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  function updateActive() {
    const pos = window.scrollY + window.innerHeight * 0.35;
    let activeIdx = -1;
    sections.forEach((sec, i) => {
      if (sec && sec.offsetTop <= pos) activeIdx = i;
    });
    links.forEach((a, i) => a.classList.toggle("active", i === activeIdx));
    if (activeIdx >= 0) {
      links[activeIdx].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }

  window.addEventListener("scroll", updateActive, { passive: true });
  updateActive();
}

/* ---------- 히어로 미디어 (사진/영상) ---------- */

// Photo/main 폴더에 영상(mp4)이 있으면 메인 사진을 배경 영상으로 교체한다.
// 자동재생은 음소거 상태에서만 허용되며, 재생이 차단되는 환경(저전력 모드 등)
// 에서는 poster(사진)가 대신 보인다.
function setupHeroMedia(manifest) {
  if (!manifest.heroVideo) return;
  const img = document.getElementById("hero-photo");
  const video = document.createElement("video");
  video.className = "hero-photo";
  video.src = `assets/${encodeURIComponent(manifest.heroVideo)}`;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("aria-hidden", "true");
  if (manifest.hero) video.poster = "assets/hero.jpg";
  img.replaceWith(video);
  video.play().catch(() => {});
}

/* ---------- 히어로 높이 고정 ---------- */

// 일부 모바일 브라우저(카카오톡 인앱 등)는 스크롤 중 주소창이 접힐 때
// vh/svh 값을 다시 계산해 사진이 확대되어 보인다.
// 로드 시점의 화면 높이를 픽셀로 고정해 스크롤 중에는 절대 변하지 않게 한다.
function pinHeroHeight() {
  const hero = document.getElementById("hero");
  const set = () => {
    hero.style.height = Math.min(window.innerHeight, 940) + "px";
  };
  set();
  // 가로/세로 회전 시에만 다시 계산 (주소창 변화로 인한 resize는 무시)
  window.addEventListener("orientationchange", () => setTimeout(set, 300));
}

/* ---------- 비눗방울 파티클 (히어로) ---------- */

// 투명한 비눗방울이 메인 사진 위로 떠다니는 캔버스 애니메이션
function setupLeaves() {
  const canvas = document.getElementById("leaves-canvas");
  if (!canvas || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
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
      size: 5 + Math.random() * 11,
      speedY: 0.5 + Math.random() * 0.9,
      swayAmp: 28 + Math.random() * 40,
      swayFreq: 0.4 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      t: Math.random() * 100
    };
  }

  function drawLeaf(l) {
    const s = l.size;
    ctx.save();
    ctx.translate(l.x + Math.sin(l.t * l.swayFreq + l.phase) * l.swayAmp * 0.4, l.y);

    // 방울 본체: 아주 옅은 반투명 원
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.10)";
    ctx.fill();

    // 테두리 링
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 왼쪽 위 반사광
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.35, s * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
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
  const thumbsBox = document.getElementById("carousel-thumbs");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  const slides = [];
  const thumbs = [];

  photoFiles.forEach((file) => {
    const src = `assets/photos/${encodeURIComponent(file)}`;

    const slide = document.createElement("div");
    slide.className = "slide";
    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.draggable = false;
    img.addEventListener("click", () => openLightbox(src));
    slide.appendChild(img);
    slides.push(slide);

    const thumb = document.createElement("img");
    thumb.className = "thumb";
    thumb.src = src;
    thumb.loading = "lazy";
    thumb.draggable = false;
    thumbs.push(thumb);
  });

  // 화면에 보이는 영상만 자동 재생 (브라우저 정책상 자동 재생은 음소거 필수)
  const videoAutoplay = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target;
      if (entry.isIntersecting) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.6 });

  videoFiles.forEach((file) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    const video = document.createElement("video");
    video.src = `Photo/video/${encodeURIComponent(file)}`;
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = "metadata";
    videoAutoplay.observe(video);
    slide.appendChild(video);
    slides.push(slide);

    const thumb = document.createElement("div");
    thumb.className = "thumb thumb-video";
    thumb.textContent = "▶";
    thumbs.push(thumb);
  });

  slides.forEach((s) => carousel.appendChild(s));
  thumbs.forEach((t, i) => {
    t.addEventListener("click", () => goTo(i));
    thumbsBox.appendChild(t);
  });
  if (thumbs.length > 0) thumbs[0].classList.add("active");

  if (slides.length <= 1) {
    prevBtn.hidden = true;
    nextBtn.hidden = true;
  }

  function stride() {
    return slides.length > 1
      ? slides[1].offsetLeft - slides[0].offsetLeft
      : carousel.clientWidth;
  }

  function currentIdx() {
    return Math.round(carousel.scrollLeft / stride());
  }

  // PC에서는 스와이프가 안 되므로 좌우 화살표와 썸네일 클릭으로 이동
  function goTo(i) {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    carousel.scrollTo({ left: stride() * idx, behavior: "smooth" });
  }

  prevBtn.addEventListener("click", () => goTo(currentIdx() - 1));
  nextBtn.addEventListener("click", () => goTo(currentIdx() + 1));

  carousel.addEventListener("scroll", () => {
    const idx = currentIdx();
    thumbs.forEach((t, i) => t.classList.toggle("active", i === idx));
    // 활성 썸네일이 썸네일 줄 가운데쯤 오도록 따라 스크롤
    const active = thumbs[idx];
    if (active) {
      thumbsBox.scrollTo({
        left: active.offsetLeft - (thumbsBox.clientWidth - active.clientWidth) / 2,
        behavior: "smooth"
      });
    }
    // 슬라이드가 넘어가면 재생 중이던 영상 일시정지
    carousel.querySelectorAll("video").forEach((v) => {
      const slideIdx = slides.findIndex((s) => s.contains(v));
      if (slideIdx !== idx && !v.paused) v.pause();
    });
  }, { passive: true });
}

/* ---------- 라이트박스 (터치 확대: 최대 배율 제한) ---------- */

// 1 = 확대(핀치줌/더블탭줌) 완전 차단. 큰 화면 보기만 허용.
const LIGHTBOX_MAX_SCALE = 1;
const LIGHTBOX_DOUBLE_TAP_SCALE = 1;
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
        content: `<div style="padding:4px 10px;background:#fffdf7;border:1px solid #8aa87a;border-radius:999px;font-size:12px;color:#5b7355;transform:translateY(-40px);">${VENUE.name}</div>`
      });
      overlay.setMap(map);

      // 입장 게이트 등으로 숨겨진 상태에서 초기화되면 중심이 어긋나므로
      // 크기가 바뀔 때마다 지도를 다시 정렬하고 장소를 중앙에 놓는다.
      const recenter = () => {
        map.relayout();
        map.setCenter(center);
      };
      window.addEventListener("resize", recenter);
      setTimeout(recenter, 300);
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
  let userTurnedOff = false;

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
      userTurnedOff = true;
    } else {
      bgm.play().catch(() => {});
      btn.textContent = "🔊";
    }
    playing = !playing;
  });

  // 브라우저 정책상 소리 있는 자동재생은 차단되므로,
  // 방문자가 화면을 처음 터치/클릭하는 순간 음악을 자동 시작한다.
  // (스피커 버튼으로 직접 끈 경우에는 다시 켜지 않음)
  function autoStart() {
    if (!playing && !userTurnedOff) {
      bgm.play().then(() => {
        playing = true;
        btn.textContent = "🔊";
      }).catch(() => {});
    }
  }
  document.addEventListener("touchstart", autoStart, { once: true, passive: true });
  document.addEventListener("click", autoStart, { once: true });

  function loadTrack(index) {
    bgm.src = `Sound/${encodeURIComponent(bgmFiles[index])}`;
  }
}

/* ---------- 계좌번호 복사 ---------- */

function setupAccountCopy() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      // 화면 표시 텍스트("OO은행 000-0000-...")에서 숫자만 추출해 복사한다.
      // 은행 앱 계좌번호 입력칸에 바로 붙여넣을 수 있게 하기 위함.
      const displayed = btn.parentElement.querySelector(".account-number").textContent;
      const number = displayed.replace(/[^0-9]/g, "");
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
