/* eslint-disable no-console */
const fs = require('fs');
const { parse, convert } = require('odata2openapi');

const rawCsdlFiles = fs.readdirSync('./spec/samples/rawCsdlFiles');
Promise.all(rawCsdlFiles.map(async (file) => {
  const csdlString = fs.readFileSync(`./spec/samples/rawCsdlFiles/${file}`).toString();
  const service = await parse(csdlString);
  fs.writeFileSync(`./${file.substr(0, file.lastIndexOf('.'))}.service.json`, JSON.stringify(service, null, 2));
  const openApiDefinition = convert(service.entitySets, service, service.version);
  fs.writeFileSync(`./${file.substr(0, file.lastIndexOf('.'))}.swagger.json`, JSON.stringify(openApiDefinition, null, 2));
})).then(() => console.log('All CSDL Files Converted!'));
