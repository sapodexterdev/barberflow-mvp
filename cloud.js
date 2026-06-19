(function () {
  let client = null;
  let api = null;
  let saveTimer = null;
  let ready = false;

  const config = window.BARBERFLOW_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);

  function setMessage(text, type = "") {
    const message = document.querySelector("#authMessage");
    if (!message) return;
    message.textContent = text;
    message.className = `auth-message ${type}`.trim();
  }

  function setSync(text, mode = "") {
    const status = document.querySelector("#cloudStatus");
    if (!status) return;
    status.textContent = text;
    status.className = `cloud-status ${mode}`.trim();
  }

  function showAuth(show) {
    document.querySelector("#authScreen")?.classList.toggle("open", show);
  }

  async function ensureShop() {
    const { data, error } = await client.rpc("get_my_barbershop_state");
    if (error) throw error;
    if (data?.length) return data[0];
    const shopName = localStorage.getItem("bf_shop_name") || "Barbearia do Rafa";
    const result = await client.rpc("initialize_barbershop", {
      shop_name: shopName,
      initial_data: api.getState()
    });
    if (result.error) throw result.error;
    const loaded = await client.rpc("get_my_barbershop_state");
    if (loaded.error) throw loaded.error;
    return loaded.data?.[0];
  }

  async function connectSession() {
    setSync("Sincronizando…", "syncing");
    const row = await ensureShop();
    if (row?.data && Object.keys(row.data).length) api.applyState(row.data);
    ready = true;
    showAuth(false);
    document.querySelector("#logoutButton")?.removeAttribute("hidden");
    setSync("Dados online", "online");
  }

  async function start(appApi) {
    api = appApi;
    if (!configured) {
      setSync("Modo local", "local");
      return;
    }
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const callbackError = new URLSearchParams(window.location.hash.slice(1)).get("error_description");
    if (callbackError) {
      showAuth(true);
      setMessage("O link de confirmação expirou. Solicite um novo e-mail abaixo.", "error");
      document.querySelector("#resendConfirmation")?.removeAttribute("hidden");
      history.replaceState({}, document.title, window.location.pathname);
    }
    const { data } = await client.auth.getSession();
    if (data.session) {
      try {
        await connectSession();
      } catch (error) {
        setSync("Erro de conexão", "error");
        api.notify("Falha ao carregar banco", error.message);
      }
    } else {
      showAuth(true);
      setSync("Login necessário", "local");
    }

    client.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session && !ready) {
        try {
          await connectSession();
        } catch (error) {
          setMessage(error.message, "error");
        }
      }
      if (event === "SIGNED_OUT") {
        ready = false;
        showAuth(true);
        document.querySelector("#logoutButton")?.setAttribute("hidden", "");
        setSync("Login necessário", "local");
      }
    });
  }

  async function signIn(email, password) {
    setMessage("Entrando…");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email, password, shopName) {
    localStorage.setItem("bf_shop_name", shopName);
    localStorage.setItem("bf_pending_email", email);
    setMessage("Criando sua conta…");
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    if (error) throw error;
    if (!data.session) {
      setMessage("Conta criada. Confirme o e-mail para entrar.", "success");
      document.querySelector("#resendConfirmation")?.removeAttribute("hidden");
    }
  }

  async function resendConfirmation(email) {
    const { error } = await client.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    if (error) throw error;
    setMessage("Novo e-mail enviado. Use o link mais recente.", "success");
  }

  function queueSave(data) {
    if (!ready) return;
    setSync("Salvando…", "syncing");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { error } = await client.rpc("save_my_barbershop_state", { new_data: data });
      if (error) {
        setSync("Falha ao salvar", "error");
        api.notify("Não foi possível sincronizar", error.message);
        return;
      }
      setSync("Dados online", "online");
    }, 500);
  }

  async function signOut() {
    if (client) await client.auth.signOut();
  }

  window.BarberCloud = { start, signIn, signUp, resendConfirmation, signOut, queueSave, configured };
})();
