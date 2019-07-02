const { CsdlConverter, MetadataBuilder } = require('@elastic.io/odata-library');

// eslint-disable-next-line max-len
module.exports.getJsonSchemaForEntitySet = async function getJsonSchemaForEntitySet(csdlString, entitySetName) {
  const csdlConverter = await (new CsdlConverter(csdlString)).build();
  const fullResult = csdlConverter.convertCsdlString(entitySetName);
  const resultToReturn = fullResult.jsonSchema;
  fullResult.keys.forEach((key) => {
    resultToReturn.properties[key.name].required = false;
    resultToReturn.properties[key.name].title += ' (Primary Key)';
  });
  return resultToReturn;
};

// eslint-disable-next-line max-len
module.exports.getKeysForEntitySet = async function getKeysForEntitySet(csdlString, entitySetName) {
  const csdlConverter = await (new CsdlConverter(csdlString)).build();
  const fullResult = csdlConverter.convertCsdlString(entitySetName);
  return fullResult.keys;
};

// eslint-disable-next-line max-len
module.exports.getMetadataForLookupId = async function getMetadataForLookupId(csdlString, entitySetName) {
  const csdlConverter = await (new CsdlConverter(csdlString)).build();
  const metadataBuilder = new MetadataBuilder(csdlConverter);

  return metadataBuilder.getByIdMetadata(entitySetName);
};

// eslint-disable-next-line max-len
module.exports.extractFieldsToWrapInQuotes = async function extractFieldsToWrapInQuotes(csdlString, entitySetName) {
  const csdlConverter = await (new CsdlConverter(csdlString)).build();
  const fullResult = csdlConverter.convertCsdlString(entitySetName);
  return fullResult.fieldsToWrapInQuotesInUrl;
};
