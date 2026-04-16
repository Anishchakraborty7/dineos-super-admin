document.addEventListener('DOMContentLoaded', () => {
  if (auth.getToken()) { window.location.href = 'dashboard.html'; return; }

  const form     = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');
  const errorTxt = document.getElementById('errorText');
  const btnText  = document.getElementById('loginBtnText');
  const spinner  = document.getElementById('loginSpinner');
  const togglePw = document.getElementById('togglePassword');
  const pwInput  = document.getElementById('password');

  togglePw?.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    togglePw.textContent = pwInput.type === 'password' ? '👁️' : '🙈';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    btnText.textContent = 'Signing in...';
    spinner.style.display = 'inline-block';
    document.getElementById('loginBtn').disabled = true;

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await api.post('/super/auth/login', { email, password });
      auth.setSession(res.data.token, res.data.admin);
      toast.success('Login successful! Redirecting...');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } catch (err) {
      errorTxt.textContent = err.message || 'Login failed. Check credentials.';
      errorMsg.style.display = 'flex';
    } finally {
      btnText.textContent = 'Sign In';
      spinner.style.display = 'none';
      document.getElementById('loginBtn').disabled = false;
    }
  });
});
