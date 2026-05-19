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
    const icon = document.getElementById("eyeIcon");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      if (icon) {
        icon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/>
          <circle cx="12" cy="12" r="3"/>
        `;
      }
    } else {
      passwordInput.type = "password";
      if (icon) {
        icon.innerHTML = `
          <path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a21.8 21.8 0 015.06-6.94"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        `;
      }
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