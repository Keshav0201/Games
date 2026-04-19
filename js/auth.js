const signupForm = document.querySelector('#signup-form');
const loginForm = document.querySelector('#login-form');
const signupBtn = document.querySelector('#signup-btn');
const loginBtn = document.querySelector('#login-btn');
const passwordInput = document.getElementById('signup-password');
const lengthRule = document.getElementById('length-rule');
const uppercaseRule = document.getElementById('uppercase-rule');
const numberRule = document.getElementById('number-rule');
const specialRule = document.getElementById('special-rule');
const googleSignInBtn = document.getElementById('google-signin-btn')
const googleProvider = new firebase.auth.GoogleAuthProvider();

googleSignInBtn.addEventListener('click', () => {
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            const user = result.user;
            const isNewUser = result.additionalUserInfo.isNewUser;

            // If it's a new user, create their document in Firestore
            if (isNewUser) {
                console.log('New user signed up with Google:', user.displayName);
                db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    gamesPlayed: 0,
                    gamesWon: 0
                }).then(() => {
                    // Redirect after creating the user doc
                    window.location.href = 'dash.html';
                });
            } else {
                console.log('Returning user signed in with Google:', user.displayName);
                // For returning users, just redirect
                window.location.href = 'dash.html';
            }
        }).catch((error) => {
            console.error('Google sign-in error:', error.message);
            alert("Error signing in with Google: " + error.message);
        });
});


// --- NEW: Real-time Password Strength Checker ---
if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const pass = passwordInput.value;
        // Check for length (at least 8 characters)
        if (pass.length >= 8) {
            lengthRule.classList.add('valid');
        } else {
            lengthRule.classList.remove('valid');
        }
        // Check for an uppercase letter
        if (/[A-Z]/.test(pass)) {
            uppercaseRule.classList.add('valid');
        } else {
            uppercaseRule.classList.remove('valid');
        }
        // Check for a number
        if (/[0-9]/.test(pass)) {
            numberRule.classList.add('valid');
        } else {
            numberRule.classList.remove('valid');
        }
        // Check for a special character
        if (/[@$!%*?&]/.test(pass)) {
            specialRule.classList.add('valid');
        } else {
            specialRule.classList.remove('valid');
        }
    });
}

// --- Sign Up (UPDATED with final validation) ---
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = signupForm['signup-name'].value;
    const email = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;

    // NEW: Final validation check before submitting
    const isLengthValid = password.length >= 8;
    const isUppercaseValid = /[A-Z]/.test(password);
    const isNumberValid = /[0-9]/.test(password);
    const isSpecialValid = /[@$!%*?&]/.test(password);

    if (!isLengthValid || !isUppercaseValid || !isNumberValid || !isSpecialValid) {
        alert('Please make sure your password meets all the requirements.');
        return; // Stop the submission
    }

    signupBtn.classList.add('loading');

    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        cred.user.sendEmailVerification();
        return db.collection('users').doc(cred.user.uid).set({
            name: name, email: email, gamesPlayed: 0, gamesWon: 0
        }).then(() => {
            return cred.user.updateProfile({ displayName: name });
        }).then(() => {
            alert('Account created! Please check your email to verify your account before logging in.');
            window.location.reload(); 
        });
    }).catch(err => {
        alert("Error: " + err.message);
    }).finally(() => {
        signupBtn.classList.remove('loading');
    });
});


// --- Login (No changes needed here) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginBtn.classList.add('loading');

    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;

    auth.signInWithEmailAndPassword(email, password).then(cred => {
        if (cred.user.emailVerified) {
            window.location.href = 'dash.html';
        } else {
            alert('Please verify your email address before logging in. A new verification link has been sent.');
            cred.user.sendEmailVerification();
            auth.signOut();
        }
    }).catch(err => {
        alert("Error: " + err.message);
    }).finally(() => {
        loginBtn.classList.remove('loading');
    });
});