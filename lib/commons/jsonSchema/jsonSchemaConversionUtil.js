// eslint-disable-next-line max-len
module.exports.convertJsonSchemaToEioSchema = function convertJsonSchemaToEioSchema(keyToReturn, completeSchemaOriginal) {
  const completeSchema = JSON.parse(JSON.stringify(completeSchemaOriginal));

  Object.keys(completeSchema).forEach((key) => {
    const jsonSchema = completeSchema[key];
    const requiredProperties = jsonSchema.required || [];
    requiredProperties.forEach((requiredProperty) => {
      jsonSchema.properties[requiredProperty].required = true;
    });

    if (Array.isArray(jsonSchema.required)) {
      jsonSchema.required = jsonSchema.required.length > 0;
    }

    // Populate omitted values to false for testing simplicity
    Object.keys(jsonSchema.properties).forEach((propertyName) => {
      jsonSchema.properties[propertyName].required = !!jsonSchema.properties[propertyName].required;
    });

    const properties = Object.keys(jsonSchema.properties);
    properties.forEach((propertyName) => {
      const property = jsonSchema.properties[propertyName];
      if (property.description && property.example) {
        property.title = `${propertyName} (${property.description} e.g. ${property.example})`;
      } else if (property.description) {
        property.title = `${propertyName} (${property.description})`;
      } else if (property.example) {
        property.title = `${propertyName} (e.g. ${property.example})`;
      } else {
        property.title = propertyName;
      }
      if (property.type === 'integer') {
        property.type = 'number';
      }
    });
  });

  return completeSchema[keyToReturn];
};
