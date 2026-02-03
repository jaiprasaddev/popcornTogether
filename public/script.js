// ========== TOGGLE ANIMATION ==========
const container = document.querySelector('.container');
const registerToggleBtn = document.querySelector('.register-btn');
const loginToggleBtn = document.querySelector('.login-btn');

registerToggleBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginToggleBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

// ========== TOAST (TOP-CENTER + LONGER) ==========
function showToast(msg, type = "info", duration = 4500) {
    const t = document.getElementById("toast");
    if (!t) return alert(msg);

    t.innerText = msg;
    t.className = `toast show ${type}`;

    setTimeout(() => {
        t.className = "toast";
    }, duration);
}

// ========== PASSWORD STRENGTH CHECK ==========
function isStrongPassword(password) {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return regex.test(password);
}

// ========== SHOW / HIDE PASSWORD (EYE BUTTON) ==========
document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.target);
        const icon = btn.querySelector("i");

        if (input.type === "password") {
            input.type = "text";
            icon.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.replace("fa-eye-slash", "fa-eye");
        }
    });
});

// ========== MODAL (FOR GOOGLE MERGE) ==========
function openMergeModal(onConfirm) {
    const modal = document.getElementById("mergeModal");
    const pwdInput = document.getElementById("mergePassword");
    const confirmBtn = document.getElementById("mergeConfirm");
    const cancelBtn = document.getElementById("mergeCancel");

    modal.style.display = "flex";

    confirmBtn.onclick = () => {
        const password = pwdInput.value;
        pwdInput.value = "";
        modal.style.display = "none";
        onConfirm(password);
    };

    cancelBtn.onclick = () => {
        pwdInput.value = "";
        modal.style.display = "none";
    };
}

// ========== LOGIN (EMAIL + PASSWORD) ==========
document.getElementById("loginBtn").addEventListener("click", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            if (!user.emailVerified) {
                showToast("Please verify your email before logging in ❌", "error");
                firebase.auth().signOut();
                return;
            }

            showToast("Login successful ✅", "success");

            setTimeout(() => {
                window.location.href = "/index.html";
            }, 2500);
        })
        .catch((error) => {
            showToast(error.message, "error");
        });
});

// ========== REGISTER ==========
document.getElementById("registerBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!username || !email || !password) {
        showToast("All fields are required", "error");
        return;
    }

    // 🔐 STRONG PASSWORD VALIDATION
    if (!isStrongPassword(password)) {
        showToast(
          "Password must contain:\n• 1 Capital letter\n• 1 Small letter\n• 1 Number\n• 1 Special character\n• Min 8 characters",
          "error",
          6500
        );
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;

        await user.sendEmailVerification();

        await db.ref("users/" + user.uid).set({
            username,
            email,
            createdAt: Date.now()
        });

        showToast("Registration successful! Verify your email 📩", "success");

        firebase.auth().signOut();

        setTimeout(() => {
            window.location.href = "/Login.html";
        }, 3000);

    } catch (err) {
        showToast(err.message, "error");
    }
});

// ========== GOOGLE LOGIN (MERGE SAFE) ==========
function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider)
        .then(async (result) => {
            const user = result.user;

            await db.ref("users/" + user.uid).update({
                username: user.displayName || "Google User",
                email: user.email,
                provider: "google",
                lastLogin: Date.now()
            });

            showToast("Google login successful ✅", "success");

            setTimeout(() => {
                window.location.href = "/index.html";
            }, 2500);
        })
        .catch(async (error) => {

            if (error.code === "auth/account-exists-with-different-credential") {
                const email = error.customData.email;
                const pendingCred = error.credential;

                showToast(
                    "Account exists. Enter website password to link Google.",
                    "info",
                    6000
                );

                openMergeModal(async (password) => {
                    if (!password) {
                        showToast("Password is required", "error");
                        return;
                    }

                    try {
                        const userCred = await firebase.auth()
                            .signInWithEmailAndPassword(email, password);

                        await userCred.user.linkWithCredential(pendingCred);

                        showToast("Google account linked successfully ✅", "success");

                        setTimeout(() => {
                            window.location.href = "/index.html";
                        }, 2500);

                    } catch (err) {
                        showToast(err.message, "error");
                    }
                });

            } else {
                showToast(error.message, "error");
            }
        });
}

// Google buttons
document.getElementById("googleLoginBtn").addEventListener("click", (e) => {
    e.preventDefault();
    googleLogin();
});

document.getElementById("googleRegisterBtn").addEventListener("click", (e) => {
    e.preventDefault();
    googleLogin();
});

// ========== FORGOT PASSWORD ==========
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();

        if (!email) {
            showToast("Please enter your email first", "error");
            return;
        }

        try {
            await firebase.auth().sendPasswordResetEmail(email);
            showToast("Password reset email sent 📩", "success");
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}
