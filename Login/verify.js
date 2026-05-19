console.log("verify loaded");

function getPendingAuth() {
  return (
    localStorage.getItem("portalPendingAuth") ||
    sessionStorage.getItem("portalPendingAuth")
  );
}

function saveFinalUser(user, remember) {
  const data = {
    isLoggedIn: true,
    otpVerified: true,
    user: user
  };

  if (remember) {
    localStorage.setItem("portalUser", JSON.stringify(data));
    sessionStorage.removeItem("portalUser");
  } else {
    sessionStorage.setItem("portalUser", JSON.stringify(data));
    localStorage.removeItem("portalUser");
  }
}

function redirectByRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (normalizedRole === "admin") {
    window.location.replace("../admin.html");
  } else if (normalizedRole === "balady") {
    window.location.replace("../balady.html");
  } else if (normalizedRole === "health") {
    window.location.replace("../health.html");
  } else {
    const msg = document.getElementById("msg");
    if (msg) {
      msg.innerText = "صلاحية غير معروفة: " + role;
      msg.style.color = "red";
    }
  }
}

window.verifyCode = function () {
  const msg = document.getElementById("msg");
  const inputEl = document.getElementById("verifyCode");

  if (!msg || !inputEl) return;

  const input = inputEl.value.trim();

  if (input.length < 4) {
    msg.innerText = "أدخل كود أكثر من 4 أرقام";
    msg.style.color = "red";
    return;
  }

  const stored = getPendingAuth();

  if (!stored) {
    msg.innerText = "انتهت الجلسة، سجل دخول من جديد";
    msg.style.color = "red";
    return;
  }

  let parsed;

  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    console.error(error);
    msg.innerText = "خطأ في البيانات";
    msg.style.color = "red";
    return;
  }

  if (!parsed.user || !parsed.user.role) {
    msg.innerText = "بيانات المستخدم غير مكتملة";
    msg.style.color = "red";
    return;
  }

  saveFinalUser(parsed.user, parsed.remember || false);

  localStorage.removeItem("portalPendingAuth");
  sessionStorage.removeItem("portalPendingAuth");

  msg.innerText = "تم التحقق بنجاح، جاري التحويل...";
  msg.style.color = "green";

  setTimeout(function () {
    redirectByRole(parsed.user.role);
  }, 150);
};

const verifyInput = document.getElementById("verifyCode");

if (verifyInput) {
  verifyInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      window.verifyCode();
    }
  });
}