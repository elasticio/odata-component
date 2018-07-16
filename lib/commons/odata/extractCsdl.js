'use strict';

const { parse, convert } = require('@elasticiodev/odata2openapi');
const {convertJsonSchemaToEioSchema} = require('../jsonSchema/jsonSchemaConversionUtil');

async function convertCsdlString(csdlString, entitySetName) {
  const service = await parse(csdlString);
  const openApiDefinition = convert(service.entitySets, service, service.version);

  const entitySets = service.entitySets.filter(es => es.name === entitySetName);
  if(entitySets.length !== 1) {
    throw new Error(`Entity Set name not unique`);
  }
  const entitySet = entitySets[0];

  const fullyQualifiedName = `${entitySet.namespace}.${entitySet.entityType.name}`;
  return {
    jsonSchema:  convertJsonSchemaToEioSchema(fullyQualifiedName, openApiDefinition.definitions),
    keys: entitySet.entityType.key,
    fieldsToWrapInQuotesInUrl: entitySet.entityType.properties.filter(p => p.wrapValueInQuotesInUrls).map(p => p.name)
    // TODO: in vs out
  };
}

module.exports.getJsonSchemaForEntitySet = async function(csdlString, entitySetName) {
  const fullResult = await convertCsdlString(csdlString, entitySetName);
  const resultToReturn = fullResult.jsonSchema;
  fullResult.keys.forEach(key => {
    resultToReturn.properties[key.name].required = false;
  });
  return resultToReturn;
};

module.exports.getKeysForEntitySet = async function (csdlString, entitySetName) {
  const fullResult = await convertCsdlString(csdlString, entitySetName);
  return fullResult.keys;
};

module.exports.getMetadataForLookupId = async function (csdlString, entitySetName, fieldName) {
  const fullResult = await convertCsdlString(csdlString, entitySetName);

  return {
    in: {
      type: 'object',
      properties: {
        [fieldName]: fullResult.jsonSchema.properties[fieldName]
      }
    },
    out: fullResult.jsonSchema
  };
};

module.exports.extractFieldsToWrapInQuotes = async function (csdlString, entitySetName) {
  const fullResult = await convertCsdlString(csdlString, entitySetName);
  return fullResult.fieldsToWrapInQuotesInUrl;
};
