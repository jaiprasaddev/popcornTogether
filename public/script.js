// ===========================
// TOGGLE ANIMATION (AS IT IS)
// ===========================
const container = document.querySelector('.container');
const registerToggleBtn = document.querySelector('.register-btn');
const loginToggleBtn = document.querySelector('.login-btn');

registerToggleBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginToggleBtn.addEventListener('click', () => {
    container.classList.remove('active');
});




// ===========================
// LOGIN
// ===========================
document.getElementById("loginBtn").addEventListener("click", function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert("Email and password required");
        return;
    }

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            alert("Login Successful ✅");
            window.location.href = "/index.html";
        })
        .catch((error) => {
            alert(error.message);
        });
});


// ===========================
// REGISTER (FIXED VERSION)
// ===========================
document.getElementById("registerBtn").addEventListener("click", async (e) => {
  e.preventDefault();

  try {
    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;

    if (!username || !email || !password) {
      alert("All fields required");
      return;
    }

    const cred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);

    const user = cred.user;

    console.log("Auth user created:", user.uid);

    await window.db.collection("users").doc(user.uid).set({
      username,
      email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    alert("Registration Successful 🎉");
    container.classList.remove("active");

  } catch (err) {
    alert(err.message);
    console.error(err);
  }
});

