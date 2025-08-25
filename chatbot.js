<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Bot UAM</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Fuse.js -->
  <script src="https://cdn.jsdelivr.net/npm/fuse.js@6.6.2"></script>
  <style>
    body { font-family: system-ui, Arial, sans-serif; margin: 0; background: #f6f7fb; }
    .wrap { max-width: 780px; margin: 24px auto; padding: 16px; }
    #chat-box { background:#fff; border:1px solid #e6e7eb; border-radius:12px; padding:16px; height:420px; overflow:auto; }
    .user-message { background:#dff0ff; border-radius:12px; padding:10px 12px; margin:8px 0 8px auto; max-width:80%; width:fit-content; }
    .bot-message { background:#f2f3f5; border-radius:12px; padding:10px 12px; margin:8px 0; max-width:85%; width:fit-content; }
    .controls { display:flex; gap:8px; margin-top:12px; }
    #user-input { flex:1; padding:12px; border:1px solid #d6d7db; border-radius:10px; }
    #send-btn { padding:12px 16px; border:0; border-radius:10px; background:#0059ff; color:#fff; cursor:pointer; }
    #send-btn:disabled, #user-input:disabled { opacity:.6; cursor:not-allowed; }
    #botones-dinamicos { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; transition:.2s; }
    #botones-dinamicos.mostrar button { transform:none; opacity:1; }
    #botones-dinamicos button { transform:translateY(2px); opacity:.96; padding:8px 12px; border-radius:10px; border:1px solid #d6d7db; background:#fff; cursor:pointer; }
    .small { color:#666; font-size:12px; margin-top:6px; }
    .muted { color:#8a8d94; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  <div class="wrap">
    <div id="chat-box" class="bot-message">🤖 Hola, estoy cargando la base de conocimientos…</div>

    <div id="botones-dinamicos"></div>

    <div class="controls">
      <input id="user-input" type="text" placeholder="Escribe tu pregunta…" disabled />
      <button id="send-btn" disabled>Enviar</button>
    </div>
    <div class="small muted">
      Sugerencia: escribe “reglamento”, “intersemestral”, “certificados”, etc.
    </div>
  </div>

  <script>
  // ============================
  // CONFIG
  // ============================
  const WEBAPP_URL = "https://script.google.com/macros/s/AehSKLjKAZqUFAsTrkW9ulB1c9R_Jf9jc_dOFYJIgVHGdUTW9NIrsW3Y7_4SRMjkmOTuz0VsAsFw9bxnjZBHr_wvwFk8lYcT61rvcU_x57_2cxvAS6YBg0kLluY8Em1cyEsmphfucDiTmGva/exec";

  let vozActiva = false;
  let datos = [];
  let fuse = null;
  let listo = false;

  // ============================
  // UTILIDADES
  // ============================
  function hablar(texto) {
    if (!vozActiva) return;
    try {
      const msg = new SpeechSynthesisUtterance();
      msg.text = texto.replace(/<[^>]+>/g, '');
      msg.lang = 'es-ES'; msg.pitch = 1.1; msg.rate = 1; msg.volume = 1;
      const voces = speechSynthesis.getVoices();
      msg.voice = voces.find(v => v.lang === "es-ES" && v.name.toLowerCase().includes("male")) ||
                  voces.find(v => v.lang.startsWith("es")) || voces[0];
      speechSynthesis.cancel(); speechSynthesis.speak(msg);
    } catch(e) { console.warn("speechSynthesis no disponible", e); }
  }

  function normalizarTexto(texto) {
    return (texto || "")
      .toString()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function appendMessage(html, sender) {
    const chatBox = document.getElementById("chat-box");
    const message = document.createElement("div");
    message.className = sender === "user" ? "user-message" : "bot-message";
    message.innerHTML = html;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    if (sender === "bot") hablar(html);
  }

  function setHabilitado(si) {
    const input = document.getElementById("user-input");
    const btn = document.getElementById("send-btn");
    input.disabled = !si; btn.disabled = !si;
    if (si) input.focus();
  }

  // JSON seguro (acepta array/objeto ya parseado, o string JSON, o vacío)
  function safeParseJSON(value, fallback = []) {
    try {
      if (!value) return fallback;
      if (Array.isArray(value) || typeof value === "object") return value;
      if (typeof value === "string") {
        const s = value.trim().replace(/[“”]/g, '"'); // comillas “curly”
        return JSON.parse(s);
      }
      return fallback;
    } catch (e) {
      console.warn("No se pudo parsear JSON:", value, e);
      return fallback;
    }
  }

  // Convierte a array: "a, b ,c" -> ["a","b","c"]
  function toList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => v.toString());
    if (typeof value === "string")
      return value.split(",").map(v => v.trim()).filter(Boolean);
    return [];
  }

  // ============================
  // BOTONES DINÁMICOS
  // ============================
  function mostrarBotones(temaData) {
    const contenedor = document.getElementById("botones-dinamicos");
    contenedor.innerHTML = "";
    if (!temaData || !temaData.botones || temaData.botones.length === 0) {
      contenedor.classList.remove("mostrar");
      return;
    }
    temaData.botones.forEach(btn => {
      const b = document.createElement("button");
      b.textContent = btn.texto || "Ver";
      b.addEventListener("click", () => {
        if (btn.accion === "enlace" && btn.destino) {
          window.open(btn.destino, "_blank");
        } else if (btn.accion === "pregunta" && btn.destino) {
          document.getElementById("user-input").value = btn.destino;
          sendMessage();
        }
      });
      contenedor.appendChild(b);
    });
    requestAnimationFrame(() => contenedor.classList.add("mostrar"));
  }

  // ============================
  // MENSAJES
  // ============================
  function sendMessage() {
    const input = document.getElementById("user-input");
    const texto = input.value.trim();
    if (texto === "") return;
    appendMessage(texto, "user");
    input.value = "";

    if (!listo || !datos.length) {
      appendMessage("⏳ Aún estoy cargando la base. Prueba de nuevo en unos segundos.", "bot");
      return;
    }

    const textoNormalizado = normalizarTexto(texto);

    // Saludos
    const saludos = ["hola", "buenos dias", "buenas tardes", "buenas noches", "hey", "que tal"];
    if (saludos.some(s => textoNormalizado.startsWith(s))) {
      appendMessage("👋 ¡Hola! ¿En qué puedo ayudarte hoy?", "bot");
      return;
    }

    // Despedidas
    const despedidas = ["adios", "hasta luego", "nos vemos", "chao", "gracias"];
    if (despedidas.some(s => textoNormalizado.includes(s))) {
      appendMessage("🙋‍♂️ ¡Hasta pronto! Si necesitas más ayuda, aquí estaré.", "bot");
      return;
    }

    // Coincidencia exacta
    let tema = datos.find(d =>
      normalizarTexto(d.tema) === textoNormalizado ||
      (d.preguntas || []).some(p => textoNormalizado.includes(normalizarTexto(p))) ||
      (d.tags || []).some(tag => textoNormalizado.includes(normalizarTexto(tag)))
    );

    // Búsqueda difusa (top 3)
    if (!tema && fuse) {
      const resultados = fuse.search(texto, { limit: 3 });
      if (resultados.length > 0) {
        if (resultados.length === 1) {
          tema = resultados[0].item;
        } else {
          let html = "🤖 Encontré varias posibles respuestas:<br><br>";
          resultados.forEach((r, i) => {
            html += `<strong>${i + 1}. ${r.item.tema}</strong><br>${r.item.respuesta || ""}<br><br>`;
          });
          appendMessage(html, "bot");
          // Muestra botones del primer candidato (opcional)
          mostrarBotones(resultados[0].item);
          return;
        }
      }
    }

    if (tema) {
      appendMessage(`<strong>${tema.tema}</strong><br>${tema.respuesta || ""}`, "bot");
      mostrarBotones(tema);
      return;
    }

    appendMessage("🤖 No encontré información sobre eso. Prueba con otra pregunta o usa los botones de guía.", "bot");
    document.getElementById("botones-dinamicos").innerHTML = "";
  }

  // ============================
  // INICIO
  // ============================
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("user-input");
    const btn = document.getElementById("send-btn");

    btn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });

    window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

    // Cargar datos de Google Apps Script
    fetch(WEBAPP_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Si tu doGet no devuelve MIME JSON, esto fallará.
        // Asegúrate de usar setMimeType(JSON) en el Apps Script.
        return res.json();
      })
      .then(json => {
        // Normalizar todas las columnas
        datos = (json || []).map(raw => {
          const preguntas = toList(raw.preguntas);
          const tags = toList(raw.tags);
          const enlaces = safeParseJSON(raw.enlaces, []);
          const botones = safeParseJSON(raw.botones, []);
          return {
            tema: raw.tema || "",
            descripcion: raw.descripcion || "",
            preguntas,
            tags,
            respuesta: raw.respuesta || "",
            enlaces,
            botones
          };
        });

        // Inicializar Fuse
        fuse = new Fuse(datos, {
          keys: ["preguntas", "tags", "tema", "descripcion"],
          threshold: 0.3,
          includeScore: true
        });

        // Habilitar UI
        const chatBox = document.getElementById("chat-box");
        chatBox.innerHTML = "";
        appendMessage("✅ Listo. Ya puedes preguntar.", "bot");
        setHabilitado(true);
        listo = true;

        console.log("✅ Datos cargados:", datos);
      })
      .catch(err => {
        console.error("❌ Error al cargar datos:", err);
        appendMessage("⚠️ No pude cargar la información del servidor. Revisa la consola y la publicación del Web App.", "bot");
        setHabilitado(true); // Permitimos probar, aunque sin datos.
      });
  });
  </script>
</body>
</html>
