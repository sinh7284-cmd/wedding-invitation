const loginBox = document.getElementById("login-box");
const panelBox = document.getElementById("panel-box");
const loginError = document.getElementById("login-error");
const saveStatus = document.getElementById("save-status");
const entryToggle = document.getElementById("entry-toggle");
const entryCodeValue = document.getElementById("entry-code-value");

auth.onAuthStateChanged((user) => {
  loginBox.hidden = !!user;
  panelBox.hidden = !user;
  if (user) loadSettings();
});

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
