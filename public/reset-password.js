const auth = firebase.auth();

// URL se oobCode nikalna
const params = new URLSearchParams(window.location.search);
const oobCode = params.get("oobCode");

// Strong password check (same rule as register)
function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,}$/.test(password);
}

document.getElementById("resetBtn").onclick = async () => {
  const password = document.getElementById("newPassword").value;

  if (!isStrongPassword(password)) {
    alert(
      "Password must contain:\n" +
      "• 1 Capital letter\n" +
      "• 1 Small letter\n" +
      "• 1 Number\n" +
      "• 1 Special character\n" +
      "• Min 8 characters"
    );
    return;
  }

  try {
    await auth.confirmPasswordReset(oobCode, password);
    alert("Password reset successful ✅");
    window.location.href = "/Login.html";
  } catch (err) {
    alert(err.message);
  }
};
