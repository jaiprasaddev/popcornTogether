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
document.getElementById("registerBtn").addEventListener("click", async function () {

  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;

  if (!username || !email || !password) {
    alert("All fields required");
    return;
  }

  try {
    // 🔥 AUTH
    const cred = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);

    const user = cred.user;

    // 🔥 REALTIME DATABASE SAVE
    await firebase.database().ref("users/" + user.uid).set({
      username: username,
      email: user.email,
      createdAt: Date.now()
    });

    alert("Registration Successful 🎉");
    window.location.href = "/Login.html";

  } catch (err) {
    alert(err.message);
    console.error(err);
  }
});
