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
      keys: es.entityType.key,
      fieldsToWrapInQuotesInUrl: es.entityType.properties.filter(p => p.wrapValueInQuotesInUrls).map(p => p.name)
      // TODO: in vs out
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

module.exports.getMetadataForLookupId = async function (csdlString, entitySet, fieldName) {
  const allResults = await module.exports.convertCsdlString(csdlString);

  return {
    in: {
      type: 'object',
      properties: {
        [fieldName]: allResults[entitySet].jsonSchema.properties[fieldName]
      }
    },
    out: allResults[entitySet].jsonSchema
  };
};

module.exports.extractFieldsToWrapInQuotes = async function (csdlString, entitySet) {
  const allResults = await module.exports.convertCsdlString(csdlString);
  return allResults[entitySet].fieldsToWrapInQuotesInUrl;
};
