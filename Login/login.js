import { auth, db } from "./api.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.querySelector(".form");
const loginInput = document.querySelector('.form input[type="text"]');
const passwordInput = document.getElementById("password");
const rememberCheckbox = document.querySelector('.form input[type="checkbox"]');
const submitButton = document.querySelector(".form button");

let isRedirecting = false;

if (!form || !loginInput || !passwordInput || !rememberCheckbox || !submitButton) {
  console.warn("login.js: عناصر تسجيل الدخول غير موجودة في هذه الصفحة");
} else {

  let messageBox = document.createElement("div");
  messageBox.className = "login-message";
  messageBox.style.marginTop = "12px";
  messageBox.style.padding = "12px";
  messageBox.style.borderRadius = "16px";
  messageBox.style.fontSize = "14px";
  messageBox.style.display = "none";
  messageBox.style.textAlign = "right";
  form.appendChild(messageBox);

  function showMessage(message, type = "error") {
    messageBox.textContent = message;
    messageBox.style.display = "block";

    if (type === "success") {
      messageBox.style.background = "#dcfce7";
      messageBox.style.color = "#166534";
      messageBox.style.border = "1px solid #bbf7d0";
    } else if (type === "info") {
      messageBox.style.background = "#dbeafe";
      messageBox.style.color = "#1d4ed8";
      messageBox.style.border = "1px solid #bfdbfe";
    } else {
      messageBox.style.background = "#fee2e2";
      messageBox.style.color = "#991b1b";
      messageBox.style.border = "1px solid #fecaca";
    }
  }

  function clearMessage() {
    messageBox.style.display = "none";
    messageBox.textContent = "";
  }

  function togglePassword() {

    const passwordInput = document.getElementById("password");
    const eyeIcon = document.getElementById("eyeIcon");
  
    if(passwordInput.type === "password"){
  
      passwordInput.type = "text";
  
      eyeIcon.innerHTML = `
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
      <path d="m2 2 20 20"/>
      `;
  
    } else {
  
      passwordInput.type = "password";
  
      eyeIcon.innerHTML = `
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
      <circle cx="12" cy="12" r="3"/>
      `;
  
    }
  
  }

  window.togglePassword = togglePassword;

  async function findFirebaseUser(loginValue, passwordValue) {
    const normalized = loginValue.trim().toLowerCase();
    let loginEmail = normalized;

    if (!normalized.includes("@")) {
      const querySnapshot = await getDocs(collection(db, "users"));
      let foundEmail = "";

      querySnapshot.forEach((docItem) => {
        const user = docItem.data();
        const username = String(user.username || "").trim().toLowerCase();

        if (username === normalized) {
          foundEmail = String(user.email || "").trim().toLowerCase();
        }
      });

      if (!foundEmail) {
        throw new Error("USER_NOT_FOUND");
      }

      loginEmail = foundEmail;
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      loginEmail,
      passwordValue.trim()
    );

    const authUser = userCredential.user;
    const userSnap = await getDoc(doc(db, "users", authUser.uid));

    if (!userSnap.exists()) {
      throw new Error("USER_DOC_NOT_FOUND");
    }

    const user = userSnap.data();
    const status = String(user.status || "").trim().toLowerCase();

    if (status !== "active") {
      throw new Error("ACCOUNT_INACTIVE");
    }

    return {
      id: authUser.uid,
      name: user.fullName || user.name || "",
      fullName: user.fullName || user.name || "",
      email: user.email || authUser.email || "",
      role: user.role || "",
      username: user.username || "",
      department: user.department || "",
      status: user.status || ""
    };
  }

  function savePortalUser(user, remember) {
    const data = {
      isLoggedIn: true,
      otpVerified: false,
      remember: remember,
      user: user
    };

    localStorage.removeItem("portalUser");
    sessionStorage.removeItem("portalUser");

    if (remember) {
      localStorage.setItem("portalPendingAuth", JSON.stringify(data));
      sessionStorage.removeItem("portalPendingAuth");
    } else {
      sessionStorage.setItem("portalPendingAuth", JSON.stringify(data));
      localStorage.removeItem("portalPendingAuth");
    }
  }

  function setLoadingState(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.style.opacity = isLoading ? "0.7" : "1";
    submitButton.style.cursor = isLoading ? "not-allowed" : "pointer";
    submitButton.innerHTML = isLoading
      ? `جاري التحقق...`
      : `تسجيل الدخول 
        <div class="arrow-wrapper">
          <div class="arrow"></div>
        </div>`;
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearMessage();

    if (isRedirecting) return;

    const loginValue = loginInput.value.trim();
    const passwordValue = passwordInput.value.trim();
    const remember = rememberCheckbox.checked;

    if (!loginValue || !passwordValue) {
      showMessage("الرجاء إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoadingState(true);
    showMessage("جاري التحقق من بيانات الدخول...", "info");

    try {
      const matchedUser = await findFirebaseUser(loginValue, passwordValue);

      await updateDoc(doc(db, "users", matchedUser.id), {
        lastLoginAt: serverTimestamp()
      });

      savePortalUser(matchedUser, remember);

      showMessage("تم التحقق من البيانات، جاري الانتقال لرمز التحقق...", "success");
      setLoadingState(false);

      isRedirecting = true;

      setTimeout(() => {
        window.location.replace("./verify.html");
      }, 150);

    } catch (error) {
      console.error("Login error:", error);
      setLoadingState(false);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-email"
      ) {
        showMessage("اسم المستخدم أو كلمة المرور غير صحيحة.");
      } else if (error.message === "ACCOUNT_INACTIVE") {
        showMessage("الحساب غير نشط.");
      } else if (error.message === "USER_DOC_NOT_FOUND") {
        showMessage("بيانات المستخدم غير موجودة في قاعدة البيانات.");
      } else if (error.message === "USER_NOT_FOUND") {
        showMessage("اسم المستخدم غير موجود.");
      } else {
        showMessage("حدث خطأ أثناء تسجيل الدخول.");
      }
    }
  }

  form.addEventListener("submit", handleLogin);
}