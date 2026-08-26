// Converte as ilustrações do manual em PNG (3x) para inclusão no docx.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ilustracoes = require('./ilustracoes-manual');

(async () => {
  for (const [nome, svg] of Object.entries(ilustracoes)) {
    const largura = Number(/width="(\d+)"/.exec(svg)[1]);
    fs.writeFileSync(path.join(__dirname, `${nome}.svg`), svg);
    await sharp(Buffer.from(svg), { density: 216 })
      .resize({ width: largura * 3 })
      .png()
      .toFile(path.join(__dirname, `${nome}.png`));
    await sharp(Buffer.from(svg), { density: 96 })
      .png()
      .toFile(path.join(__dirname, `preview-${nome}.png`));
    console.log('render:', nome);
  }
})();
