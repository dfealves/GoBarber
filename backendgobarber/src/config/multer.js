import Multer from 'multer';
import crypto from 'crypto';
import { extname, resolve } from 'path';

export default {
  // diskStorage para salvar a imagem localmente
  storage: Multer.diskStorage({
    // destino para onde o arquivo será enviado
    destination: resolve(__dirname, '..', '..', 'tmp', 'uploads'),
    filename: (req, file, cb) => {
      // criptografar o nome do arquivo em um hexadecimal randominco de 16bites
      crypto.randomBytes(16, (err, res) => {
        // se o houver algum erro
        if (err) return cb(err);

        return cb(null, res.toString('hex') + extname(file.originalname));
      });
    },
  }),
};
