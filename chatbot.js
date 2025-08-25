// ============================
// VARIABLES Y CONFIGURACIONES
// ============================
let vozActiva = false;
let datos = [];
let fuse = null;

// ============================
// FUNCIONES DE VOZ
// ============================
function hablar(texto) {
  if (!vozActiva) return;

  const msg = new SpeechSynthesisUtterance();
  msg.text = texto.replace(/<[^>]+>/g, ''); // Remueve HTML
  msg.lang = 'es-ES';
  msg.pitch = 1.1;
  msg.rate = 1;
  msg.volume = 1;

  const voces = speechSynthesis.getVoices();
  const vozNatural = voces.find(v => v.lang === "es-ES" && v.name.toLowerCase().includes("male")) ||
                     voces.find(v => v.lang.startsWith("es")) ||
                     voces[0];
  msg.voice = vozNatural;

  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

// ============================
// FUNCIONES DE INTERFAZ
// ============================
function appendMessage(text, sender) {
  const chatBox = document.getElementById("chat-box");
  const message = document.createElement("div");
  message.className = sender === "user" ? "user-message" : "bot-message";
  message.innerHTML = text;
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (sender === "bot") {
    hablar(text);
  }
}

function limpiarHistorial() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '<div class="bot-message">🧠 Historial borrado. ¿En qué más puedo ayudarte?</div>';
  document.getElementById('botones-dinamicos').innerHTML = '';
}

function toggleVoz() {
  vozActiva = !vozActiva;
  alert(`Voz ${vozActiva ? 'activada' : 'desactivada'}`);
}

// ============================
// FUNCIONES DE PROCESAMIENTO
// ============================
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mostrarBotones(tema) {
  const contenedor = document.getElementById("botones-dinamicos");
  contenedor.innerHTML = "";

  const temaData = datos.find(d => normalizarTexto(d.tema) === normalizarTexto(tema));
  if (!temaData || !temaData.botones) {
    contenedor.classList.remove("mostrar");
    return;
  }

  temaData.botones.forEach(btn => {
    const b = document.createElement("button");
    b.textContent = btn.texto;
    b.onclick = () => {
      if (btn.accion === "enlace") {
        window.open(btn.destino, "_blank");
      } else if (btn.accion === "pregunta") {
        document.getElementById("user-input").value = btn.destino;
        sendMessage();
      }
    };
    contenedor.appendChild(b);
  });

  setTimeout(() => contenedor.classList.add("mostrar"), 100);
}

// ============================
// PROCESAR MENSAJES
// ============================
function sendMessage() {
  const input = document.getElementById("user-input");
  const texto = input.value.trim();
  if (texto === "") return;

  appendMessage(texto, "user");
  input.value = "";

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

  // 🔍 Si no hay coincidencia exacta, usar búsqueda difusa con top 3
  if (!tema && fuse) {
    const resultados = fuse.search(texto, { limit: 3 }); // traer máximo 3
    if (resultados.length > 0) {
      if (resultados.length === 1) {
        tema = resultados[0].item;
      } else {
        // Mostrar varias opciones
        let respuestaMultiple = "🤖 Encontré varias posibles respuestas:<br><br>";
        resultados.forEach((r, i) => {
          respuestaMultiple += `<strong>${i + 1}. ${r.item.tema}</strong><br>${r.item.respuesta}<br><br>`;
        });
        appendMessage(respuestaMultiple, "bot");
        return;
      }
    }
  }

  if (tema) {
    appendMessage(`<strong>${tema.tema}</strong><br>${tema.respuesta}`, "bot");
    mostrarBotones(tema.tema);
    return;
  }

  appendMessage("🤖 Lo siento, no encontré información sobre eso. Prueba con otra pregunta o usa los botones de guía.", "bot");
  document.getElementById("botones-dinamicos").innerHTML = "";
}

// ============================
// EVENTOS Y CARGA DE DATOS
// ============================
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

  // ✅ URL de tu WebApp publicada en Google Apps Script
  const url = "https://script.google.com/macros/s/AKfycbx-m4bKg0SC4Y9b-W1zepu9MEWJA-BDYZ9SeqLuORbGJqfTPJ5BIbTz_y-X9kKZ60huCQ/exec";

  fetch(url)
    .then(res => res.json())
    .then(json => {
      // 🔥 Convertimos los strings a objetos/arrays reales
      datos = json.map(item => ({
        ...item,
        preguntas: item.preguntas ? item.preguntas.split(",").map(p => p.trim()) : [],
        tags: item.tags ? item.tags.split(",").map(t => t.trim()) : [],
        enlaces: item.enlaces ? JSON.parse(item.enlaces) : [],
        botones: item.botones ? JSON.parse(item.botones) : []
      }));

      // Inicializar Fuse.js
      fuse = new Fuse(datos, {
        keys: ["preguntas", "tags", "tema", "descripcion"],
        threshold: 0.3,
        includeScore: true
      });

      console.log("✅ Datos cargados y parseados:", datos);
    })
    .catch(err => {
      console.error("Error al cargar datos desde la WebApp:", err);
      appendMessage("⚠️ No se pudo conectar con la base de datos.", "bot");
    });
});


