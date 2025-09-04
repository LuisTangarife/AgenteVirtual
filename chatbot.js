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

  // ❌ No encontró → ofrecer enseñanza
  const idPregunta = Date.now();
  appendMessage(`
    🤖 No encontré información sobre: <em>"${texto}"</em><br>
    ¿Quieres enseñarme la respuesta?<br>
    <button onclick="mostrarFormularioAprendizaje('${texto}', '${idPregunta}')">📝 Enseñar respuesta</button>
    <div id="form-${idPregunta}"></div>
  `, "bot");

  document.getElementById("botones-dinamicos").innerHTML = "";
}

// === FORMULARIO PARA ENSEÑAR ===
function mostrarFormularioAprendizaje(pregunta, id) {
  const contenedor = document.getElementById(`form-${id}`);
  contenedor.innerHTML = `
    <input type="text" id="respuesta-${id}" placeholder="Escribe la respuesta aquí" style="width:80%">
    <button onclick="guardarAprendizaje('${pregunta}', '${id}')">Guardar ✅</button>
  `;
}

function guardarAprendizaje(pregunta, id) {
  const respuesta = document.getElementById(`respuesta-${id}`).value.trim();
  if (!respuesta) {
    alert("Por favor escribe una respuesta");
    return;
  }

  // Llamada POST al Apps Script
  fetch("https://script.google.com/macros/s/AKfycbwDzrYK1wTqt0wZ59v4VfTH9TsvhsTL8RtYxNm04AT1QT_-7aJcE6y-CvySPovhN-LF/exec", {
    method: "POST",
    body: JSON.stringify({ pregunta, respuesta })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        appendMessage(`✅ ¡Gracias! He aprendido la respuesta a: <em>"${pregunta}"</em>`, "bot");
        document.getElementById(`form-${id}`).innerHTML = "";

        // 🔥 Agregar inmediatamente al dataset local
        datos.push({
          tema: pregunta,
          respuesta: respuesta,
          preguntas: [pregunta],
          tags: [],
          botones: []
        });
        fuse.setCollection(datos); // actualizar Fuse.js
      } else {
        appendMessage("⚠️ Error al guardar en la base de datos.", "bot");
      }
    })
    .catch(err => {
      console.error("Error al guardar:", err);
      appendMessage("⚠️ No se pudo conectar con la base de datos.", "bot");
    });
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
  const url = "https://script.google.com/macros/s/AKfycbwDzrYK1wTqt0wZ59v4VfTH9TsvhsTL8RtYxNm04AT1QT_-7aJcE6y-CvySPovhN-LF/exec";

  fetch(url)
    .then(res => res.json())
    .then(json => {
      datos = json.map(item => ({
        ...item,
        preguntas: item.preguntas ? item.preguntas.split(",").map(p => p.trim()) : [],
        tags: item.tags ? item.tags.split(",").map(t => t.trim()) : [],
        enlaces: item.enlaces ? JSON.parse(item.enlaces) : [],
        botones: item.botones ? JSON.parse(item.botones) : []
      }));

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
