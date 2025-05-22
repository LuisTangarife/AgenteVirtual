let vozActiva = false;

// Reproduce la respuesta del bot en voz alta
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

// Añade mensajes al chat
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

// Limpia historial del chat
function limpiarHistorial() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '<div class="bot-message">🧠 Historial borrado. ¿En qué más puedo ayudarte?</div>';
  document.getElementById('botones-dinamicos').innerHTML = '';
}

// Normaliza el texto: sin tildes, espacios dobles, símbolos
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // elimina tildes
    .replace(/[^\w\s]/gi, '') // elimina símbolos
    .replace(/\s+/g, ' ') // reduce espacios múltiples
    .trim();
}

// Enviar mensaje del usuario
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

  // Buscar coincidencia en el JSON
  const tema = datos.find(d =>
    normalizarTexto(d.tema) === textoNormalizado ||
    (d.preguntas || []).some(p => textoNormalizado.includes(normalizarTexto(p)))
  );

  // Si encuentra coincidencia en el tema
  if (tema) {
    appendMessage(`<strong>${tema.tema}</strong><br>${tema.respuesta}`, "bot");
    mostrarBotones(tema.tema);
    return;
  }

  // Respuestas generales básicas como respaldo
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

  // Si no encuentra nada
  appendMessage("🤖 Lo siento, no encontré información sobre eso. Prueba con otra pregunta o usa los botones de guía.", "bot");
  document.getElementById("botones-dinamicos").innerHTML = "";
}

// Muestra botones interactivos desde el JSON
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

  // Animación para mostrar botones
  setTimeout(() => contenedor.classList.add("mostrar"), 100);
}

// Alternar voz activada/desactivada
function toggleVoz() {
  vozActiva = !vozActiva;
  alert(`Voz ${vozActiva ? 'activada' : 'desactivada'}`);
}

// Iniciar escucha del campo de texto
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // Cargar voces del navegador
  window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

  // Mostrar por defecto botones de un tema si quieres (opcional)
  // mostrarBotones("Reglamento Estudiantil");
});

// Cargar el JSON de datos del bot
let datos = [];
fetch("contenido-uam.json")
  .then(res => res.json())
  .then(json => { datos = json; })
  .catch(err => {
    console.error("Error al cargar el JSON:", err);
    appendMessage("⚠️ Error al cargar la información. Intenta más tarde.", "bot");
  });

// Iniciar historial
window.addEventListener("DOMContentLoaded", () => {
  // Si usas historial, aquí puedes cargarlo
});
