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
  function limpiarHistorial() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerHTML = '<div class="bot-message">🧠 Historial borrado. ¿En qué más puedo ayudarte?</div>';
  document.getElementById('botones-dinamicos').innerHTML = '';
}
// Simula una respuesta y muestra botones si hay coincidencia en el JSON
function sendMessage() {
  const input = document.getElementById("user-input");
  const texto = input.value.trim();
  if (texto === "") return;

  appendMessage(texto, "user");
  input.value = "";
}

  // Buscar coincidencia en el JSON
  const tema = datos.find(d =>
    d.tema.toLowerCase() === texto.toLowerCase() ||
    (d.preguntas || []).some(p => texto.toLowerCase().includes(p.toLowerCase()))
  );

  if (tema) {
    appendMessage(`<strong>${tema.tema}</strong><br>${tema.respuesta}`, "bot");
    mostrarBotones(tema.tema);
  } else {
    appendMessage("🤖 Lo siento, no encontré información sobre eso. Prueba con otra pregunta o usa los botones de guía.", "bot");
    document.getElementById("botones-dinamicos").innerHTML = "";
  }
}

// Muestra botones interactivos desde el JSON
function mostrarBotones(tema) {
  const contenedor = document.getElementById("botones-dinamicos");
  contenedor.innerHTML = "";

  const temaData = datos.find(d => d.tema.toLowerCase() === tema.toLowerCase());
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

  // Activar animación para mostrar botones
  setTimeout(() => contenedor.classList.add("mostrar"), 100);
}

// Alternar voz activada/desactivada
function toggleVoz() {
  vozActiva = !vozActiva;
  alert(`Voz ${vozActiva ? 'activada' : 'desactivada'}`);
}

// Enviar mensaje con tecla Enter
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("user-input");
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // Cargar voces
  window.speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

  // Mostrar un tema por defecto (opcional)
  mostrarBotones("Reglamento Estudiantil");
});

// 🔁 Cargar el JSON con datos
let datos = [];
fetch("contenido-uam.json")
  .then(res => res.json())
  .then(json => { datos = json; })
  .catch(err => {
    console.error("Error al cargar el JSON:", err);
    appendMessage("⚠️ Error al cargar la información. Intenta más tarde.", "bot");
  });

// =============================
// 🚀 INICIO AUTOMÁTICO
// =============================
window.addEventListener("DOMContentLoaded", cargarHistorial);
