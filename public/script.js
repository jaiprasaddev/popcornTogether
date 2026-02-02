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

// ========== LOGIN (EMAIL + PASSWORD) ==========
document.getElementById("loginBtn").addEventListener("click", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            if (!user.emailVerified) {
                alert("❌ Please verify your email before logging in.");
                firebase.auth().signOut();
                return;
            }

            window.location.href = "/index.html";
        })
        .catch((error) => {
            alert(error.message);
        });
});

// ========== REGISTER ==========
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

        await user.sendEmailVerification();

        await db.ref("users/" + user.uid).set({
            username,
            email,
            createdAt: Date.now()
        });

        alert("✅ Registration successful! Please verify your email.");
        firebase.auth().signOut();
        window.location.href = "/Login.html";

    } catch (err) {
        alert(err.message);
    }
});

// ========== GOOGLE LOGIN (LOGIN + REGISTER SAME) ==========
// function googleLogin() {
//     const provider = new firebase.auth.GoogleAuthProvider();

//     firebase.auth().signInWithPopup(provider)
//         .then(async (result) => {
//             const user = result.user;

//             // Save user if first time
//             await db.ref("users/" + user.uid).update({
//                 username: user.displayName || "Google User",
//                 email: user.email,
//                 provider: "google",
//                 createdAt: Date.now()
//             });

//             window.location.href = "/index.html";
//         })
//         .catch((error) => {
//             alert(error.message);
//         });
// }

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

            window.location.href = "/index.html";
        })
        .catch(async (error) => {

            // 🔴 ACCOUNT EXISTS WITH DIFFERENT CREDENTIAL
            if (error.code === "auth/account-exists-with-different-credential") {
                const email = error.customData.email;
                const pendingCred = error.credential;

                alert(
                    "This email is already registered.\nPlease login with email & password once to link Google."
                );

                // Ask user for password
                const password = prompt("Enter your password to link Google login:");

                if (!password) return;

                try {
                    // Login using email/password
                    const userCred = await firebase.auth().signInWithEmailAndPassword(email, password);

                    // 🔗 LINK GOOGLE TO SAME ACCOUNT
                    await userCred.user.linkWithCredential(pendingCred);

                    alert("✅ Google account linked successfully!");
                    window.location.href = "/index.html";

                } catch (err) {
                    alert(err.message);
                }
            } else {
                alert(error.message);
            }
        });
}


document.getElementById("googleLoginBtn").addEventListener("click", (e) => {
    e.preventDefault();
    googleLogin();
});

document.getElementById("googleRegisterBtn").addEventListener("click", (e) => {
    e.preventDefault();
    googleLogin();
});
