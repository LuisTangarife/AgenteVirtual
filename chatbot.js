let respuestas = [];

fetch('chatbot.json')
    .then(response => response.json())
    .then(data => {
        respuestas = data;
        mostrarCategorias();
    });

function mostrarCategorias() {
    const categorias = [...new Set(respuestas.map(r => r.categoria))];
    const contenedor = document.getElementById('menu-categorias');
    contenedor.innerHTML = '';

    categorias.forEach(cat => {
        const btn = document.createElement('div');
        btn.className = 'categoria';
        btn.innerText = cat;
        btn.onclick = () => mostrarPreguntas(cat);
        contenedor.appendChild(btn);
    });
}

function mostrarPreguntas(categoria) {
    const contenedor = document.getElementById('preguntas');
    contenedor.innerHTML = '';

    const preguntasCat = respuestas.filter(r => r.categoria === categoria);
    preguntasCat.forEach(p => {
        const btn = document.createElement('div');
        btn.className = 'pregunta-btn';
        btn.innerText = p.pregunta;
        btn.onclick = () => procesarPregunta(p.pregunta);
        contenedor.appendChild(btn);
    });
}

function procesarPregunta(mensajeUsuario) {
    const chat = document.getElementById('chat');
    const divUsuario = document.createElement('div');
    divUsuario.className = 'mensaje usuario';
    divUsuario.innerText = "Tú: " + mensajeUsuario;
    chat.appendChild(divUsuario);

    const respuestaEncontrada = respuestas.find(r => mensajeUsuario.toLowerCase().includes(r.pregunta.toLowerCase()));
    const mensajeBot = respuestaEncontrada ? respuestaEncontrada.respuesta : "Lo siento, no entiendo tu pregunta.";

    const divBot = document.createElement('div');
    divBot.className = 'mensaje bot';
    divBot.innerText = "Bot: " + mensajeBot;
    chat.appendChild(divBot);

    chat.scrollTop = chat.scrollHeight;
}

document.getElementById("enviar").addEventListener("click", () => {
    const input = document.getElementById("input");
    const mensaje = input.value.trim();
    if (mensaje !== "") {
        procesarPregunta(mensaje);
        input.value = "";
    }
});
