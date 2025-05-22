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
    .replace(/[^\w\s]/gi, '')
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

function sendMessage() {
  const input = document.getElementById("user-input");
  const texto = input.value.trim();
  if (texto === "") return;

  appendMessage(texto, "user");
  input.value = "";

  const textoNormalizado = normalizarTexto(texto);

  // Reconocimiento de saludos
  const saludos = ["hola", "buenos dias", "buenas tardes", "buenas noches", "hey", "que tal"];
  if (saludos.some(s => textoNormalizado.startsWith(s))) {
    appendMessage("👋 ¡Hola! ¿En qué puedo ayudarte hoy?", "bot");
    return;
  }

  // Reconocimiento de despedidas
  const despedidas = ["adios", "hasta luego", "nos vemos", "chao", "gracias"];
  if (despedidas.some(s => textoNormalizado.includes(s))) {
    appendMessage("🙋‍♂️ ¡Hasta pronto! Si necesitas más ayuda, aquí estaré.", "bot");
    return;
  }

  // Coincidencia exacta en datos
  let tema = datos.find(d =>
    normalizarTexto(d.tema) === textoNormalizado ||
    (d.preguntas || []).some(p => textoNormalizado.includes(normalizarTexto(p))) ||
    (d.tags || []).some(tag => textoNormalizado.includes(normalizarTexto(tag)))
  );

  if (!tema && typeof fuseTemas !== "undefined" && fuseTemas) {
  const resultadoTemas = fuseTemas.search(texto);
  if (resultadoTemas.length > 0) {
    tema = resultadoTemas[0].item;
  }
}

  if (tema) {
    appendMessage(`<strong>${tema.tema}</strong><br>${tema.respuesta}`, "bot");
    mostrarBotones(tema.tema);
    return;
  }

  // Respuestas generales
  const respuestasGenerales = [
    { palabras: ["horario", "atencion", "abren"], respuesta: "⏰ Nuestro horario de atención es de lunes a viernes de 7:30 a.m. a 6 p.m." },
    { palabras: ["telefono", "contacto", "llamar"], respuesta: "📞 Puedes contactarnos al (606) 8727272 - Ext. 147 - 227 - 230 - 266 - 268." },
    { palabras: ["correo", "email"], respuesta: "📧 Nuestro correo es registro.academico@autonoma.edu.co" }
  ];

  const matchGeneral = respuestasGenerales.find(r =>
    r.palabras.some(p => textoNormalizado.includes(p))
  );

  if (matchGeneral) {
    appendMessage(matchGeneral.respuesta, "bot");
    return;
  }

  // Búsqueda difusa en preguntas frecuentes
 if (fuse) {
  const resultados = fuse.search(texto);
  if (resultados.length > 0) {
    const { pregunta, respuesta } = resultados[0].item;
    if (pregunta && respuesta) {
      appendMessage(`<strong>${pregunta}</strong><br>${respuesta}`, "bot");
      return;
    }
  }
}

  // Si no hay coincidencias en ningún caso, muestra mensaje de error
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

  // Cargar JSON principal
  fetch("contenido-uam.json")
    .then(res => res.json())
    .then(json => { datos = json; })
    .catch(err => {
      console.error("Error al cargar el JSON:", err);
      appendMessage("⚠️ Error al cargar la información. Intenta más tarde.", "bot");
    });

  // Cargar preguntas frecuentes y configurar Fuse.js
  fetch("data/contenido-uam.json")
    .then(response => response.json())
    .then(data => {
      fuse = new Fuse(data, {
        keys: ['pregunta', 'respuesta'],
        threshold: 0.3,
        includeScore: true
      });

      // Configurar input de búsqueda rápida
      const searchInput = document.getElementById("searchInput");
      const chatContainer = document.querySelector(".chat-container");

      searchInput.addEventListener("input", function () {
        const query = searchInput.value.trim();
        chatContainer.innerHTML = "";

        if (query === "") return;

        const resultados = fuse.search(query);

        if (resultados.length === 0) {
          chatContainer.innerHTML = `<div class="respuesta">
            <p>❌ No se encontraron resultados para: "<strong>${query}</strong>"</p>
          </div>`;
          return;
        }

        resultados.forEach(resultado => {
          const item = resultado.item;
          const respuestaHTML = `
            <div class="respuesta">
              <p class="pregunta-usuario">🤖 <strong>${item.pregunta}</strong></p>
              <p>${item.respuesta}</p>
            </div>
          `;
          chatContainer.innerHTML += respuestaHTML;
        });
      });
    })
    .catch(error => {
      console.error("Error al cargar preguntas frecuentes:", error);
    });
});
