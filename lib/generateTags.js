const Company = require('../models/CompanyModel.js');
const qrCode = require('qr-image');
const fs = require('fs');
const path = require('path');
const htmlPDF = require('html-pdf');
const handlebars = require('handlebars');
const amazonConfig = require('../config/amazonConfig.js');

module.exports = (companyID)=>{

    const qrCodePath = path.join(__dirname, '../../'+ companyID +'.png');
    const code = qrCode.image(JSON.stringify({companyID: companyID}), {type: 'png', size: 10, margin: 0});
    const output = fs.createWriteStream(qrCodePath);
    code.pipe(output);

    const templatePath = path.join(__dirname, '../QRCodeTag/pdfTemplates/tagsQRCode.html');
    const templateHTML = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateHTML); //Compila o template HTML usando Handlebars

    const tagImagesPath = path.join(__dirname, '../QRCodeTag/images/cardapio01-tags.jpg');
    const data = {qrCode:qrCodePath, infoImage: tagImagesPath};
    const htmlResult = template(data); //Adiciona os dados necessários no template

    //Array do opçõs para geração do PDF
    const options = {
      "format": 'A4',
      "base": "file://" //Define o caminho base para busca dos arquivos
    };

    htmlPDF.create(htmlResult, options).toBuffer((err, generatedPdf)=>{
      const params = {
        file: generatedPdf,
        filename : companyID+'_tags.pdf',
        mimetype: 'application/pdf',
        bucket: amazonConfig.fileBucket
      }
      require('../lib/uploadS3.js')(params)
      .then((success)=>{
          return new Promise((accept, reject)=>{
              Company.update({_id: req.companyID}, {$set: {tags: success.url}})
              .then((company)=>{
                  success.msg = 'Arquivo de etiquetas criado com sucesso!';
                  accept(success);
              })
              .catch((err)=>{
                 reject({success: false, msg: 'Erro ao salvar a URL do arquivo de etiquetas. Tente novamente!'});
              })
          });
      })
      .catch((err) => {
        return new Promise((success, reject)=>{
            err.msg = 'Erro ao criar arquivo de etiquetas. Tente novamente!';
            reject(err);
        });
      })
    });
};