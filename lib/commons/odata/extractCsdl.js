const { CsdlConverter } = require('@elastic.io/odata-library');

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
module.exports.getMetadataForLookupId = async function getMetadataForLookupId(csdlString, entitySetName, fieldName, required) {
  const csdlConverter = await (new CsdlConverter(csdlString)).build();
  const fullResult = csdlConverter.convertCsdlString(entitySetName);

  const returnValue = {
    in: {
      type: 'object',
      properties: {
        [fieldName]: fullResult.jsonSchema.properties[fieldName],
      },
    },
    out: fullResult.jsonSchema,
  };

  returnValue.in.properties[fieldName].required = required;

  return returnValue;
};

// eslint-disable-next-line max-len
module.exports.extractFieldsToWrapInQuotes = async function extractFieldsToWrapInQuotes(csdlString, entitySetName) {
  const csdlConverter = await (new CsdlConverter(csdlString)).build();
  const fullResult = csdlConverter.convertCsdlString(entitySetName);
  return fullResult.fieldsToWrapInQuotesInUrl;
};
