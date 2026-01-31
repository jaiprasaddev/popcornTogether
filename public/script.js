// Toggle animation (tumhara existing code)
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

// LOGIN
document.getElementById("loginBtn").addEventListener("click", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Login Successful ✅");
            window.location.href = "/index.html"; // home page
        })
        .catch((error) => {
            alert(error.message);
        });
});

// REGISTER
// REGISTER
document.getElementById("registerBtn").addEventListener("click", function (e) {
    e.preventDefault();

    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (!username || !email || !password) {
        alert("All fields are required");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // 🔥 FIRESTORE ME USER SAVE
            return db.collection("users").doc(user.uid).set({
                username: username,
                email: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("Registration Successful 🎉");
            container.classList.remove('active'); // login view
        })
        .catch((error) => {
            alert(error.message);
        });
});

