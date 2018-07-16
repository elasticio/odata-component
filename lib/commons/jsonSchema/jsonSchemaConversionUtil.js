'use strict';

const _ = require('lodash');

module.exports.convertJsonSchemaToEioSchema = function(keyToReturn, completeSchemaOriginal) {
  const completeSchema = JSON.parse(JSON.stringify(completeSchemaOriginal));

  Object.keys(completeSchema).forEach(key => {
    const jsonSchema = completeSchema[key];
    const requiredProperties = jsonSchema.required || [];
    requiredProperties.forEach(requiredProperty => {
      jsonSchema.properties[requiredProperty].required = true;
    });

    if (Array.isArray(jsonSchema.required)) {
      jsonSchema.required = jsonSchema.required.length > 0;
    }

    // Populate omitted values to false for testing simplicity
    Object.keys(jsonSchema.properties).forEach(propertyName => {
      jsonSchema.properties[propertyName].required = !!jsonSchema.properties[propertyName].required;
    });

    const properties = Object.keys(jsonSchema.properties);
    properties.forEach(propertyName => {
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

  denormalizeReferences(completeSchema[keyToReturn], completeSchema);

  return completeSchema[keyToReturn];
};

function denormalizeReferences(currentSchema, completeSchema, referencesSeenSoFar = []) {
  const localReferences = JSON.parse(JSON.stringify(referencesSeenSoFar));
  if(localReferences.length !== _.uniq(localReferences).length) {
    return;
  }
  const refAddress = currentSchema['$ref'];
  if (refAddress) {
    const subSchemaRequired = currentSchema.required;
    const schemaToDeReference = refAddress.replace('#/definitions/', '');
    localReferences.push(schemaToDeReference);
    delete currentSchema['$ref'];
    if (!completeSchema[schemaToDeReference]) {
      console.log(`Unrecognized schema ${schemaToDeReference}.  Placing an object instead.`);
      currentSchema.type = 'object';
    }
    Object.assign(currentSchema , JSON.parse(JSON.stringify(completeSchema[schemaToDeReference])));
    if(subSchemaRequired !== undefined) {
      currentSchema.required = subSchemaRequired;
    }
  }
  if (currentSchema.properties) {
    Object.keys(currentSchema.properties).forEach(key => {
      denormalizeReferences(currentSchema.properties[key], completeSchema, localReferences);
    });
  }
  if(currentSchema.items) {
    denormalizeReferences(currentSchema.items, completeSchema, localReferences);
  }
}
