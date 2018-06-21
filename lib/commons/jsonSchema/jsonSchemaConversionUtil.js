'use strict';

module.exports.convertJsonSchemaToEioSchema = function(jsonSchema) {
  const jsonSchemaToReturn = JSON.parse(JSON.stringify(jsonSchema));

  const requiredProperties = jsonSchemaToReturn.required;
  requiredProperties.forEach(requiredProperty => {
    jsonSchemaToReturn.properties[requiredProperty].required = true;
  });

  const properties = Object.keys(jsonSchemaToReturn.properties);
  properties.forEach(propertyName => {
    const property = jsonSchemaToReturn.properties[propertyName];
    property.title = `${propertyName} (${property.description}. e.g. ${property.example})`;
  });

  return jsonSchemaToReturn;
};
