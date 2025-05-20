// =============================
// 📦 UTILIDADES
// =============================

// Convierte texto HTML a texto plano para la voz
function hablar(textoHTML, tipo = "general") {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = textoHTML;
  let textoPlano = tempDiv.textContent || tempDiv.innerText || "";
  textoPlano = textoPlano.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();

  const speech = new SpeechSynthesisUtterance(textoPlano);
  speech.volume = 1;
  speech.lang = 'es-ES';

  // Configuración de voz según tipo
  switch (tipo) {
    case "saludo":
      speech.pitch = 1.4;
      speech.rate = 0.95;
      break;
    case "reglamento":
      speech.pitch = 0.9;
      speech.rate = 0.88;
      break;
    case "urgente":
      speech.pitch = 1;
      speech.rate = 1.1;
      break;
    default:
      speech.pitch = 1.1;
      speech.rate = 0.95;
  }

  const voces = speechSynthesis.getVoices();
  const vozMasculina = voces.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes("male"));
  const vozAlternativa = voces.find(v => v.lang.startsWith('es') && !v.name.toLowerCase().includes("female"));
  speech.voice = vozMasculina || vozAlternativa || voces[0];

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(speech);
}

// Guarda y muestra el historial del chat
function appendMessage(text, sender) {
  const chatBox = document.getElementById("chat-box");
  const messageDiv = document.createElement("div");
  messageDiv.className = sender === "user" ? "user-message" : "bot-message";
  messageDiv.innerHTML = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  const historial = JSON.parse(localStorage.getItem("chatHistorial")) || [];
  historial.push({ sender, text });
  localStorage.setItem("chatHistorial", JSON.stringify(historial));
}

// Limpia historial del chat
function limpiarHistorial() {
  localStorage.removeItem("chatHistorial");
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "<p>👋 ¡Hola! ¿En qué puedo ayudarte hoy?</p>";
}

// Carga historial anterior al iniciar
function cargarHistorial() {
  const historial = JSON.parse(localStorage.getItem("chatHistorial")) || [];
  historial.forEach(msg => appendMessage(msg.text, msg.sender));
}

// Envío de mensajes al bot
function sendMessage() {
  const userInput = document.getElementById("user-input").value.trim();
  if (!userInput) return;

  appendMessage(userInput, "user");
  document.getElementById("user-input").value = "";

  getBotResponse(userInput).then(botReply => {
    appendMessage(botReply, "bot");
    hablar(botReply);
  });
}

// Envío rápido por botón
function quickReply(text) {
  document.getElementById("user-input").value = text;
  sendMessage();
}

// =============================
// 🤖 FUNCIONES PRINCIPALES DEL BOT
// =============================

// Procesa y responde al mensaje del usuario
async function getBotResponse(userInput) {
  try {
    const response = await fetch('contenido-uam.json');
    const data = await response.json();

    const input = userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Saludo personalizado
    const saludos = ["hola", "buenas", "buenos dias", "buen dia", "hello", "hi", "saludos"];
    if (saludos.some(s => input.includes(s))) {
      return `
        <div class="mensaje-bienvenida" style="line-height: 1.2; text-align: left; font-size: 15px;">
          <p><strong>👋 ¡Hola! Soy AdmiRegBot</strong>, tu asistente virtual 🤖</p>
          <p>Puedes preguntarme por:</p>
          • 🧾 Recibos<br>
          • 📄 Pagos<br>
          • ✅ Validaciones<br>
          • 📘 Certificados<br>
          • 📚 Matrícula<br>
          • ...y más.<br>
          <p>Haz clic en un botón o escribe tu duda. ¡Estoy aquí para ayudarte!</p>
        </div>
      `;
    }

    // 2. Búsqueda inteligente con Fuse.js
    const fuse = new Fuse(data, {
      keys: ['tema', 'categoria', 'subcategoria', 'preguntas', 'respuesta'],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
    });

    const resultados = fuse.search(input);
    if (resultados.length > 0) {
      const mejorCoincidencia = resultados[0].item;
      return `
        <div class="bot-respuesta">
          🤖 <strong>${mejorCoincidencia.tema}</strong><br>
          ${mejorCoincidencia.descripcion}<br>
          🌐 <a href="${mejorCoincidencia.url}" target="_blank">Ver más</a>
        </div>
      `;
    }

    // 3. No se encontró resultado
    return `
      <div class="bot-respuesta">
        No encontré información relacionada. Puedes preguntarme por matrícula, becas, certificados, pagos, descuentos, etc.
      </div>
    `;
  } catch (error) {
    console.error('Error al cargar contenido-uam.json:', error);
    return `
      <div class="bot-respuesta">
        Ocurrió un error al consultar la base de datos del bot.
      </div>
    `;
  }
}

// =============================
// 📚 GUÍAS Y VISTAS MODALES
// =============================

// Carga guía según tipo
function cargarGuia(tipo) {
  const contenedor = document.getElementById("contenedor-guia");
  contenedor.classList.remove("oculto");
  contenedor.style.display = "block";

  let contenido = "";

  switch (tipo) {
    case "Estudiante":
    case "Docente":
    case "Trabajador":
    case "Comunidad Externa":
      contenido = `
        <iframe src="https://preguntasfrecuentes.autonoma.edu.co/"
                width="100%" height="600px" style="border: none;"></iframe>
      `;
      break;
    case "Guia-PDF":
      contenido = `
        <iframe id="iframe-guia" src="https://drive.google.com/file/d/14GchJym8nlvHIlmGp-jz_PxpB1ywfLvJ/preview"
                width="100%" height="100%" style="border: none; border-radius: 8px;"></iframe>
        <div style="text-align: center; margin-top: 15px;">
          <a href="https://drive.google.com/uc?id=14GchJym8nlvHIlmGp-jz_PxpB1ywfLvJ&export=download"
             download
             style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-size: 16px;">
            📥 Descargar Guía en PDF
          </a>
        </div>
      `;
      break;
    default:
      contenido = "<p>No se encontró la guía solicitada.</p>";
  }

  contenedor.innerHTML = `
    <button class="btn-cerrar-guia" onclick="cerrarGuia()">❌</button>
    ${contenido}
  `;
}

// Cierra y limpia la vista modal
function cerrarGuia() {
  const contenedor = document.getElementById("contenedor-guia");
  contenedor.classList.add("oculto");
  setTimeout(() => {
    contenedor.style.display = "none";
    contenedor.innerHTML = "";
  }, 300);
}

// =============================
// ⏩ BOTONES RÁPIDOS
// =============================

function mostrarOpcionesRapidas(opciones) {
  const quickButtons = document.getElementById('quick-buttons');
  quickButtons.innerHTML = '';

  opciones.forEach(opcion => {
    const button = document.createElement('button');
    button.innerHTML = `${opcion.icono} ${opcion.texto}`;
    button.className = 'boton-rapido';
    button.onclick = () => {
      quickReply(opcion.texto);
      quickButtons.innerHTML = '';
    };
    quickButtons.appendChild(button);
  });
}

// =============================
// 🚀 INICIO AUTOMÁTICO
// =============================
window.addEventListener("DOMContentLoaded", cargarHistorial);
