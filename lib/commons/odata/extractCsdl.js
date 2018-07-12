'use strict';

const { parse, convert } = require('@elasticiodev/odata2openapi');
const {convertJsonSchemaToEioSchema} = require('../jsonSchema/jsonSchemaConversionUtil');

module.exports.convertCsdlString = async function(csdlString) {
  const service = await parse(csdlString);
  const openApiDefinition = convert(service.entitySets, service, service.version);

  const jsonSchemaDefinitions = service.entitySets.reduce((dictionarySoFar, es) => {
    const fullyQualifiedName = `${es.namespace}.${es.entityType.name}`;
    const summaryForType = {
      jsonSchema:  convertJsonSchemaToEioSchema(fullyQualifiedName, openApiDefinition.definitions),
      keys: es.entityType.key
      // TODO: Id, Wrap In Quotes, in vs out
    };
    dictionarySoFar[es.name] = summaryForType;
    return dictionarySoFar;
  }, {});
  return jsonSchemaDefinitions;
};

module.exports.getJsonSchemaForEntitySet = async function(csdlString, entitySet) {
  const allResults = await module.exports.convertCsdlString(csdlString);
  const resultToReturn = JSON.parse(JSON.stringify(allResults[entitySet].jsonSchema));
  allResults[entitySet].keys.forEach(key => {
    resultToReturn.properties[key.name].required = false;
  });
  return resultToReturn;
};

module.exports.getKeysForEntitySet = async function (csdlString, entitySet) {
  const allResults = await module.exports.convertCsdlString(csdlString);
  return allResults[entitySet].keys;
};
