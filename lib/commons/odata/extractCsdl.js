'use strict';

const { parse, convert } = require('odata2openapi');
const {convertJsonSchemaToEioSchema} = require('../jsonSchema/jsonSchemaConversionUtil');

module.exports.convertCsdlString = async function(csdlString) {
  const service = await parse(csdlString);
  const openApiDefinition = convert(service.entitySets, service, service.version);

  const jsonSchemaDefinitions = service.entitySets.reduce((dictionarySoFar, es) => {
    const fullyQualifiedName = `${es.namespace}.${es.entityType.name}`;
    const summaryForType = {
      jsonSchema:  convertJsonSchemaToEioSchema(openApiDefinition.definitions[fullyQualifiedName])
      // TODO: Id, Wrap In Quotes, in vs out
    };
    dictionarySoFar[es.name] = summaryForType;
    return dictionarySoFar;
  }, {});
  return jsonSchemaDefinitions;
};

module.exports.getJsonSchemaForEntitySet = async function(csdlString, entitySet) {
  const allResults = await convertJsonSchemaToEioSchema(csdlString);
  return allResults[entitySet].jsonSchema;
};
