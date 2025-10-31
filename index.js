// Archivo: index.js

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const Gamedig = require('gamedig');
require('dotenv').config(); // Carga las variables del archivo .env

// --- CONFIGURACIÓN ---
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.STATUS_CHANNEL_ID;
const MTA_IP = process.env.MTA_SERVER_IP;
const MTA_PORT = parseInt(process.env.MTA_SERVER_PORT); // Asegura que el puerto sea un número
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos en milisegundos

let statusMessage = null; // Variable para almacenar el mensaje que será actualizado

// Inicializa el Cliente de Discord con los Intents necesarios
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, // Necesario para interactuar con canales del servidor
    ] 
});

// --- FUNCIONES ---

/**
 * Función para crear el Embed (mensaje enriquecido) con el estado del servidor.
 */
function createStatusEmbed(state, isOnline) {
    const embed = new EmbedBuilder()
        .setTitle('🎮 ESTADO DEL SERVIDOR DE MTA:SA')
        .setTimestamp();

    if (isOnline) {
        embed.setColor(0x00FF00) // Verde
             .setDescription(`El servidor **${state.name}** está en línea.`)
             .addFields(
                 { name: '🌐 IP de Conexión', value: `${MTA_IP}:${state.port}`, inline: true },
                 { name: '👥 Jugadores', value: `${state.players.length}/${state.maxplayers}`, inline: true },
                 { name: '🗺️ Mapa Actual', value: `${state.map || 'N/A'}`, inline: true },
             )
             .setFooter({ text: 'Última actualización: En línea' });
    } else {
        embed.setColor(0xFF0000) // Rojo
             .setDescription('❌ **¡El servidor está APAGADO o inaccesible!**')
             .addFields(
                 { name: '🌐 IP de Consulta', value: MTA_IP, inline: true },
                 { name: '📶 Estado', value: 'OFFLINE', inline: true },
             )
             .setFooter({ text: 'Última actualización: Fuera de línea' });
    }
    return embed;
}

/**
 * Función principal para consultar el estado del servidor de MTA y actualizar el mensaje.
 */
async function updateMtaStatus() {
    try {
        console.log('Consultando estado de MTA...');
        const state = await Gamedig.query({
            type: 'query', // Tipo de juego para Gamedig
            host: MTA_IP,
            port: MTA_PORT, // Puerto de consulta (query port)
            timeout: 5000 // Tiempo máximo de espera
        });

        const embed = createStatusEmbed(state, true);
        await updateMessage(embed);

    } catch (error) {
        console.error('Error al consultar el servidor de MTA:', error.message);
        const embed = createStatusEmbed(null, false);
        await updateMessage(embed);
    }
}

/**
 * Función para enviar o editar el mensaje de estado en Discord.
 */
async function updateMessage(embed) {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return console.error(`No se encontró el canal con ID: ${CHANNEL_ID}`);

    try {
        if (!statusMessage) {
            // 1. Si es la primera vez, intenta buscar un mensaje existente usando MESSAGE_ID del .env
            if (process.env.MESSAGE_ID && process.env.MESSAGE_ID.length > 5) {
                try {
                    statusMessage = await channel.messages.fetch(process.env.MESSAGE_ID);
                    await statusMessage.edit({ embeds: [embed] });
                    console.log('Mensaje de estado existente actualizado.');
                } catch (fetchError) {
                    // Si el fetch falla (el mensaje fue borrado), crea uno nuevo.
                    console.log('No se encontró el mensaje existente. Creando uno nuevo...');
                    statusMessage = await channel.send({ embeds: [embed] });
                    console.log(`¡NUEVO ID DE MENSAJE! Actualiza tu .env con MESSAGE_ID="${statusMessage.id}"`);
                }
            } else {
                // 2. Si no hay MESSAGE_ID configurado, crea uno nuevo.
                statusMessage = await channel.send({ embeds: [embed] });
                console.log(`¡NUEVO ID DE MENSAJE! Actualiza tu .env con MESSAGE_ID="${statusMessage.id}"`);
            }
        } else {
            // 3. Si el mensaje ya está en memoria, solo edítalo.
            await statusMessage.edit({ embeds: [embed] });
            console.log('Mensaje de estado editado correctamente.');
        }

    } catch (discordError) {
        console.error('Error al enviar o editar el mensaje de Discord:', discordError);
    }
}

// --- EVENTOS DEL CLIENTE ---

client.once('ready', () => {
    console.log(`🤖 ¡Bot iniciado como ${client.user.tag}!`);
    console.log(`Comenzando la consulta de estado de MTA en ${MTA_IP}:${MTA_PORT}`);

    // Ejecuta la función por primera vez inmediatamente
    updateMtaStatus();

    // Configura el bucle para que se ejecute cada 5 minutos
    setInterval(updateMtaStatus, INTERVAL_MS);
});

client.login(TOKEN);