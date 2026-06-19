(function () {
  let client = null;
  let api = null;
  let saveTimer = null;
  let ready = false;

  const config = window.BARBERFLOW_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);

  function translateError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    const code = String(error?.code || "").toLowerCase();

    if (message.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
    if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
    if (message.includes("user already registered")) return "Já existe uma conta com este e-mail.";
    if (message.includes("password should be") || message.includes("weak_password")) return "A senha precisa ter pelo menos 6 caracteres.";
    if (message.includes("signup is disabled")) return "A criação de contas está temporariamente desativada.";
    if (message.includes("email rate limit") || message.includes("rate limit") || error?.status === 429) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    if (message.includes("network") || message.includes("failed to fetch") || code === "fetch_error") return "Não foi possível conectar. Verifique sua internet e tente novamente.";
    if (message.includes("user not found")) return "Não encontramos uma conta com este e-mail.";
    if (message.includes("same password")) return "Escolha uma senha diferente da atual.";
    if (message.includes("token has expired") || message.includes("otp_expired")) return "Este link expirou. Solicite um novo e-mail de confirmação.";
    if (message.includes("email address") && message.includes("invalid")) return "Informe um endereço de e-mail válido.";
    return "Não foi possível concluir a operação. Tente novamente.";
  }

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
    await client.rpc("accept_staff_invite");
    const { data, error } = await client.rpc("get_my_barbershop_state");
    if (error) throw error;
    if (data?.length) return data[0];
    const shopName = localStorage.getItem("bf_shop_name") || "Clube da Régua";
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
    const accessResult = await client.rpc("get_my_access");
    if (!accessResult.error && accessResult.data?.length) api.applyAccess?.(accessResult.data[0]);
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
      document.querySelector("#resendForm")?.classList.add("open");
      history.replaceState({}, document.title, window.location.pathname);
    }
    const { data } = await client.auth.getSession();
    if (data.session) {
      try {
        await connectSession();
      } catch (error) {
        setSync("Erro de conexão", "error");
        api.notify("Falha ao carregar banco", translateError(error));
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
          setMessage(translateError(error), "error");
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

  async function inviteProfessional(email, professionalName) {
    if (!ready || !client) return;
    const { error } = await client.rpc("invite_staff_member", {
      staff_email: email,
      staff_professional_name: professionalName
    });
    if (error) throw error;
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

  window.BarberCloud = { start, signIn, signUp, resendConfirmation, inviteProfessional, signOut, queueSave, translateError, configured };
})();
