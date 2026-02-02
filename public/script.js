// Toggle animation (existing code)
const container = document.querySelector('.container')
const registerToggleBtn = document.querySelector('.register-btn')
const loginToggleBtn = document.querySelector('.login-btn')

registerToggleBtn.addEventListener('click', () => {
    container.classList.add('active')
})

loginToggleBtn.addEventListener('click', () => {
    container.classList.remove('active')
})

/* ===========================
   FIREBASE AUTH LOGIC
=========================== */

// ================= LOGIN =================
document.getElementById("loginBtn").addEventListener("click", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // ❌ Email not verified
            if (!user.emailVerified) {
                alert("❌ Please verify your email before logging in.");
                firebase.auth().signOut();
                return;
            }

            // ✅ Email verified
            alert("Login Successful ✅");
            window.location.href = "/index.html";
        })
        .catch((error) => {
            alert(error.message);
        });
});

// ================= REGISTER =================
document.getElementById("registerBtn").addEventListener("click", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!username || !email || !password) {
        alert("All fields required");
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;

        // 🔥 SEND EMAIL VERIFICATION
        await user.sendEmailVerification();

        // Save user data
        await db.ref("users/" + user.uid).set({
            username: username,
            email: email,
            createdAt: Date.now()
        });

        alert("✅ Registration successful! Please verify your email before login.");
        firebase.auth().signOut(); // force logout until verified
        window.location.href = "/Login.html";

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});
