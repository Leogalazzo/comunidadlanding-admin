/* =========================================================
   CONFIGURACIÓN DE CLOUDINARY
   =========================================================
   1. Andá a https://cloudinary.com/console
   2. Copiá tu "Cloud name" de arriba a la derecha
   3. Andá a Settings > Upload > Upload presets > Add upload preset
      - Signing Mode: Unsigned
      - (Opcional) Folder: comunidad-emprendedora
      - Guardá y copiá el nombre del preset
   ========================================================= */

const CLOUDINARY_CLOUD_NAME = "dloroyhev";
const CLOUDINARY_UPLOAD_PRESET = "marchese";

/**
 * Sube un archivo de imagen a Cloudinary y devuelve la URL segura.
 * @param {File} file
 * @returns {Promise<string>} URL de la imagen subida
 */
async function subirImagenCloudinary(file) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(url, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Error al subir la imagen a Cloudinary");
    const data = await res.json();
    return data.secure_url;
}