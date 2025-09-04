// ============================
// VARIABLES Y CONFIGURACIONES
// ============================
let vozActiva = false;
let datos = [];        // Base inicial desde el JSON
let aprendizaje = [];  // Nuevos datos enseñados desde Sheets
let fuse = null;

let ultimaPregunta = null;
let modoAprendizaje = false;

// URL de tu WebApp de Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqqnDuNyzUoTRVFvqe0rZvJZCDC6mFsMn4i8zTAWXFhjB2uPN7VX4iBnM6CAmhW3Lv/exec";

// ============================
// FUNCIONES DE VOZ
// ============================
function hablar(texto) {
  if (!vozActiva) return;

  const msg = new SpeechSynthesisUtterance();
  msg.text = texto.replace(/<[^>]+>/g, '');
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

  const temaData = [...datos, ...aprendizaje].find(d => normalizarTexto(d.tema) === normalizarTexto(tema));
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
// FUNCIONES DE APRENDIZAJE
// ============================
function guardarAprendizaje(pregunta, respuesta) {
  const nuevoDato = {
    tema: pregunta,
    respuesta: respuesta,
    preguntas: [pregunta],
    tags: []
  };

  aprendizaje.push(nuevoDato);

  // Enviar al Google Sheet
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(nuevoDato)
  })
  .then(res => res.json())
  .then(data => {
    appendMessage("✅ ¡He aprendido la respuesta y la guardé en mi memoria!", "bot");
  })
  .catch(err => {
    console.error("Error al guardar en Google Sheets:", err);
    appendMessage("⚠️ Guardé la respuesta en mi memoria temporal, pero no pude enviarla al Google Sheet.", "bot");
  });
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

  // Si está en modo aprendizaje
  if (modoAprendizaje && ultimaPregunta) {
    guardarAprendizaje(ultimaPregunta, texto);
    ultimaPregunta = null;
    modoAprendizaje = false;
    return;
  }

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

  // Buscar en base JSON + aprendizaje
  let tema = [...datos, ...aprendizaje].find(d =>
    normalizarTexto(d.tema) === textoNormalizado ||
    (d.preguntas || []).some(p => textoNormalizado.includes(normalizarTexto(p))) ||
    (d.tags || []).some(tag => textoNormalizado.includes(normalizarTexto(tag)))
  );

  // 🔍 Si no hay coincidencia exacta, usar búsqueda difusa
  if (!tema && fuse) {
    const resultados = fuse.search(texto, { limit: 3 });
    if (resultados.length > 0) {
      if (resultados.length === 1) {
        tema = resultados[0].item;
      } else {
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

  // Si no se encontró nada → activar modo enseñar
  ultimaPregunta = texto;
  appendMessage(`🤖 No encontré información sobre "<strong>${texto}</strong>".<br><br>✍️ Escribe la respuesta ahora y la guardaré en mi memoria y en el Google Sheet.`, "bot");
  modoAprendizaje = true;
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

  // Cargar JSON y configurar Fuse.js
  fetch("contenido-uam.json")
    .then(res => res.json())
    .then(json => {
      datos = json;

      fuse = new Fuse([...datos, ...aprendizaje], {
        keys: ["preguntas", "tags", "tema", "descripcion"],
        threshold: 0.3,
        includeScore: true
      });
    })
    .catch(err => {
      console.error("Error al cargar el JSON:", err);
      appendMessage("⚠️ Error al cargar la información base. Intenta más tarde.", "bot");
    });

  // Cargar conocimientos aprendidos desde Google Sheets
  fetch(GOOGLE_SCRIPT_URL)
    .then(res => res.json())
    .then(json => {
      aprendizaje = json;
    })
    .catch(err => {
      console.error("Error al cargar aprendizajes desde Sheets:", err);
    });
});
