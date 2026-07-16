const loginBox = document.getElementById("login-box");
const panelBox = document.getElementById("panel-box");
const loginError = document.getElementById("login-error");
const saveStatus = document.getElementById("save-status");
const entryToggle = document.getElementById("entry-toggle");
const entryCodeValue = document.getElementById("entry-code-value");

auth.onAuthStateChanged((user) => {
  loginBox.hidden = !!user;
  panelBox.hidden = !user;
  if (user) {
    loadSettings();
    loadRsvp();
  }
});

function loadRsvp() {
  const summary = document.getElementById("rsvp-summary");
  const list = document.getElementById("rsvp-list");

  db.collection("rsvp")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      let attendCount = 0;
      let attendPeople = 0;
      let declineCount = 0;
      list.innerHTML = "";

      snapshot.forEach((doc) => {
        const { name, side, attend, count } = doc.data();
        if (attend === "참석") {
          attendCount += 1;
          attendPeople += count || 1;
        } else {
          declineCount += 1;
        }
        const li = document.createElement("li");
        li.textContent = `[${side}] ${name} — ${attend}` + (attend === "참석" ? ` (${count}명)` : "");
        list.appendChild(li);
      });

      summary.textContent = snapshot.empty
        ? "아직 응답이 없습니다."
        : `참석 ${attendCount}건 (총 ${attendPeople}명) · 불참 ${declineCount}건`;
    }, () => {
      summary.textContent = "명단을 불러오지 못했습니다.";
    });
}

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;
  loginError.hidden = true;
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    loginError.hidden = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());

async function loadSettings() {
  const doc = await db.collection("config").doc("settings").get();
  const data = doc.exists ? doc.data() : { entryCodeEnabled: false, entryCode: "" };
  entryToggle.checked = !!data.entryCodeEnabled;
  entryCodeValue.value = data.entryCode || "";
}

document.getElementById("save-btn").addEventListener("click", async () => {
  saveStatus.hidden = true;
  await db.collection("config").doc("settings").set({
    entryCodeEnabled: entryToggle.checked,
    entryCode: entryCodeValue.value.trim()
  });
  saveStatus.textContent = "저장되었습니다";
  saveStatus.hidden = false;
});
